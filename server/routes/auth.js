const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

function generatePublicId(prefix) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${suffix}`;
}

function getCookieOptions() {
    const secure = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure,
        sameSite: secure ? 'none' : 'lax',
        maxAge: 30 * 60 * 1000
    };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        const validRoles = ['homeowner', 'service_provider', 'admin'];
        const userRole = validRoles.includes(role) ? role : 'homeowner';

        // Check if user already exists
        const existingResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingResult.rowCount > 0) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const password_hash = bcrypt.hashSync(password, 12);
        const publicId = generatePublicId(userRole === 'admin' ? 'ADM' : userRole === 'service_provider' ? 'PRV' : 'HOM');
        const result = await db.query(
            'INSERT INTO users (public_id, name, email, password_hash, role, plan) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [publicId, name, email, password_hash, userRole, 'free']
        );

        const userResult = await db.query('SELECT id, public_id, name, email, role, plan, created_at FROM users WHERE id = $1', [result.rows[0].id]);
        const user = userResult.rows[0];

        // Create welcome notification
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
            [user.id, 'Welcome!', `Welcome to Smart Home Tracker, ${name}! Get started by adding your first property.`, 'info']
        );

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.cookie('token', token, getCookieOptions());

        res.status(201).json({ user });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rowCount === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const user = userResult.rows[0];

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.cookie('token', token, getCookieOptions());

        const { password_hash, ...userData } = user;
        res.json({ user: userData });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userResult = await db.query('SELECT id, public_id, name, email, role, plan, created_at FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rowCount === 0) {
            res.clearCookie('token');
            return res.status(404).json({ error: 'User not found.' });
        }
        const user = userResult.rows[0];
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user data.' });
    }
});

// PUT /api/auth/refresh - Refresh token (extend session)
router.put('/refresh', authMiddleware, async (req, res) => {
    try {
        const userResult = await db.query('SELECT id, public_id, email, role, plan FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const user = userResult.rows[0];

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.cookie('token', token, getCookieOptions());

        res.json({ message: 'Session refreshed.' });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Session refresh failed.' });
    }
});

module.exports = router;