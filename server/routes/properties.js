const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isHomeowner } = require('../middleware/roleCheck');

// GET /api/properties - Get all properties for current user
router.get('/', authMiddleware, async (req, res) => {
    try {
        let properties;
        if (req.user.role === 'admin') {
            const result = await db.query(`
                SELECT p.*, u.name as owner_name,
                (SELECT COUNT(*) FROM appliances WHERE property_id = p.id) as appliance_count
                FROM properties p
                JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC
            `);
            properties = result.rows;
        } else {
            const result = await db.query(`
                SELECT p.*,
                (SELECT COUNT(*) FROM appliances WHERE property_id = p.id) as appliance_count
                FROM properties p
                WHERE p.user_id = $1
                ORDER BY p.created_at DESC
            `, [req.user.id]);
            properties = result.rows;
        }
        res.json({ properties });
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({ error: 'Failed to fetch properties.' });
    }
});

// GET /api/properties/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*,
            (SELECT COUNT(*) FROM appliances WHERE property_id = p.id) as appliance_count
            FROM properties p
            WHERE p.id = $1 AND (p.user_id = $2 OR $3 = 'admin')
        `, [req.params.id, req.user.id, req.user.role]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Property not found.' });
        }
        const property = result.rows[0];
        res.json({ property });
    } catch (error) {
        console.error('Get property error:', error);
        res.status(500).json({ error: 'Failed to fetch property.' });
    }
});

// POST /api/properties
router.post('/', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const { name, address, type, size_sqft } = req.body;
        if (!name || !address || !type) {
            return res.status(400).json({ error: 'Name, address, and type are required.' });
        }

        // Check free plan limit
        const userResult = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const user = userResult.rows[0];

        if (user.plan === 'free') {
            const countResult = await db.query('SELECT COUNT(*) as count FROM properties WHERE user_id = $1', [req.user.id]);
            if (countResult.rows[0].count >= 2) {
                return res.status(403).json({
                    error: 'Free plan allows maximum 2 properties. Upgrade to Premium for unlimited properties.',
                    upgrade_required: true
                });
            }
        }

        const result = await db.query(
            'INSERT INTO properties (user_id, name, address, type, size_sqft) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, name, address, type, size_sqft || 0]
        );

        const property = result.rows[0];
        res.status(201).json({ property });
    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({ error: 'Failed to create property.' });
    }
});

// PUT /api/properties/:id
router.put('/:id', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const { name, address, type, size_sqft } = req.body;
        const existingResult = await db.query('SELECT * FROM properties WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (existingResult.rowCount === 0) {
            return res.status(404).json({ error: 'Property not found.' });
        }
        const existing = existingResult.rows[0];

        await db.query(
            'UPDATE properties SET name = $1, address = $2, type = $3, size_sqft = $4 WHERE id = $5',
            [name || existing.name, address || existing.address, type || existing.type, size_sqft ?? existing.size_sqft ?? 0, req.params.id]
        );

        const propertyResult = await db.query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
        const property = propertyResult.rows[0];
        res.json({ property });
    } catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({ error: 'Failed to update property.' });
    }
});

// DELETE /api/properties/:id
router.delete('/:id', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const existingResult = await db.query('SELECT * FROM properties WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (existingResult.rowCount === 0) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        await db.query('DELETE FROM properties WHERE id = $1', [req.params.id]);
        res.json({ message: 'Property deleted successfully.' });
    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ error: 'Failed to delete property.' });
    }
});

module.exports = router;