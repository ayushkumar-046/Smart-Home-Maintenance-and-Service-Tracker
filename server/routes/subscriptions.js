const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { createCheckoutSession } = require('../services/stripeService');
const { generateReceipt } = require('../services/pdfService');
const path = require('path');
const fs = require('fs');

// GET /api/subscriptions - Get current user's subscription
router.get('/', authMiddleware, (req, res) => {
    try {
        const subscription = db.prepare(`
      SELECT * FROM subscriptions WHERE user_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(req.user.id);

        const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);

        res.json({
            subscription: subscription || null,
            currentPlan: user.plan,
            limits: user.plan === 'free' ? {
                maxProperties: 2,
                maxServiceLogs: 5,
                aiFeatures: false
            } : {
                maxProperties: 'unlimited',
                maxServiceLogs: 'unlimited',
                aiFeatures: true
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscription.' });
    }
});

// POST /api/subscriptions/checkout - Create Stripe checkout session
router.post('/checkout', authMiddleware, (req, res) => {
    (async () => {
        try {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
            if (user.plan === 'premium') {
                return res.status(400).json({ error: 'You already have a premium subscription.' });
            }

            const result = await createCheckoutSession(req.user.id, user.email);
            res.json({ url: result.url, sessionId: result.sessionId, mock: result.mock });
        } catch (error) {
            console.error('Checkout error:', error);
            res.status(500).json({ error: 'Failed to create checkout session.' });
        }
    })();
});

// POST /api/subscriptions/activate-mock - Activate mock subscription for dev
router.post('/activate-mock', authMiddleware, (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (user.plan === 'premium') {
            return res.status(400).json({ error: 'Already premium.' });
        }

        const mockSessionId = `mock_${Date.now()}`;
        db.prepare(`
      INSERT INTO subscriptions (user_id, plan, stripe_session_id, status, start_date, end_date)
      VALUES (?, 'premium', ?, 'active', date('now'), date('now', '+30 days'))
    `).run(req.user.id, mockSessionId);

        db.prepare("UPDATE users SET plan = 'premium' WHERE id = ?").run(req.user.id);

        db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, 'Premium Activated!', 'Your premium subscription is now active. Enjoy unlimited features!', 'success');

        res.json({ message: 'Premium activated (mock mode).', plan: 'premium' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to activate subscription.' });
    }
});

// GET /api/subscriptions/receipt/:id - Download receipt PDF
router.get('/receipt/:id', authMiddleware, (req, res) => {
    (async () => {
        try {
            const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?')
                .get(req.params.id, req.user.id);

            if (!sub) {
                return res.status(404).json({ error: 'Subscription not found.' });
            }

            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

            const pdfBuffer = await generateReceipt({
                receiptNumber: `RCP-${sub.id}-${Date.now()}`,
                date: sub.start_date,
                customerName: user.name,
                customerEmail: user.email,
                planName: 'Premium Plan Subscription',
                period: 'Monthly',
                amount: '₹499'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=receipt_${sub.id}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Receipt gen error:', error);
            res.status(500).json({ error: 'Failed to generate receipt.' });
        }
    })();
});

module.exports = router;
