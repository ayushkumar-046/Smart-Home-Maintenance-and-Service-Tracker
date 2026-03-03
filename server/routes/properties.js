const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isHomeowner } = require('../middleware/roleCheck');

// GET /api/properties - Get all properties for current user
router.get('/', authMiddleware, (req, res) => {
    try {
        let properties;
        if (req.user.role === 'admin') {
            properties = db.prepare(`
        SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM appliances WHERE property_id = p.id) as appliance_count
        FROM properties p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `).all();
        } else {
            properties = db.prepare(`
        SELECT p.*,
        (SELECT COUNT(*) FROM appliances WHERE property_id = p.id) as appliance_count
        FROM properties p
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `).all(req.user.id);
        }
        res.json({ properties });
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({ error: 'Failed to fetch properties.' });
    }
});

// GET /api/properties/:id
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const property = db.prepare(`
      SELECT p.*,
      (SELECT COUNT(*) FROM appliances WHERE property_id = p.id) as appliance_count
      FROM properties p
      WHERE p.id = ? AND (p.user_id = ? OR ? = 'admin')
    `).get(req.params.id, req.user.id, req.user.role);

        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }
        res.json({ property });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch property.' });
    }
});

// POST /api/properties
router.post('/', authMiddleware, isHomeowner, (req, res) => {
    try {
        const { name, address, type } = req.body;
        if (!name || !address || !type) {
            return res.status(400).json({ error: 'Name, address, and type are required.' });
        }

        // Check free plan limit
        const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
        if (user.plan === 'free') {
            const count = db.prepare('SELECT COUNT(*) as count FROM properties WHERE user_id = ?').get(req.user.id);
            if (count.count >= 2) {
                return res.status(403).json({
                    error: 'Free plan allows maximum 2 properties. Upgrade to Premium for unlimited properties.',
                    upgrade_required: true
                });
            }
        }

        const result = db.prepare(
            'INSERT INTO properties (user_id, name, address, type) VALUES (?, ?, ?, ?)'
        ).run(req.user.id, name, address, type);

        const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ property });
    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({ error: 'Failed to create property.' });
    }
});

// PUT /api/properties/:id
router.put('/:id', authMiddleware, isHomeowner, (req, res) => {
    try {
        const { name, address, type } = req.body;
        const existing = db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ?')
            .get(req.params.id, req.user.id);

        if (!existing) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        db.prepare('UPDATE properties SET name = ?, address = ?, type = ? WHERE id = ?')
            .run(name || existing.name, address || existing.address, type || existing.type, req.params.id);

        const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
        res.json({ property });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update property.' });
    }
});

// DELETE /api/properties/:id
router.delete('/:id', authMiddleware, isHomeowner, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ?')
            .get(req.params.id, req.user.id);

        if (!existing) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
        res.json({ message: 'Property deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete property.' });
    }
});

module.exports = router;
