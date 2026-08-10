const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isHomeowner } = require('../middleware/roleCheck');

// GET /api/schedules
router.get('/', authMiddleware, async (req, res) => {
    try {
        let schedulesRes;
        if (req.user.role === 'admin') {
            schedulesRes = await db.query(`
        SELECT s.*, a.name as appliance_name, a.category, p.name as property_name, p.user_id
        FROM schedules s
        JOIN appliances a ON s.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
        ORDER BY s.next_due ASC
      `);
        } else {
            schedulesRes = await db.query(`
                SELECT s.*, a.name as appliance_name, a.category, p.name as property_name,
                u.name as homeowner_name, pr.name as provider_name
        FROM schedules s
        JOIN appliances a ON s.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
                JOIN users u ON p.user_id = u.id
                LEFT JOIN users pr ON s.provider_id = pr.id
        WHERE p.user_id = $1
        ORDER BY s.next_due ASC
      `, [req.user.id]);
        }

        res.json({ schedules: schedulesRes.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules.' });
    }
});

// GET /api/schedules/provider - Provider assigned schedules
router.get('/provider', authMiddleware, async (req, res) => {
    try {
        const schedulesRes = await db.query(`
      SELECT s.*, a.name as appliance_name, a.category, p.name as property_name, u.name as homeowner_name
      FROM schedules s
      JOIN appliances a ON s.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.provider_id = $1
      ORDER BY s.next_due ASC
    `, [req.user.id]);

        res.json({ schedules: schedulesRes.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch provider schedules.' });
    }
});

// POST /api/schedules
router.post('/', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const { appliance_id, frequency_days, next_due, reminder_days_before, provider_id } = req.body;

        if (!appliance_id || !frequency_days) {
            return res.status(400).json({ error: 'Appliance and frequency are required.' });
        }

        const existingRes = await db.query('SELECT * FROM schedules WHERE appliance_id = $1', [appliance_id]);
        if (existingRes.rows.length > 0) {
            return res.status(409).json({ error: 'A schedule already exists for this appliance. Update it instead.' });
        }

        let assignedProviderId = provider_id || null;
        if (!assignedProviderId) {
            const providerRes = await db.query(`
                SELECT u.id, COUNT(sl.id) as active_jobs
                FROM users u
                LEFT JOIN service_logs sl ON sl.provider_id = u.id AND sl.status IN ('scheduled', 'in_progress')
                WHERE u.role = 'service_provider'
                GROUP BY u.id
                ORDER BY active_jobs ASC, u.created_at ASC
                LIMIT 1
            `);
            assignedProviderId = providerRes.rows[0]?.id || null;
        }

        const calculatedNextDue = next_due || new Date(Date.now() + frequency_days * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

        const insertRes = await db.query(`
            INSERT INTO schedules (appliance_id, provider_id, frequency_days, next_due, reminder_days_before)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [appliance_id, assignedProviderId, frequency_days, calculatedNextDue, reminder_days_before || 7]);

        const scheduleRes = await db.query('SELECT * FROM schedules WHERE id = $1', [insertRes.rows[0].id]);

        if (assignedProviderId) {
            await db.query(`
                INSERT INTO notifications (user_id, title, message, type)
                VALUES ($1, $2, $3, $4)
            `, [assignedProviderId, 'New Job Assigned', `You have a new scheduled maintenance job for appliance #${appliance_id}.`, 'info']);
        }

        res.status(201).json({ schedule: scheduleRes.rows[0] });
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Failed to create schedule.' });
    }
});

// PUT /api/schedules/:id
router.put('/:id', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const { frequency_days, next_due, reminder_days_before } = req.body;
        const existingRes = await db.query('SELECT * FROM schedules WHERE id = $1', [req.params.id]);

        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }
        const existing = existingRes.rows[0];

        await db.query(`
      UPDATE schedules SET frequency_days = $1, next_due = $2, reminder_days_before = $3
      WHERE id = $4
    `, [
            frequency_days || existing.frequency_days,
            next_due || existing.next_due,
            reminder_days_before ?? existing.reminder_days_before,
            req.params.id
        ]);

        const scheduleRes = await db.query('SELECT * FROM schedules WHERE id = $1', [req.params.id]);
        res.json({ schedule: scheduleRes.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update schedule.' });
    }
});

// DELETE /api/schedules/:id
router.delete('/:id', authMiddleware, isHomeowner, async (req, res) => {
    try {
        const existingRes = await db.query('SELECT * FROM schedules WHERE id = $1', [req.params.id]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }

        await db.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
        res.json({ message: 'Schedule deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete schedule.' });
    }
});

module.exports = router;
