const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        const validRoles = ['homeowner', 'service_provider', 'admin'];
        const userRole = validRoles.includes(role) ? role : 'homeowner';

        // Check if user already exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const password_hash = bcrypt.hashSync(password, 12);
        const result = db.prepare(
            'INSERT INTO users (name, email, password_hash, role, plan) VALUES (?, ?, ?, ?, ?)'
        ).run(name, email, password_hash, userRole, 'free');

        const user = db.prepare('SELECT id, name, email, role, plan, created_at FROM users WHERE id = ?')
            .get(result.lastInsertRowid);

        // Create welcome notification
        db.prepare(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
        ).run(user.id, 'Welcome!', `Welcome to Smart Home Tracker, ${name}! Get started by adding your first property.`, 'info');

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000 // 30 minutes
        });

        res.status(201).json({ user });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000
        });

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
router.get('/me', authMiddleware, (req, res) => {
    try {
        const user = db.prepare('SELECT id, name, email, role, plan, created_at FROM users WHERE id = ?')
            .get(req.user.id);
        if (!user) {
            res.clearCookie('token');
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user data.' });
    }
});

// PUT /api/auth/refresh - Refresh token (extend session)
router.put('/refresh', authMiddleware, (req, res) => {
    try {
        const user = db.prepare('SELECT id, email, role, plan FROM users WHERE id = ?').get(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000
        });

        res.json({ message: 'Session refreshed.' });
    } catch (error) {
        res.status(500).json({ error: 'Session refresh failed.' });
    }
});

module.exports = router;
