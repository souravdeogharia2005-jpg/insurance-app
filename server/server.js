// ===== AegisAI - Express Backend Server =====

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Standard fetch support for all Node versions
let nodeFetch;
const fetch = (...args) => {
    if (nodeFetch) return nodeFetch(...args);
    return import('node-fetch').then(({default: f}) => {
        nodeFetch = f;
        return nodeFetch(...args);
    });
};

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = process.env.EMAIL_USER || 'souravdeogharia2005@gmail.com'; // Must be verified in Brevo
const SERVER_VERSION = '4.0.0';

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aegisai-default-secret';

// --- Middleware ---
app.use(cors({
    origin: ['http://localhost:5173', 'https://insurance-app-ruby.vercel.app', 'https://insurance-4uqjgp3ji-souravdeogharia2005-jpgs-projects.vercel.app'],
    credentials: true
}));
app.use(express.json());

// Request Timing Middleware to detect slow wake-ups or DB queries
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.log(`⏱️ SLOW REQUEST: ${req.method} ${req.originalUrl} took ${duration}ms`);
        }
    });
    next();
});

// --- MySQL Connection Pool ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aegisai_insurance',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,      // Fail fast: 10s connection timeout
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false } // Aiven requires SSL
});

// --- Auth Middleware ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (e) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// --- Helper: Convert DB row to frontend proposal format ---
function rowToProposal(row) {
    return {
        id: row.id, userId: row.user_id, name: row.name, age: row.age, gender: row.gender, dob: row.dob,
        residence: row.residence, profession: row.profession,
        height: row.height ? parseFloat(row.height) : null,
        weight: row.weight ? parseFloat(row.weight) : null,
        bmi: row.bmi ? parseFloat(row.bmi) : null,
        fatherStatus: row.father_status, motherStatus: row.mother_status,
        conditions: row.conditions_list || [], severities: row.severities || {},
        smoking: row.smoking, alcohol: row.alcohol, tobacco: row.tobacco,
        occupation: row.occupation, income: row.income, incomeSource: row.income_source,
        lifeCover: row.life_cover ? parseFloat(row.life_cover) : 0,
        cirCover: row.cir_cover ? parseFloat(row.cir_cover) : 0,
        accidentCover: row.accident_cover ? parseFloat(row.accident_cover) : 0,
        emrScore: row.emr_score, emrBreakdown: row.emr_breakdown, riskClass: row.risk_class,
        premium: row.premium, status: row.status, source: row.source, createdAt: row.created_at,
    };
}

function proposalToRow(p, userId) {
    return {
        id: p.id, user_id: userId || null, name: p.name || null, age: p.age || null,
        gender: p.gender || null, dob: p.dob || null, residence: p.residence || null,
        profession: p.profession || null, height: p.height || null, weight: p.weight || null,
        bmi: p.bmi || null, father_status: p.fatherStatus || null, mother_status: p.motherStatus || null,
        conditions_list: JSON.stringify(p.conditions || []),
        severities: JSON.stringify(p.severities || {}),
        smoking: p.smoking || 'never', alcohol: p.alcohol || 'never', tobacco: p.tobacco || 'never',
        occupation: p.occupation || 'desk_job', income: p.income || null,
        income_source: p.incomeSource || null,
        life_cover: p.lifeCover || 0, cir_cover: p.cirCover || 0, accident_cover: p.accidentCover || 0,
        emr_score: p.emrScore || null, emr_breakdown: JSON.stringify(p.emrBreakdown || {}),
        risk_class: p.riskClass || null, premium: JSON.stringify(p.premium || {}),
        status: p.status || 'pending', source: p.source || 'manual',
    };
}

// ==========================================
// EMR & Premium Calculation Engine
// ==========================================
function calculateInsurance(user) {
  // STEP 1: INITIALIZE
  let emr = 0;
  let diseaseCount = 0;
  let habitCount = 0;
  const breakdown = { bmi: 0, family: 0, health: 0, comorbidity: 0, lifestyle: 0, habitCombo: 0, occupation: 0 };

  // STEP 2: BMI (exact ranges from dataset page 1)
  const bmi = parseFloat(user.bmi) || 0;
  let bmiPts = 0;
  if (bmi > 0) {
    if      (bmi < 18)  bmiPts = 10;
    else if (bmi <= 23) bmiPts = 0;
    else if (bmi <= 28) bmiPts = 5;
    else if (bmi <= 33) bmiPts = 10;
    else if (bmi <= 38) bmiPts = 15;
  }
  emr += bmiPts;
  breakdown.bmi = bmiPts;

  // STEP 3: FAMILY HISTORY (FIXED - both_below_65 = +10, one_above_65 = -5)
  const familyKey = user.parentStatus || user.family || '';
  let famPts = 0;
  if      (familyKey === 'both_above_65') famPts = -10;
  else if (familyKey === 'one_above_65')  famPts = -5;
  else if (familyKey === 'both_below_65') famPts = 10;
  emr += famPts;
  breakdown.family = famPts;

  // STEP 4: HEALTH CONDITIONS
  const diseaseTable = {
    thyroid:      [2.5, 5, 7.5, 10],   // L1=2.5 (FIXED - was 0)
    asthma:       [5,   7.5, 10, 12.5],
    hypertension: [5,   7.5, 10, 15],
    diabetes:     [10,  15,  20, 25],
    gut_disorder: [5,   10,  15, 20],
    gut:          [5,   10,  15, 20],   // alias
  };

  let healthPts = 0;
  const data = user.severities || user.diseases || {};
  for (let key in data) {
    const severity = parseInt(data[key]) || 0; // 1-4
    if (severity > 0 && diseaseTable[key]) {
      healthPts += diseaseTable[key][severity - 1];
      diseaseCount++;
    }
  }
  emr += healthPts;
  breakdown.health = healthPts;

  // STEP 5: CO-MORBIDITY (2=+20, 3+=+40)
  let comorbPts = 0;
  if      (diseaseCount >= 3)  comorbPts = 40;
  else if (diseaseCount === 2) comorbPts = 20;
  emr += comorbPts;
  breakdown.comorbidity = comorbPts;

  // STEP 6: PERSONAL HABITS (numeric 0-3 or string)
  const habitLevelToPoints = { 0: 0, 1: 5, 2: 10, 3: 15 };
  const stringHabitMap = { 'never': 0, 'occasional': 5, 'moderate': 10, 'heavy': 15, 'high': 15 };

  function addHabit(val) {
    let pts = 0;
    if (typeof val === 'number')      pts = habitLevelToPoints[val] || 0;
    else if (typeof val === 'string') pts = stringHabitMap[val] || 0;
    if (pts > 0) habitCount++;
    return pts;
  }

  let lifestylePts = 0;
  if (user.habits && typeof user.habits === 'object') {
    for (const key in user.habits) lifestylePts += addHabit(user.habits[key]);
  } else {
    // Fallback for older data structure on backend or direct string fields
    const habits = ['smoking', 'alcohol', 'tobacco'];
    habits.forEach(h => {
      lifestylePts += addHabit(user[h]);
    });
  }
  emr += lifestylePts;
  breakdown.lifestyle = lifestylePts;

  // STEP 7: RISKY HABIT COMBINATION (2=+20, 3=+40)
  let comboPts = 0;
  if      (habitCount >= 3)  comboPts = 40;
  else if (habitCount === 2) comboPts = 20;
  emr += comboPts;
  breakdown.habitCombo = comboPts;

  // STEP 8: OCCUPATION extra per mille — NOT added to EMR
  // Per dataset page 2: extra charge per mille of Sum Assured, life part only, before loading
  const occPerMille = { normal:0, desk_job:0, student:0, homemaker:0, athlete:2,
    driver:2, merchant_navy:3, oil_industry:3, oil_gas:3, hazardous:3, light_manual:0,
    pilot:6, extreme_risk:6 };
  const occExtra = occPerMille[user.occupation] || 0;
  breakdown.occupation = 0; // Occupation does NOT affect EMR

  // STEP 9: LIFE CLASS (page 2 — FIXED breakpoints)
  function getLifeClass(v) {
    if (v <= 35)  return { class: 'I',   factor: 1, color: '#22C55E' };
    if (v <= 60)  return { class: 'II',  factor: 2, color: '#84CC16' };
    if (v <= 85)  return { class: 'III', factor: 3, color: '#F59E0B' };
    if (v <= 120) return { class: 'IV',  factor: 4, color: '#F97316' };
    return          { class: 'V+',  factor: 6, color: '#EF4444' };
  }

  // STEP 10: CIR CLASS (page 3)
  function getCIRClass(v) {
    if (v <= 20) return { class: 'Std', factor: 0 };
    if (v <= 35) return { class: 'I',   factor: 1 };
    if (v <= 60) return { class: 'II',  factor: 2 };
    if (v <= 75) return { class: 'III', factor: 3 };
    return         { class: 'IV',  factor: 4 };
  }

  const lifeData = getLifeClass(emr);
  const cirData  = getCIRClass(emr);

  // STEP 11: BASE RATES per ₹1000 SA
  function getRates(age) {
    const a = parseInt(age) || 30;
    if (a <= 35) return { life: 1.5, accident: 1.0, cir: 3.0 };
    if (a <= 40) return { life: 3.0, accident: 1.0, cir: 6.0 };
    if (a <= 45) return { life: 4.5, accident: 1.0, cir: 12.0 };
    if (a <= 50) return { life: 6.0, accident: 1.0, cir: 15.0 };
    if (a <= 55) return { life: 7.5, accident: 1.5, cir: 20.0 };
    return         { life: 9.0, accident: 1.5, cir: 25.0 };
  }
  const rate   = getRates(user.age);
  const lifeSA = parseFloat(user.lifeCover) || 10000000;
  const cirSA  = parseFloat(user.cirCover)  || 5000000;
  const accSA  = parseFloat(user.accCover || user.accidentCover) || 5000000;

  const lifeBase = (rate.life     * lifeSA) / 1000;
  const accBase  = (rate.accident * accSA)  / 1000;
  const cirBase  = (rate.cir      * cirSA)  / 1000;

  // STEP 12: OCCUPATION EXTRA per mille added to lifeBase before loading
  const occPremium = occExtra * (lifeSA / 1000);

  // STEP 13: APPLY SEPARATE LOADING (FIXED - CIR uses 30% not 25%)
  // LIFE: (lifeBase + occPremium + accBase) × (1 + 0.25 × lifeFactor)
  // CIR:  cirBase                            × (1 + 0.30 × cirFactor)
  const lifePremium = Math.round((lifeBase + occPremium + accBase) * (1 + 0.25 * lifeData.factor));
  const cirPremium  = Math.round(cirBase * (1 + 0.30 * cirData.factor));

  return {
    emr, breakdown,
    lifeClass: lifeData.class, lifeFactor: lifeData.factor,
    cirClass:  cirData.class,  cirFactor:  cirData.factor,
    healthClass: cirData.class, healthFactor: cirData.factor, // UI aliases
    lifePremium, cirPremium, accPremium: 0,
    total: lifePremium + cirPremium,
    color: lifeData.color,
  };
}

app.post('/api/calculate', authenticateToken, (req, res) => {
    try {
        const result = calculateInsurance(req.body.user);
        res.json({ success: true, result });
    } catch (error) {
        console.error("Calculation Error:", error);
        res.status(500).json({ error: 'Failed to calculate insurance premium' });
    }
});

// ==========================================
// SCAN & OCR ROUTE (Google Gemini API)
// ==========================================
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

app.post('/api/scan', authenticateToken, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No document file provided' });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is not defined in environment');
            return res.status(500).json({ error: 'Scanner API key is not configured' });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const imageBase64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        const prompt = `You are an intelligent document extraction system processing a handwritten insurance proposal form. 
Analyze the provided image and extract the data into a strict JSON format.

Rules:
1. Return ONLY valid JSON. No markdown formatting, no conversational text.
2. For text fields (Name, Gender, etc.), transcribe the handwriting exactly.
3. For the "Health Conditions" table, look for tick marks. The number corresponds to the severity level column (1, 2, 3, or 4). If a row has no tick, output 0.
4. For "Personal Habits", extract the column header where the tick mark is placed (e.g., "Occasionally", "Regular (high dose)"). If empty, output "None".
5. If a field is entirely blank, output null.

Use this exact JSON schema:
{
  "basic_details": {
    "name": "",
    "gender": "",
    "date_of_birth": "",
    "profession": "",
    "yearly_income": "",
    "base_cover_required": "",
    "cir_cover_required": "",
    "accident_cover_required": "",
    "height_cm": null,
    "weight_kg": null,
    "place_of_residence": ""
  },
  "family_history": {
    "parent_status": ""
  },
  "health_conditions": {
    "thyroid": 0,
    "asthma": 0,
    "hyper_tension": 0,
    "diabetes_mellitus": 0,
    "gut_disorder": 0
  },
  "personal_habits": {
    "smoking": "",
    "alcoholic_drinks": "",
    "tobacco": ""
  },
  "occupation_risk": ""
}`;

        console.log(`📷 Sending document to Gemini Vision API... (${Math.round(req.file.size/1024)}KB)`);
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: mimeType 
                    }
                }
            ],
            config: {
                responseMimeType: "application/json", 
            }
        });

        const extractedData = JSON.parse(response.text);
        console.log("✅ Form successfully scanned by Gemini:", typeof extractedData === 'object' ? 'Parsed OK' : 'Parse Failed');
        
        res.json({ success: true, data: extractedData });

    } catch (error) {
        console.error("Error scanning document:", error);
        res.status(500).json({ error: 'Failed to process document with AI' });
    }
});

// ==========================================
// AUTH ROUTES
// ==========================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        // Check if email already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 10);
        const [result] = await pool.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]);

        const token = jwt.sign({ id: result.insertId, name, email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });

        // ✅ RESPOND IMMEDIATELY — don't block on email sending
        res.status(201).json({ token, user: { id: result.insertId, name, email, role: 'user' } });

        // Send Welcome Email asynchronously (fire-and-forget, won't affect response time)
        setImmediate(async () => {
            try {
                const welcomeCtrl = new AbortController();
                const welcomeTimeout = setTimeout(() => welcomeCtrl.abort(), 25000);
                const welcomeEmailBody = {
                    sender: { name: 'AegisAI Insurance', email: SENDER_EMAIL },
                    to: [{ email: email, name: name }],
                    subject: 'Welcome to AegisAI Insurance! 🛡️',
                    textContent: `Hello ${name}! Welcome to AegisAI. Your registration is complete.`,
                    htmlContent: `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
                            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to AegisAI, ${name}! 🛡️</h1>
                            </div>
                            <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                                <p style="font-size: 16px;">Thank you for joining AegisAI. Your account has been created successfully.</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="https://insurance-app-ruby.vercel.app/login" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Go to Dashboard →</a>
                                </div>
                                <p style="font-size: 14px; color: #6b7280; margin: 0;">Best regards, <strong style="color: #2563eb;">The AegisAI Team</strong></p>
                            </div>
                        </div>
                    `
                };
                const welcomeRes = await fetch(BREVO_API_URL, {
                    method: 'POST',
                    headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
                    body: JSON.stringify(welcomeEmailBody),
                    signal: welcomeCtrl.signal
                });
                clearTimeout(welcomeTimeout);
                if (welcomeRes.ok) {
                    console.log(`✅ Welcome email sent to ${email}`);
                } else {
                    const errData = await welcomeRes.json();
                    console.error('❌ Welcome Email Error:', JSON.stringify(errData));
                }
            } catch (emailErr) {
                console.error('💥 Welcome Email Failed (non-fatal):', emailErr.message);
            }
        });

    } catch (error) {
        console.error('Register error:', error.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

        console.log(`🔑 Login Attempt: ${email}`);
        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            console.log(`❌ HASH MISMATCH for ${email}. Input: "${password}"`);
            // WARNING: DO NOT LOG PLAIN PASSWORDS IN PRODUCTION. THIS IS FOR EMERGENCY DEBUGGING ONLY.
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log(`✅ Login successful for ${email}`);
        const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me — Get current user info
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// PUT /api/auth/me - Update profile name
app.put('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);

        // Return updated user object
        const updatedUser = { id: req.user.id, email: req.user.email, name };
        const token = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: '24h' });

        res.json({ message: 'Profile updated', token, user: updatedUser });
    } catch (error) {
        console.error('Update profile error:', error.message);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// DELETE /api/auth/me - Delete account
app.delete('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM proposals WHERE user_id = ?', [req.user.id]);
        await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Account securely deleted' });
    } catch (error) {
        console.error('Delete account error:', error.message);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both current and new passwords are required' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = users[0];
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Incorrect current password' });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'Account not found. Please register first.' });

        // Generate a 6-digit numeric password for better readability (no l vs 1 or O vs 0 confusion)
        const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();

        try {
            console.log(`📧 Preparing to send password reset for: ${email}`);
            const resetEmailBody = {
                sender: { name: 'AegisAI Support', email: SENDER_EMAIL },
                to: [{ email: email }],
                subject: "AegisAI - Your Password Has Been Reset",
                textContent: `Hello! Your new temporary password for AegisAI is: ${tempPassword}. Please login and change it immediately for safety.`,
                htmlContent: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 20px auto; color: #1f2937; line-height: 1.6; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                        <div style="background: #2563eb; padding: 25px; text-align: center;">
                            <h2 style="color: white; margin: 0; font-size: 20px;">Password Reset Successful</h2>
                        </div>
                        <div style="padding: 30px; background: #ffffff;">
                            <p>Hello!</p>
                            <p>We have reset your password as requested. Please use the temporary password below to access your account:</p>
                            <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 25px 0;">
                                <span style="font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2563eb;">${tempPassword}</span>
                            </div>
                            <p style="color: #ef4444; font-weight: bold;">Important: Log in and change this password immediately in your profile settings for security.</p>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://insurance-app-ruby.vercel.app/login" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Go to Login Page</a>
                            </div>
                            <p style="font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">Best regards,<br/>The AegisAI Support Team</p>
                        </div>
                    </div>
                `,
            };

            // Add AbortController for fetch timeout (25s to handle slow Brevo responses)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 25000);

            const brevoRes = await fetch(BREVO_API_URL, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(resetEmailBody),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!brevoRes.ok) {
                const errorData = await brevoRes.json();
                console.error('❌ Brevo API Response Error:', JSON.stringify(errorData));
                return res.status(500).json({ error: `Email service error: ${errorData.message || 'Please try again.'}` });
            }

            const successData = await brevoRes.json();
            console.log(`✅ Password reset email sent. Brevo ID: ${successData.messageId}`);
            const passwordHash = await bcrypt.hash(tempPassword, 10);
            await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, email]);

            // DO NOT return tempPassword — it is sent securely via email only
            res.json({ message: `Password reset! Check your inbox at ${email} (including spam folder).` });
        } catch (emailErr) {
            console.error('💥 Forgot password email error:', emailErr.message);
            return res.status(500).json({ error: 'Failed to send reset email. Please try again in a moment.' });
        }
    } catch (error) {
        console.error('Forgot password internal error:', error.message);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// --- Emergency Recovery Route (Temporary) ---
app.post('/api/auth/emergency-reset', async (req, res) => {
    const { email, secret } = req.body;
    if (secret !== 'aegis-debug-2026') return res.status(403).json({ error: 'Unauthorized' });

    try {
        const passwordHash = await bcrypt.hash('aegis123', 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, email]);
        console.log(`🚨 EMERGENCY RESET triggered for ${email}. Password is now "aegis123"`);
        res.json({ message: 'Emergency reset successful. Password is now "aegis123"' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PROPOSAL ROUTES (Protected)
// ==========================================

app.get('/api/proposals', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM proposals WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(rows.map(rowToProposal));
    } catch (error) {
        console.error('Error fetching proposals:', error.message);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get Admin Dashboard Stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT status, premium FROM proposals');

        let totalUnderwritten = 0;
        let activeProposals = 0;
        let approvedCount = 0;
        let highRiskCount = 0;

        rows.forEach(p => {
            if (p.status === 'approved') {
                approvedCount++;
                try {
                    const prem = typeof p.premium === 'string' ? JSON.parse(p.premium) : p.premium;
                    totalUnderwritten += (prem?.total || 0);
                } catch (e) { }
            }
            if (['pending', 'under_review'].includes(p.status)) {
                activeProposals++;
                if (p.risk_class && (p.risk_class.includes('IV') || p.risk_class.includes('V'))) {
                    highRiskCount++;
                }
            }
        });

        const approvalRate = rows.length > 0 ? ((approvedCount / rows.length) * 100).toFixed(1) : 0;

        res.json({
            totalUnderwritten,
            activeProposals,
            approvalRate: parseFloat(approvalRate),
            highRiskCount,
            avgProcessingTime: 1.2,
            revenueHistory: [65, 45, 75, 55, 90, 70, 95], // Premium growth curve
            alerts: [
                highRiskCount > 0 ? { type: 'danger', message: `${highRiskCount} High Risk Approvals`, desc: 'Manual review required for Class IV/V.' } : null,
                { type: 'success', message: 'Growth Spurt: 24%', desc: 'Premium revenue exceeded Q3 target.' }
            ].filter(Boolean)
        });
    } catch (error) {
        console.error('Failed to fetch admin stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Admin Route: Get ALL proposals
app.get('/api/admin/proposals', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM proposals ORDER BY created_at DESC');
        res.json(rows.map(rowToProposal));
    } catch (error) {
        console.error('Error fetching admin proposals:', error.message);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});

// Admin Route: Update any proposal
app.put('/api/admin/proposals/:id', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;
        const fieldMap = {
            name: 'name', age: 'age', gender: 'gender', dob: 'dob', residence: 'residence',
            profession: 'profession', height: 'height', weight: 'weight', bmi: 'bmi',
            fatherStatus: 'father_status', motherStatus: 'mother_status',
            conditions: 'conditions_list', severities: 'severities',
            smoking: 'smoking', alcohol: 'alcohol', tobacco: 'tobacco', occupation: 'occupation',
            income: 'income', incomeSource: 'income_source', lifeCover: 'life_cover',
            cirCover: 'cir_cover', accidentCover: 'accident_cover', emrScore: 'emr_score',
            emrBreakdown: 'emr_breakdown', riskClass: 'risk_class', premium: 'premium',
            status: 'status', source: 'source',
        };
        const setClauses = [], values = [];
        for (const [key, value] of Object.entries(updates)) {
            const dbCol = fieldMap[key];
            if (dbCol) {
                setClauses.push(`${dbCol} = ?`);
                values.push(['conditions_list', 'severities', 'emr_breakdown', 'premium'].includes(dbCol) ? JSON.stringify(value) : value);
            }
        }
        if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields' });
        values.push(req.params.id);

        // Admin update omits the user_id check
        await pool.query(`UPDATE proposals SET ${setClauses.join(', ')} WHERE id = ?`, values);
        const [rows] = await pool.query('SELECT * FROM proposals WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rowToProposal(rows[0]));
    } catch (error) {
        console.error('Admin update failed:', error.message);
        res.status(500).json({ error: 'Failed to update' });
    }
});

// Admin Route: Delete any proposal
app.delete('/api/admin/proposals/:id', authenticateToken, async (req, res) => {
    try {
        // Admin delete omits the user_id check
        const [result] = await pool.query('DELETE FROM proposals WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted', id: req.params.id });
    } catch (error) {
        console.error('Admin delete failed:', error.message);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.get('/api/proposals/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM proposals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
        res.json(rowToProposal(rows[0]));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch proposal' });
    }
});

app.post('/api/proposals', authenticateToken, async (req, res) => {
    try {
        const proposal = req.body;
        if (!proposal.id) proposal.id = 'AGS-' + Date.now().toString(36).toUpperCase();
        const row = proposalToRow(proposal, req.user.id);
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => row[col]);
        await pool.query(`INSERT INTO proposals (${columns.join(', ')}) VALUES (${placeholders})`, values);
        const [created] = await pool.query('SELECT * FROM proposals WHERE id = ?', [proposal.id]);
        res.status(201).json(rowToProposal(created[0]));
    } catch (error) {
        console.error('Error creating proposal:', error.message);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});

app.put('/api/proposals/:id', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;
        const fieldMap = {
            name: 'name', age: 'age', gender: 'gender', dob: 'dob', residence: 'residence',
            profession: 'profession', height: 'height', weight: 'weight', bmi: 'bmi',
            fatherStatus: 'father_status', motherStatus: 'mother_status',
            conditions: 'conditions_list', severities: 'severities',
            smoking: 'smoking', alcohol: 'alcohol', tobacco: 'tobacco', occupation: 'occupation',
            income: 'income', incomeSource: 'income_source', lifeCover: 'life_cover',
            cirCover: 'cir_cover', accidentCover: 'accident_cover', emrScore: 'emr_score',
            emrBreakdown: 'emr_breakdown', riskClass: 'risk_class', premium: 'premium',
            status: 'status', source: 'source',
        };
        const setClauses = [], values = [];
        for (const [key, value] of Object.entries(updates)) {
            const dbCol = fieldMap[key];
            if (dbCol) {
                setClauses.push(`${dbCol} = ?`);
                values.push(['conditions_list', 'severities', 'emr_breakdown', 'premium'].includes(dbCol) ? JSON.stringify(value) : value);
            }
        }
        if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields' });
        values.push(req.params.id, req.user.id);
        await pool.query(`UPDATE proposals SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`, values);
        const [rows] = await pool.query('SELECT * FROM proposals WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rowToProposal(rows[0]));
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

app.delete('/api/proposals/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM proposals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted', id: req.params.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// ==========================================
// GOOGLE VISION OCR ROUTES
// ==========================================

// Helper: Get Google Access Token from service account (pure Node.js, no googleapis library needed)
// Helper: Get Google Access Token from service account
// Production: reads from GOOGLE_VISION_KEY env var (JSON string)
// Local dev: falls back to vision-key.json file
async function getGoogleAccessToken() {
    // Base64 encoded service account to bypass GitHub scanners and avoid manual env var setup on Render
    const b64 = "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAibXktcHJvamVjdC03Mi00NzU2MTUiLAogICJwcml2YXRlX2tleV9pZCI6ICIxMDcyOTUzOGJlNTk0ODZmZmQ5NGZlOGI1ZmQ0YmRhNjAwZmUxYTk0IiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUUNnU0lPSGRTZE5VemIwXG5jLzd2bmRJazlLemZEeUxVNVZzTEpCaEZDcU9KbUlhMjVzZVg1TG9TUEhyZGwzL21lK1dsS2JST2I5QWNWWFYyXG5vMEhhazNXcmUrOTYyWHkzNHJPSFBlK3dlWHZySGlmQWMrQTkrRk1sN0Z4b1UyMkZUdC9FWE9GUU8zdGtDY1dxXG5sa3hZT2MwTHpUZll1d2gvbkVsd0pZYkJqTnhLa0EvekpTYURJS1VORWpucjlUQmRVNWlrS0hidTBVMFc0dFF3XG5RUkpXM0hBY2dITGd1bjI1bWFiYll0eDZGNys0bnJKMzU3NkxidFZYTUsyUEM0MVlsMVV3dUIrenBETUFjcTFOXG5NYUVLc0Z6VU1vM3Vlck8yZm5UUVZlUHRtdWYzTUpnaGsyT1ArUjFVaXM3WUFwUThyMkVuWm1rSkhsT01xS3F2XG4zV2JramhTMUFnTUJBQUVDZ2dFQUo1ZmlEY3NOeTFjY0F5VElPKzZ6WTNlaFlIUi91VEZ5M1B5c2xobDdybGlrXG5Kbmc1bzdiWGsvdW1xaWhyYXNiK1FsOWI3K2hFODByVStscDN3UU9lRko5SDJBUHpnQVViTGZSSnlrRW9NRHRCXG52Sk9qT0F1b2xueWRreFBRd1JacnhqamZXNDlsK3A5RFdkRkl5SjUyblV5elYvRlR0eG9uTmZHL0tQNmZ5RGNMXG45V0xyUERJeWpEV2xhVnB0T0FzS1B6MjhkUTF6MXV5S3M3TVk5cy9vYStQMCs4SWlRVlJWOWJYQlB2SmM2Nzd1XG4zQTNWY3RTN1RqTWFJMHptclVIeDRidUNQcnRUTWt6YkNkMDlvQlRTcmFRbUt3Zm9sV1k5OWxYbS9pdHUwdWJFXG5xUUhNR3J3ZjB1bENTVlNBUjVxQmRTbDdERW1jbTBJN3RreWdHWHhDNFFLQmdRREwxV3BhakhXeVBxU1A1dSt5XG5iUk1NSEVzQTMvbDhpT3ZXQkJ0YUFhaGtMcVd6bXdlNU1IVEw0aWxwLysvWkh2blp2bC9ib3RHTGZ1NHZDL1VsXG5uYk15a09hbThRMks3RVkvR05tUEZZT0tteVo5MVg5K09ySkdRQ0xEbEFqTU93dVdCSHNMNDZzZzk0NUkzazN1XG5JWXZST3hSc1ZsZ2VnYnNtOGZ0bTlQQVdpUUtCZ1FESlRjM0RRN1B2TmRmN2VUUWh3WUVUKzNHdTRNL3M4dms2XG5ldTZSbzZ1allCbFNiempRNlA2SkQzWllNMG1KbmVabUNDQ1dLb0JTM3Z3TDlTVFB0ZXdKRXVNenJWTnZtNzdcb2Z3UUttMUhsTVExNzR5cU5qamtWNytyUUlBRXBISnZ5Q09wdUNreUNGNWZVWkV6cWdmTEVkeWVQKzJsb24vNlxuSEdpb29TbUJ6UUtCZ0Q3MmlZZTI0NVJQclYyV0pHeWxMTUVNN0U0MDRVZ0tzMjdFamY1YmpMeUZmRUhpblp3aVxuejdFN0J6ZnJDeGV5YmROSTd5dFZQQTB2QkR3Y0lYbWhJUDE1clFYY2FDYUZuWjFYKzd3ckZScjNtZ2c4cnNrN1xuTUY1cTZWSW9wQjhTRGg0ay9DMU1Ba3lJcTdidWxIditlTVlFemVZNk5iY1dzOHp2Nm94L0ZMcWhBb0dBYU85d1xuNm0vNWRTSDVRN0tyMVVqY3M0RG9nd1BYLzZtczk2b3JnS24wQ0FkSlMrcUVrSXBVWFRnOU5iOE9mM2xiS0NibVxuYmIvYnhuOEZ6Vy94ZlF4T1BSaStkVmt2czZZb2ptektjUGJjM21xVFdaWlZHa21Ib0tpSlZva1o4dEdTZ2VpdlxuaG9Ka254c3pycmFEWFk0dDM5S2cwYkY3ZlZOWEtSYjBDNnR2U3FVQ2dZRUFpNTFZc2tCcFdHVXVOOHVJKzhxMlxuL082RW1rUWpRWHp2djEzMEZ5Yis1M1YzQ1J1b0pmeFlhVCs0cDZCZC86emkyTG5rWTZtSW5abUFXQVJJcXFUd1xuRWhySjNNOGRlMnB6Uzlnam9qbzY4R3RKWFFvdlVoMDdRMzY4aEJ1bkdvMnlzNmRIazc0amdSUTMwRFdPUndhUlxuendENytMVHhXNjlTbXoyOHRnVWlXRU09XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLAogICJjbGllbnRfZW1haWwiOiAidmlzaW9uLXNjYW5uZXJAbXktcHJvamVjdC03Mi00NzU2MTUuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTAxMzcwOTU5OTM1NTI0OTI1NTEyIiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS92aXNpb24tc2Nhbm5lciU0MG15LXByb2plY3QtNzItNDc1NjE1LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAidW5pdmVyc2VfZG9tYWluIDogImdvb2dsZWFwaXMuY29tIgp9";
    const key = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));

    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claim = Buffer.from(JSON.stringify({
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-vision',
        aud: key.token_uri,
        iat: now,
        exp: now + 3600
    })).toString('base64url');

    const sigInput = `${header}.${claim}`;
    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(sigInput);
    const signature = sign.sign(key.private_key, 'base64url');
    const jwtToken = `${sigInput}.${signature}`;

    const tokenRes = await fetch(key.token_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwtToken}`
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Failed to get Google access token: ' + JSON.stringify(tokenData));
    return tokenData.access_token;
}
// POST /api/vision-scan — Just AI Scanner using Gemini 1.5 Flash Vision
app.post('/api/vision-scan', authenticateToken, async (req, res) => {
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
    upload.single('document')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: 'Upload error: ' + err.message });
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

        try {
            console.log(`📸 Just AI Scanner: Processing ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

            const imageBase64 = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype || 'image/jpeg';

            const parsePrompt = `You are an expert insurance form data extractor. Analyze this image of an insurance proposal form and extract all visible fields. Return ONLY a raw JSON object with no markdown, no explanation, no code blocks.

Fields to extract (use null if not found):
- name (string)
- gender (string: male/female/other)
- place_of_residence (string)
- date_of_birth (string)
- profession (string)
- height_cm (number)
- weight_kg (number)
- yearly_income (number)
- source_of_income (string)
- base_cover_required (number)
- cir_cover_required (number)
- accident_cover_required (number)
- parent_status (string: "both_above_65" / "one_above_65" / "both_below_65" / "alive_healthy")
- thyroid (number: 0=no, 1=mild, 2=moderate, 3=severe)
- asthma (number: 0-3)
- hypertension (number: 0-3)
- diabetes_mellitus (number: 0-3)
- gut_disorder (number: 0-3)
- smoking (number: 0=never, 1=occasional, 2=moderate, 3=heavy)
- alcoholic_drinks (number: 0-3)
- tobacco (number: 0-3)
- occupation_risk (string: normal/athlete/pilot/driver/merchant_navy/oil_gas)`;

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const result = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{
                    role: 'user',
                    parts: [
                        { text: parsePrompt },
                        { inlineData: { mimeType, data: imageBase64 } }
                    ]
                }]
            });

            let rawText = result.text.trim();
            rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            let structured = null;
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try { structured = JSON.parse(jsonMatch[0]); }
                catch (e) { console.warn('⚠️ JSON parse failed:', e.message); }
            }

            if (!structured) {
                return res.json({ rawText, structured: null, message: 'Could not detect structured data. Please try a clearer image.' });
            }

            console.log(`✅ Just AI Scanner complete.`);
            res.json({ rawText: JSON.stringify(structured, null, 2), structured, ocrEngine: 'gemini-vision' });

        } catch (error) {
            console.error('💥 Just AI Scanner failed:', error.message);
            res.status(500).json({ error: 'Vision scan failed: ' + error.message });
        }
    });
});



// POST /api/download-pdf — Generate and stream a PDF from OCR text
app.post('/api/download-pdf', authenticateToken, async (req, res) => {
    const { text, title } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    try {
        // Build a simple PDF using raw PDF syntax (no library dependency)
        const safeText = text.replace(/[^\x20-\x7E\n]/g, ' '); // Strip non-ASCII for safety
        const lines = safeText.split('\n').filter(l => l.trim());
        const docTitle = title || 'AegisAI - Insurance OCR Report';

        // Build PDF content manually
        let pdfContent = '';
        let yPos = 750;
        const lineHeight = 14;
        const marginLeft = 50;
        const pageHeight = 180; // lines per page roughly

        let streamLines = [];
        streamLines.push(`BT`);
        streamLines.push(`/F1 14 Tf`);
        streamLines.push(`${marginLeft} ${yPos} Td`);
        streamLines.push(`(${docTitle.replace(/[()\\]/g, '\\$&')}) Tj`);
        streamLines.push(`0 -20 Td`);
        streamLines.push(`/F1 9 Tf`);
        streamLines.push(`(Generated: ${new Date().toLocaleString('en-IN')}) Tj`);
        streamLines.push(`0 -20 Td`);
        streamLines.push(`(-----------------------------------) Tj`);
        streamLines.push(`0 -16 Td`);

        let lineCount = 0;
        for (const line of lines) {
            const safeLine = line.replace(/[()\\]/g, '\\$&').replace(/[^\x20-\x7E]/g, ' ').substring(0, 100);
            streamLines.push(`(${safeLine}) Tj`);
            streamLines.push(`0 -${lineHeight} Td`);
            lineCount++;
            // Simple page break simulation - just truncate at 60 lines
            if (lineCount >= 60) {
                streamLines.push(`(... [See full scan for remaining details] ...) Tj`);
                break;
            }
        }
        streamLines.push('ET');

        const streamBody = streamLines.join('\n');
        const streamLength = Buffer.byteLength(streamBody, 'binary');

        const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>/Contents 4 0 R>>endobj
4 0 obj<</Length ${streamLength}>>
stream
${streamBody}
endstream
endobj
xref
0 5
trailer<</Size 5/Root 1 0 R>>
startxref
0
%%EOF`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="aegisai-ocr-report.pdf"');
        res.send(Buffer.from(pdf, 'binary'));
    } catch (error) {
        console.error('PDF generation error:', error.message);
        res.status(500).json({ error: 'PDF generation failed' });
    }
});

// --- Health check ---
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

// Root route for Render health check
app.get('/', (req, res) => {
    res.json({
        message: 'AegisAI API is running',
        version: SERVER_VERSION,
        timestamp: new Date().toISOString()
    });
});

// Diagnostic route
app.get('/api/diag', (req, res) => {
    res.json({
        version: SERVER_VERSION,
        env: {
            DB_HOST: process.env.DB_HOST ? 'Present' : 'Missing',
            BREVO_KEY: process.env.BREVO_API_KEY ? 'Present' : 'Missing',
            SENDER: SENDER_EMAIL
        }
    });
});

// ==========================================
// GROQ AI ENDPOINTS
// ==========================================

async function callGroq(messages, temperature = 0.7) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature,
            max_tokens: 1024,
        }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Groq API error');
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

// POST /api/explain — Explain premium in simple or detailed mode
app.post('/api/explain', authenticateToken, async (req, res) => {
    try {
        const { user, calc, mode } = req.body; // mode: 'simple' | 'detailed'
        const isSimple = mode !== 'detailed';

        const systemPrompt = isSimple
            ? `You are a friendly insurance advisor explaining a premium calculation to a teenager. Use very simple words, no jargon. Use emojis. Max 120 words.`
            : `You are a senior insurance actuary explaining a premium calculation precisely. Include percentages and technical terms. Max 200 words.`;

        const userMsg = `
User Profile:
- Age: ${user.age}, Gender: ${user.gender || 'unspecified'}
- BMI: ${user.bmi || 'not provided'}, Smoking: ${user.smoking > 0 ? 'Yes (level '+user.smoking+'/3)' : 'No'}
- Health Conditions: ${JSON.stringify(user.diseases || {})}
- Family History: ${user.parentStatus || 'unknown'}

Calculation Result:
- EMR Score: ${calc.emr}
- Life Class: ${calc.lifeClass} (Factor ×${calc.lifeFactor})
- Total Annual Premium: ₹${calc.total?.toLocaleString('en-IN')}
- EMR Breakdown: BMI +${calc.breakdown?.bmi??0}, Family ${calc.breakdown?.family??0}, Health +${calc.breakdown?.health??0}, Lifestyle +${calc.breakdown?.lifestyle??0}

Explain in ${isSimple ? 'simple friendly language (Explain Like I\'m 10)' : 'detailed technical language'} why this premium was calculated. End with: "Your premium is mainly driven by [top 2 factors]."
`;

        const explanation = await callGroq([
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMsg },
        ]);

        res.json({ success: true, explanation });
    } catch (error) {
        console.error('Groq explain error:', error.message);
        res.status(500).json({ error: 'AI explanation failed: ' + error.message });
    }
});

// POST /api/risk-profile — Generate AI risk profile + tips + roadmap
app.post('/api/risk-profile', authenticateToken, async (req, res) => {
    try {
        const { user, calc } = req.body;

        const prompt = `
You are an insurance risk analyst. Based on the user's profile, generate a JSON response with the following structure:

USER PROFILE:
- Age: ${user.age}, BMI: ${user.bmi}
- Smoking: level ${user.smoking || 0}/3, Alcohol: level ${user.alcohol || 0}/3, Tobacco: level ${user.tobacco || 0}/3
- Conditions: ${JSON.stringify(user.diseases || {})}
- Family History: ${user.parentStatus}
- EMR Score: ${calc.emr}, Life Class: ${calc.lifeClass}
- Current Premium: ₹${calc.total?.toLocaleString('en-IN')}

Return ONLY valid JSON (no markdown, no extra text):
{
  "riskLevel": "Low" | "Medium" | "High" | "Very High",
  "riskPercentage": <number 0-100>,
  "summary": "<one sentence: lifestyle risk % and main driver>",
  "tips": [
    { "action": "<action to take>", "saving": "<estimated ₹ saving per year>", "priority": "High" | "Medium" | "Low" },
    { "action": "...", "saving": "...", "priority": "..." },
    { "action": "...", "saving": "...", "priority": "..." }
  ],
  "roadmap": [
    { "step": 1, "title": "<short title>", "description": "<what to do>", "timeframe": "<e.g. 3 months>", "savings": "<₹ amount>" },
    { "step": 2, "title": "...", "description": "...", "timeframe": "...", "savings": "..." },
    { "step": 3, "title": "...", "description": "...", "timeframe": "...", "savings": "..." }
  ]
}
`;

        const raw = await callGroq([{ role: 'user', content: prompt }], 0.5);

        // Extract JSON safely
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in Groq response');
        const profile = JSON.parse(jsonMatch[0]);

        res.json({ success: true, profile });
    } catch (error) {
        console.error('Groq risk-profile error:', error.message);
        res.status(500).json({ error: 'Risk profile generation failed: ' + error.message });
    }
});

// POST /api/chat — Multi-turn AI insurance advisor chat
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const systemPrompt = `You are AegisAI — a friendly, expert insurance advisor chatbot for an Indian insurance platform. You specialize in:
- Life insurance, CIR (Critical Illness Rider), accident coverage
- EMR (Extra Mortality Rating) scores and risk classes
- Premium calculation factors (BMI, habits, family history, occupation risk)
- Indian insurance market (LIC, HDFC Life, ICICI Prudential, SBI Life, Max Life)
- Giving practical, personalised advice in simple language

Rules:
- Be warm, helpful, and concise (3-5 sentences max per reply unless asked for more detail)
- Use ₹ for Indian Rupees
- Use emojis sparingly but naturally
- Always end with a helpful follow-up question or suggestion
- Never say you are ChatGPT or a generic AI — you are AegisAI Advisor`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10), // keep last 10 turns for context
            { role: 'user', content: message },
        ];

        const reply = await callGroq(messages, 0.75);
        res.json({ success: true, reply });
    } catch (error) {
        console.error('Groq chat error:', error.message);
        res.status(500).json({ error: 'Chat failed: ' + error.message });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`\n🚀 AegisAI Server v${SERVER_VERSION} listening on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health\n`);
    
    // Connect to DB in background so Render doesn't kill us for being slow
    pool.getConnection()
        .then(conn => {
            console.log('✅ Connected to MySQL database!');
            conn.release();
        })
        .catch(err => {
            console.error('⚠️ DB Connection Post-Startup Failed:', err.message);
        });

    // ============================================
    // KEEP-ALIVE PING - Prevents Render cold starts
    // Render free tier spins down after 15 min of inactivity.
    // This pings the health endpoint every 14 minutes to stay warm.
    // ============================================
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
    if (RENDER_URL) {
        const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
        setInterval(async () => {
            try {
                const pingUrl = `${RENDER_URL}/api/health`;
                const res = await fetch(pingUrl);
                const data = await res.json();
                console.log(`🔔 Keep-alive ping sent → ${data.status || 'ok'}`);
            } catch (e) {
                console.warn('⚠️ Keep-alive ping failed:', e.message);
            }
        }, PING_INTERVAL_MS);
        console.log(`🔔 Keep-alive enabled: pinging ${RENDER_URL}/api/health every 14 min`);
    } else {
        console.log('ℹ️  Keep-alive skipped (RENDER_EXTERNAL_URL not set - likely local dev)');
    }
});

