const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isHomeowner } = require('../middleware/roleCheck');

// GET /api/appliances - Get all appliances for current user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { property_id, category } = req.query;
        let query = '';
        let params = [];

        if (req.user.role === 'admin') {
            query = `
                SELECT a.*, p.name as property_name, p.user_id,
                (SELECT COUNT(*) FROM service_logs WHERE appliance_id = a.id) as service_count
                FROM appliances a
                JOIN properties p ON a.property_id = p.id
                WHERE 1=1
            `;
            params = [];
        } else {
            query = `
                SELECT a.*, p.name as property_name,
                (SELECT COUNT(*) FROM service_logs WHERE appliance_id = a.id) as service_count
                FROM appliances a
                JOIN properties p ON a.property_id = p.id
                WHERE p.user_id = $1
            `;
            params = [req.user.id];
        }

        if (property_id) {
            query += ` AND a.property_id = $${params.length + 1}`;
            params.push(property_id);
        }
        if (category) {
            query += ` AND a.category = $${params.length + 1}`;
            params.push(category);
        }

        query += ' ORDER BY a.id DESC';
        const result = await db.query(query, params);
        const appliances = result.rows;
        res.json({ appliances });
    } catch (error) {
        console.error('Get appliances error:', error);
        res.status(500).json({ error: 'Failed to fetch appliances.' });
    }
});

// GET /api/appliances/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const applianceResult = await db.query(`
            SELECT a.*, p.name as property_name, p.user_id
            FROM appliances a
            JOIN properties p ON a.property_id = p.id
            WHERE a.id = $1 AND (p.user_id = $2 OR $3 = 'admin')
        `, [req.params.id, req.user.id, req.user.role]);

        if (applianceResult.rowCount === 0) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }
        const appliance = applianceResult.rows[0];

        // Get service history
        const serviceHistoryResult = await db.query(`
            SELECT sl.*
            FROM service_logs sl
            WHERE sl.appliance_id = $1
            ORDER BY sl.created_at DESC
        `, [req.params.id]);
        const serviceHistory = serviceHistoryResult.rows;

        // Get schedule
        const scheduleResult = await db.query('SELECT * FROM schedules WHERE appliance_id = $1', [req.params.id]);
        const schedule = scheduleResult.rows[0] || null;

        res.json({ appliance, serviceHistory, schedule });
    } catch (error) {
        console.error('Get appliance error:', error);
        res.status(500).json({ error: 'Failed to fetch appliance details.' });
    }
});

// POST /api/appliances
router.post('/', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const { property_id, name, category, brand, model, purchase_date, installation_date, condition, warranty_expiry, lifecycle_stage, notes } = req.body;

        if (!property_id || !name || !category) {
            return res.status(400).json({ error: 'Property, name, and category are required.' });
        }

        // Verify property ownership
        const propertyResult = await db.query('SELECT * FROM properties WHERE id = $1 AND user_id = $2', [property_id, req.user.id]);
        if (propertyResult.rowCount === 0) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        const result = await db.query(
            `INSERT INTO appliances (property_id, name, category, brand, model, purchase_date, installation_date, condition, warranty_expiry, lifecycle_stage, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [property_id, name, category, brand || null, model || null, purchase_date || null,
             installation_date || purchase_date || null, condition || 'good', warranty_expiry || null, lifecycle_stage || 'active', notes || null]
        );

        const appliance = result.rows[0];
        res.status(201).json({ appliance });
    } catch (error) {
        console.error('Create appliance error:', error);
        res.status(500).json({ error: 'Failed to create appliance.' });
    }
});

// PUT /api/appliances/:id
router.put('/:id', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const { name, category, brand, model, purchase_date, installation_date, condition, warranty_expiry, lifecycle_stage, notes } = req.body;

        const existingResult = await db.query(`
            SELECT a.* FROM appliances a
            JOIN properties p ON a.property_id = p.id
            WHERE a.id = $1 AND p.user_id = $2
        `, [req.params.id, req.user.id]);

        if (existingResult.rowCount === 0) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }
        const existing = existingResult.rows[0];

        await db.query(
            `UPDATE appliances SET name = $1, category = $2, brand = $3, model = $4,
             purchase_date = $5, installation_date = $6, condition = $7, warranty_expiry = $8, lifecycle_stage = $9, notes = $10
             WHERE id = $11`,
            [
                name || existing.name,
                category || existing.category,
                brand ?? existing.brand,
                model ?? existing.model,
                purchase_date ?? existing.purchase_date,
                installation_date ?? existing.installation_date ?? existing.purchase_date,
                condition ?? existing.condition ?? 'good',
                warranty_expiry ?? existing.warranty_expiry,
                lifecycle_stage || existing.lifecycle_stage,
                notes ?? existing.notes,
                req.params.id
            ]
        );

        const applianceResult = await db.query('SELECT * FROM appliances WHERE id = $1', [req.params.id]);
        const appliance = applianceResult.rows[0];
        res.json({ appliance });
    } catch (error) {
        console.error('Update appliance error:', error);
        res.status(500).json({ error: 'Failed to update appliance.' });
    }
});

// DELETE /api/appliances/:id
router.delete('/:id', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const existingResult = await db.query(`
            SELECT a.* FROM appliances a
            JOIN properties p ON a.property_id = p.id
            WHERE a.id = $1 AND p.user_id = $2
        `, [req.params.id, req.user.id]);

        if (existingResult.rowCount === 0) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }

        await db.query('DELETE FROM appliances WHERE id = $1', [req.params.id]);
        res.json({ message: 'Appliance deleted successfully.' });
    } catch (error) {
        console.error('Delete appliance error:', error);
        res.status(500).json({ error: 'Failed to delete appliance.' });
    }
});

module.exports = router;