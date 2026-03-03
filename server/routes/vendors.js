const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');

// GET /api/vendors
router.get('/', authMiddleware, (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM vendors';
        const params = [];

        if (category) {
            query += ' WHERE category = ?';
            params.push(category);
        }

        query += ' ORDER BY rating DESC';
        const vendors = db.prepare(query).all(...params);
        res.json({ vendors });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vendors.' });
    }
});

// GET /api/vendors/:id
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found.' });
        }

        // Get feedback for this vendor's jobs
        const feedback = db.prepare(`
      SELECT f.*, u.name as homeowner_name, sl.scheduled_date
      FROM feedback f
      JOIN service_logs sl ON f.service_log_id = sl.id
      JOIN users u ON f.homeowner_id = u.id
      WHERE sl.vendor_id = ?
      ORDER BY f.created_at DESC
    `).all(req.params.id);

        res.json({ vendor, feedback });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vendor details.' });
    }
});

// POST /api/vendors
router.post('/', authMiddleware, isAdmin, (req, res) => {
    try {
        const { name, category, phone, email } = req.body;
        if (!name || !category) {
            return res.status(400).json({ error: 'Name and category are required.' });
        }

        const result = db.prepare(
            'INSERT INTO vendors (name, category, phone, email) VALUES (?, ?, ?, ?)'
        ).run(name, category, phone || null, email || null);

        const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ vendor });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create vendor.' });
    }
});

// PUT /api/vendors/:id
router.put('/:id', authMiddleware, isAdmin, (req, res) => {
    try {
        const { name, category, phone, email } = req.body;
        const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);

        if (!existing) {
            return res.status(404).json({ error: 'Vendor not found.' });
        }

        db.prepare('UPDATE vendors SET name = ?, category = ?, phone = ?, email = ? WHERE id = ?')
            .run(name || existing.name, category || existing.category,
                phone ?? existing.phone, email ?? existing.email, req.params.id);

        const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
        res.json({ vendor });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update vendor.' });
    }
});

// DELETE /api/vendors/:id
router.delete('/:id', authMiddleware, isAdmin, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Vendor not found.' });
        }

        db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
        res.json({ message: 'Vendor deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete vendor.' });
    }
});

module.exports = router;
