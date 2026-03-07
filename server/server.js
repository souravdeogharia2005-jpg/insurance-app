// ===== AegisAI - Express Backend Server =====

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aegisai-default-secret';

// --- Middleware ---
app.use(cors({
    origin: ['http://localhost:5173', 'https://insurance-app-ruby.vercel.app', 'https://insurance-4uqjgp3ji-souravdeogharia2005-jpgs-projects.vercel.app'],
    credentials: true
}));
app.use(express.json());

// --- MySQL Connection Pool ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aegisai_insurance',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
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

        // Send Welcome Email
        try {
            await resend.emails.send({
                from: 'AegisAI <onboarding@resend.dev>',
                to: email,
                subject: 'Welcome to AegisAI Insurance!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #2563eb;">Welcome to AegisAI, ${name}!</h2>
                        <p>Thank you for choosing us for your insurance needs. Your registration has been successfully completed.</p>
                        <p>With AegisAI, you now have access to our AI-driven risk assessment and customized insurance proposals designed specifically for you and your family.</p>
                        <br/>
                        <p>To get started, simply log in to your dashboard and create your first proposal.</p>
                        <p>If you have any questions, feel free to reply to this email.</p>
                        <br/>
                        <p>Best regards,</p>
                        <p><strong>The AegisAI Team</strong></p>
                    </div>
                `
            });
            console.log(`Welcome email sent via Resend to ${email}`);
        } catch (error) {
            console.error('Resend Welcome Email Error:', error.message);
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

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

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

        // Generate a random 8 character password
        const tempPassword = Math.random().toString(36).slice(-8);

        try {
            await resend.emails.send({
                from: 'AegisAI Support <onboarding@resend.dev>',
                to: email,
                subject: "AegisAI - Your Password Has Been Reset",
                text: `Hello! Your new temporary password is: ${tempPassword}\nPlease login and change it immediately.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #2563eb;">Password Reset Success</h2>
                        <p>Hello! We have reset your password as requested.</p>
                        <p>Your new temporary password is: <b style="font-size: 1.2em; color: #2563eb;">${tempPassword}</b></p>
                        <p>Please login to your account and change this password immediately for security.</p>
                        <br/>
                        <p>Best regards,<br/>The AegisAI Team</p>
                    </div>
                `,
            });

            // ONLY update DB if email was actually sent
            const passwordHash = await bcrypt.hash(tempPassword, 10);
            await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, email]);

            res.json({ message: `Success! New password sent to ${email}` });
        } catch (emailErr) {
            console.error('Resend API Error:', emailErr.message);
            res.status(500).json({ error: 'Email delivery failed via API. Please check if your Resend API key is valid.' });
        }
    } catch (error) {
        console.error('Forgot password internal error:', error.message);
        res.status(500).json({ error: 'Failed to process request' });
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
    res.json({ message: 'AegisAI API is running' });
});

// --- Start Server ---
async function startServer() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ Connected to MySQL database!');
        conn.release();
        app.listen(PORT, () => {
            console.log(`\n🚀 AegisAI Server running at http://localhost:${PORT}`);
            console.log(`📡 API: http://localhost:${PORT}/api`);
            console.log(`🔐 Auth: /api/auth/register, /api/auth/login, /api/auth/me\n`);
        });
    } catch (error) {
        console.error('❌ Failed to connect to MySQL:', error.message);
        if (error.code === 'ER_BAD_DB_ERROR') console.error('💡 Run "node setup-db.js" first');
        process.exit(1);
    }
}

startServer();
