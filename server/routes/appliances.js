const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isHomeowner } = require('../middleware/roleCheck');

// GET /api/appliances - Get all appliances for current user
router.get('/', authMiddleware, (req, res) => {
    try {
        const { property_id, category } = req.query;
        let query, params;

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
        WHERE p.user_id = ?
      `;
            params = [req.user.id];
        }

        if (property_id) {
            query += ' AND a.property_id = ?';
            params.push(property_id);
        }
        if (category) {
            query += ' AND a.category = ?';
            params.push(category);
        }

        query += ' ORDER BY a.id DESC';
        const appliances = db.prepare(query).all(...params);
        res.json({ appliances });
    } catch (error) {
        console.error('Get appliances error:', error);
        res.status(500).json({ error: 'Failed to fetch appliances.' });
    }
});

// GET /api/appliances/:id
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const appliance = db.prepare(`
      SELECT a.*, p.name as property_name, p.user_id
      FROM appliances a
      JOIN properties p ON a.property_id = p.id
      WHERE a.id = ? AND (p.user_id = ? OR ? = 'admin')
    `).get(req.params.id, req.user.id, req.user.role);

        if (!appliance) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }

        // Get service history
        const serviceHistory = db.prepare(`
      SELECT sl.*, v.name as vendor_name
      FROM service_logs sl
      LEFT JOIN vendors v ON sl.vendor_id = v.id
      WHERE sl.appliance_id = ?
      ORDER BY sl.created_at DESC
    `).all(req.params.id);

        // Get schedule
        const schedule = db.prepare('SELECT * FROM schedules WHERE appliance_id = ?').get(req.params.id);

        res.json({ appliance, serviceHistory, schedule });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch appliance details.' });
    }
});

// POST /api/appliances
router.post('/', authMiddleware, isHomeowner, (req, res) => {
    try {
        const { property_id, name, category, brand, model, purchase_date, warranty_expiry, lifecycle_stage, notes } = req.body;

        if (!property_id || !name || !category) {
            return res.status(400).json({ error: 'Property, name, and category are required.' });
        }

        // Verify property ownership
        const property = db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ?')
            .get(property_id, req.user.id);
        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        const result = db.prepare(`
      INSERT INTO appliances (property_id, name, category, brand, model, purchase_date, warranty_expiry, lifecycle_stage, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(property_id, name, category, brand || null, model || null, purchase_date || null,
            warranty_expiry || null, lifecycle_stage || 'active', notes || null);

        const appliance = db.prepare('SELECT * FROM appliances WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ appliance });
    } catch (error) {
        console.error('Create appliance error:', error);
        res.status(500).json({ error: 'Failed to create appliance.' });
    }
});

// PUT /api/appliances/:id
router.put('/:id', authMiddleware, isHomeowner, (req, res) => {
    try {
        const { name, category, brand, model, purchase_date, warranty_expiry, lifecycle_stage, notes } = req.body;

        const existing = db.prepare(`
      SELECT a.* FROM appliances a
      JOIN properties p ON a.property_id = p.id
      WHERE a.id = ? AND p.user_id = ?
    `).get(req.params.id, req.user.id);

        if (!existing) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }

        db.prepare(`
      UPDATE appliances SET name = ?, category = ?, brand = ?, model = ?,
      purchase_date = ?, warranty_expiry = ?, lifecycle_stage = ?, notes = ?
      WHERE id = ?
    `).run(
            name || existing.name, category || existing.category, brand ?? existing.brand,
            model ?? existing.model, purchase_date ?? existing.purchase_date,
            warranty_expiry ?? existing.warranty_expiry, lifecycle_stage || existing.lifecycle_stage,
            notes ?? existing.notes, req.params.id
        );

        const appliance = db.prepare('SELECT * FROM appliances WHERE id = ?').get(req.params.id);
        res.json({ appliance });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update appliance.' });
    }
});

// DELETE /api/appliances/:id
router.delete('/:id', authMiddleware, isHomeowner, (req, res) => {
    try {
        const existing = db.prepare(`
      SELECT a.* FROM appliances a
      JOIN properties p ON a.property_id = p.id
      WHERE a.id = ? AND p.user_id = ?
    `).get(req.params.id, req.user.id);

        if (!existing) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }

        db.prepare('DELETE FROM appliances WHERE id = ?').run(req.params.id);
        res.json({ message: 'Appliance deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete appliance.' });
    }
});

module.exports = router;
