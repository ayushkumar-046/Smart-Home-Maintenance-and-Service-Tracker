const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isHomeowner } = require('../middleware/roleCheck');

// GET /api/schedules
router.get('/', authMiddleware, (req, res) => {
    try {
        let schedules;
        if (req.user.role === 'admin') {
            schedules = db.prepare(`
        SELECT s.*, a.name as appliance_name, a.category, p.name as property_name, p.user_id
        FROM schedules s
        JOIN appliances a ON s.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
        ORDER BY s.next_due ASC
      `).all();
        } else {
            schedules = db.prepare(`
        SELECT s.*, a.name as appliance_name, a.category, p.name as property_name
        FROM schedules s
        JOIN appliances a ON s.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
        WHERE p.user_id = ?
        ORDER BY s.next_due ASC
      `).all(req.user.id);
        }
        res.json({ schedules });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules.' });
    }
});

// POST /api/schedules
router.post('/', authMiddleware, isHomeowner, (req, res) => {
    try {
        const { appliance_id, frequency_days, next_due, reminder_days_before } = req.body;

        if (!appliance_id || !frequency_days) {
            return res.status(400).json({ error: 'Appliance and frequency are required.' });
        }

        // Check if schedule already exists
        const existing = db.prepare('SELECT * FROM schedules WHERE appliance_id = ?').get(appliance_id);
        if (existing) {
            return res.status(409).json({ error: 'A schedule already exists for this appliance. Update it instead.' });
        }

        const calculatedNextDue = next_due || new Date(Date.now() + frequency_days * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

        const result = db.prepare(`
      INSERT INTO schedules (appliance_id, frequency_days, next_due, reminder_days_before)
      VALUES (?, ?, ?, ?)
    `).run(appliance_id, frequency_days, calculatedNextDue, reminder_days_before || 7);

        const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ schedule });
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Failed to create schedule.' });
    }
});

// PUT /api/schedules/:id
router.put('/:id', authMiddleware, isHomeowner, (req, res) => {
    try {
        const { frequency_days, next_due, reminder_days_before } = req.body;
        const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);

        if (!existing) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }

        db.prepare(`
      UPDATE schedules SET frequency_days = ?, next_due = ?, reminder_days_before = ?
      WHERE id = ?
    `).run(
            frequency_days || existing.frequency_days,
            next_due || existing.next_due,
            reminder_days_before ?? existing.reminder_days_before,
            req.params.id
        );

        const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
        res.json({ schedule });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update schedule.' });
    }
});

// DELETE /api/schedules/:id
router.delete('/:id', authMiddleware, isHomeowner, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }

        db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
        res.json({ message: 'Schedule deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete schedule.' });
    }
});

module.exports = router;
