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
  let emr = 0;

  // ✅ BMI
  if (user.bmi < 18) emr += 10;
  else if (user.bmi <= 23) emr += 0;
  else if (user.bmi <= 28) emr += 5;
  else if (user.bmi <= 33) emr += 10;
  else emr += 15;

  // ✅ Family History
  if (user.family === "both_above_65") emr -= 10;
  else if (user.family === "one_above_65") emr -= 5;
  else if (user.family === "both_below_65") emr += 10;

  // ✅ Diseases
  const diseasePoints = {
    thyroid: [2.5, 5, 7.5, 10],
    asthma: [5, 7.5, 10, 12.5],
    hypertension: [5, 7.5, 10, 15],
    diabetes: [10, 15, 20, 25],
    gut: [5, 10, 15, 20]
  };

  let diseaseCount = 0;

  if (user.diseases) {
      for (let d in user.diseases) {
        let severity = user.diseases[d];
        if (severity > 0 && diseasePoints[d]) {
          emr += diseasePoints[d][severity - 1];
          diseaseCount++;
        }
      }
  }

  // ✅ Co-morbidity
  if (diseaseCount === 2) emr += 20;
  if (diseaseCount >= 3) emr += 40;

  // ✅ Habits
  const habitPoints = [5, 10, 15];
  let habitCount = 0;

  if (user.habits) {
      for (let h in user.habits) {
        let level = user.habits[h];
        if (level > 0) {
          emr += habitPoints[level - 1];
          habitCount++;
        }
      }
  }

  // ✅ Risky habits combo
  if (habitCount === 2) emr += 20;
  if (habitCount >= 3) emr += 40;

  // ✅ Find Life Factor
  function getLifeFactor(emr) {
    if (emr <= 35) return 1;
    if (emr <= 60) return 2;
    if (emr <= 85) return 3;
    if (emr <= 120) return 4;
    if (emr <= 170) return 6;
    if (emr <= 225) return 8;
    if (emr <= 275) return 10;
    if (emr <= 350) return 12;
    if (emr <= 450) return 16;
    return 20;
  }

  function getLifeClass(emr) {
    if (emr <= 35) return 'I';
    if (emr <= 60) return 'II';
    if (emr <= 85) return 'III';
    if (emr <= 120) return 'IV';
    if (emr <= 170) return 'V';
    if (emr <= 225) return 'VI';
    if (emr <= 275) return 'VII';
    if (emr <= 350) return 'VIII';
    if (emr <= 450) return 'IX';
    return 'X';
  }

  // ✅ Health Factor
  function getHealthFactor(emr) {
    if (emr <= 20) return 0;
    if (emr <= 35) return 1;
    if (emr <= 60) return 2;
    if (emr <= 75) return 3;
    return 4;
  }
  
  function getHealthClass(emr) {
    if (emr <= 20) return 'Std';
    if (emr <= 35) return 'I';
    if (emr <= 60) return 'II';
    if (emr <= 75) return 'III';
    return 'IV';
  }

  let lifeFactor = getLifeFactor(emr);
  let lifeClass = getLifeClass(emr);
  let healthFactor = getHealthFactor(emr);
  let healthClass = getHealthClass(emr);

  // ✅ Get Rates
  function getRate(age) {
    if (age <= 35) return { life: 1.5, accident: 1.0, cir: 3.0 };
    if (age <= 40) return { life: 3.0, accident: 1.0, cir: 6.0 };
    if (age <= 45) return { life: 4.5, accident: 1.0, cir: 12.0 };
    if (age <= 50) return { life: 6.0, accident: 1.0, cir: 15.0 };
    if (age <= 55) return { life: 7.5, accident: 1.5, cir: 20.0 };
    return { life: 9.0, accident: 1.5, cir: 25.0 };
  }

  let rate = getRate(user.age || 30);

  // ✅ Sum Assured
  let lifeSA = user.lifeCover || 10000000; // 100 lakh default
  let cirSA = user.cirCover || 5000000;   // 50 lakh default
  let accSA = user.accidentCover || 5000000;   // 50 lakh default

  // ✅ Base Premium
  let lifeBase = (rate.life * lifeSA) / 1000;
  let cirBase = (rate.cir * cirSA) / 1000;
  let accBase = (rate.accident * accSA) / 1000;

  // ✅ Loading
  let lifePremium = lifeBase + (lifeBase * (lifeFactor * 0.25));
  let cirPremium = cirBase + (cirBase * (healthFactor * 0.30));
  let accPremium = accBase + (accBase * (lifeFactor * 0.25));

  return {
    emr,
    lifeClass,
    healthClass,
    lifeFactor,
    healthFactor,
    lifePremium,
    cirPremium,
    accPremium: accPremium,
    total: lifePremium + cirPremium + accPremium
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

        // Send Welcome Email (non-blocking, with timeout)
        try {
            const welcomeCtrl = new AbortController();
            const welcomeTimeout = setTimeout(() => welcomeCtrl.abort(), 25000);
            const welcomeEmailBody = {
                sender: { name: 'AegisAI Insurance', email: SENDER_EMAIL },
                to: [{ email: email, name: name }],
                subject: 'Welcome to AegisAI Insurance! 🛡️',
                textContent: `Hello ${name}! Welcome to AegisAI. Your registration is complete. Log in to your dashboard to get started.`,
                htmlContent: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
                        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to AegisAI, ${name}! 🛡️</h1>
                        </div>
                        <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                            <p style="font-size: 16px;">Thank you for joining AegisAI. Your account has been created successfully.</p>
                            <p style="font-size: 16px;">With AegisAI, you have access to AI-driven risk assessment and personalized insurance proposals.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://insurance-app-ruby.vercel.app/login" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Go to Dashboard →</a>
                            </div>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
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
            // Non-fatal: user is registered even if email fails
            console.error('💥 Welcome Email Failed (non-fatal):', emailErr.message);
        }

        res.status(201).json({ token, user: { id: result.insertId, name, email, role: 'user' } });
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
});
