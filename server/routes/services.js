const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isHomeownerOrProvider } = require('../middleware/roleCheck');

// GET /api/services - Get service logs
router.get('/', authMiddleware, (req, res) => {
    try {
        const { appliance_id, status, property_id } = req.query;
        let query, params;

        if (req.user.role === 'admin') {
            query = `
        SELECT sl.*, a.name as appliance_name, a.category, v.name as vendor_name,
        p.name as property_name, u.name as homeowner_name, pr.name as provider_name
        FROM service_logs sl
        JOIN appliances a ON sl.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
        LEFT JOIN vendors v ON sl.vendor_id = v.id
        LEFT JOIN users u ON sl.user_id = u.id
        LEFT JOIN users pr ON sl.provider_id = pr.id
        WHERE 1=1
      `;
            params = [];
        } else if (req.user.role === 'service_provider') {
            query = `
        SELECT sl.*, a.name as appliance_name, a.category, v.name as vendor_name,
        p.name as property_name, u.name as homeowner_name
        FROM service_logs sl
        JOIN appliances a ON sl.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
        LEFT JOIN vendors v ON sl.vendor_id = v.id
        LEFT JOIN users u ON sl.user_id = u.id
        WHERE sl.provider_id = ?
      `;
            params = [req.user.id];
        } else {
            query = `
        SELECT sl.*, a.name as appliance_name, a.category, v.name as vendor_name,
        p.name as property_name, pr.name as provider_name
        FROM service_logs sl
        JOIN appliances a ON sl.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
        LEFT JOIN vendors v ON sl.vendor_id = v.id
        LEFT JOIN users pr ON sl.provider_id = pr.id
        WHERE sl.user_id = ?
      `;
            params = [req.user.id];
        }

        if (appliance_id) { query += ' AND sl.appliance_id = ?'; params.push(appliance_id); }
        if (status) { query += ' AND sl.status = ?'; params.push(status); }
        if (property_id) { query += ' AND a.property_id = ?'; params.push(property_id); }

        query += ' ORDER BY sl.created_at DESC';
        const services = db.prepare(query).all(...params);
        res.json({ services });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ error: 'Failed to fetch service logs.' });
    }
});

// GET /api/services/stats - Get expense stats
router.get('/stats', authMiddleware, (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;

        // By category
        let byCategoryQuery = `
      SELECT a.category, SUM(sl.cost) as total_cost, COUNT(*) as count
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      WHERE sl.status = 'completed'
    `;
        if (userId) byCategoryQuery += ` AND p.user_id = ${userId}`;
        byCategoryQuery += ' GROUP BY a.category';

        const byCategory = db.prepare(byCategoryQuery).all();

        // By month (last 12 months)
        let byMonthQuery = `
      SELECT strftime('%Y-%m', sl.completed_date) as month, SUM(sl.cost) as total_cost, COUNT(*) as count
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      WHERE sl.status = 'completed' AND sl.completed_date IS NOT NULL
    `;
        if (userId) byMonthQuery += ` AND p.user_id = ${userId}`;
        byMonthQuery += ' GROUP BY month ORDER BY month DESC LIMIT 12';

        const byMonth = db.prepare(byMonthQuery).all();

        // Total stats
        let totalQuery = `
      SELECT COUNT(*) as total_services, SUM(CASE WHEN status = 'completed' THEN cost ELSE 0 END) as total_cost
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      WHERE 1=1
    `;
        if (userId) totalQuery += ` AND p.user_id = ${userId}`;

        const totals = db.prepare(totalQuery).get();

        res.json({ byCategory, byMonth, totals });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// GET /api/services/:id
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const service = db.prepare(`
      SELECT sl.*, a.name as appliance_name, a.category, v.name as vendor_name,
      p.name as property_name
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      LEFT JOIN vendors v ON sl.vendor_id = v.id
      WHERE sl.id = ?
    `).get(req.params.id);

        if (!service) {
            return res.status(404).json({ error: 'Service log not found.' });
        }

        // Get feedback if exists
        const feedback = db.prepare('SELECT * FROM feedback WHERE service_log_id = ?').get(req.params.id);

        res.json({ service, feedback });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch service log.' });
    }
});

// POST /api/services
router.post('/', authMiddleware, (req, res) => {
    try {
        const { appliance_id, vendor_id, provider_id, scheduled_date, notes, cost } = req.body;

        if (!appliance_id || !scheduled_date) {
            return res.status(400).json({ error: 'Appliance and scheduled date are required.' });
        }

        // Check free plan limit
        const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
        if (user.plan === 'free') {
            const count = db.prepare(`
        SELECT COUNT(*) as count FROM service_logs sl
        JOIN appliances a ON sl.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
        WHERE p.user_id = ?
      `).get(req.user.id);
            if (count.count >= 5) {
                return res.status(403).json({
                    error: 'Free plan allows maximum 5 service logs. Upgrade to Premium for unlimited.',
                    upgrade_required: true
                });
            }
        }

        const result = db.prepare(`
      INSERT INTO service_logs (appliance_id, vendor_id, user_id, provider_id, status, scheduled_date, cost, notes)
      VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?)
    `).run(appliance_id, vendor_id || null, req.user.id, provider_id || null, scheduled_date, cost || 0, notes || null);

        // Create notification
        db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, 'Service Scheduled', `A new service has been scheduled for ${scheduled_date}.`, 'info');

        // Notify provider if assigned
        if (provider_id) {
            db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(provider_id, 'New Job Assigned', `You have been assigned a new service job for ${scheduled_date}.`, 'info');
        }

        const service = db.prepare(`
      SELECT sl.*, a.name as appliance_name, v.name as vendor_name
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      LEFT JOIN vendors v ON sl.vendor_id = v.id
      WHERE sl.id = ?
    `).get(result.lastInsertRowid);

        res.status(201).json({ service });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ error: 'Failed to create service log.' });
    }
});

// PUT /api/services/:id/status - Update service status
router.put('/:id/status', authMiddleware, (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const existing = db.prepare('SELECT * FROM service_logs WHERE id = ?').get(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Service log not found.' });
        }

        const updates = { status };
        if (status === 'completed') {
            updates.completed_date = new Date().toISOString().split('T')[0];
        }

        db.prepare(`
      UPDATE service_logs SET status = ?, completed_date = COALESCE(?, completed_date)
      WHERE id = ?
    `).run(status, updates.completed_date || null, req.params.id);

        // Create notification for status change
        if (existing.user_id) {
            db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(existing.user_id, 'Service Status Updated',
                `Service #${req.params.id} status changed to ${status}.`,
                status === 'completed' ? 'success' : 'info');
        }

        // Update schedule if completed
        if (status === 'completed') {
            const schedule = db.prepare('SELECT * FROM schedules WHERE appliance_id = ?').get(existing.appliance_id);
            if (schedule) {
                const nextDue = new Date();
                nextDue.setDate(nextDue.getDate() + schedule.frequency_days);
                db.prepare('UPDATE schedules SET last_service = ?, next_due = ? WHERE id = ?')
                    .run(new Date().toISOString().split('T')[0], nextDue.toISOString().split('T')[0], schedule.id);
            }
        }

        const service = db.prepare('SELECT * FROM service_logs WHERE id = ?').get(req.params.id);
        res.json({ service });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update service status.' });
    }
});

// PUT /api/services/:id
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { vendor_id, provider_id, scheduled_date, cost, notes } = req.body;
        const existing = db.prepare('SELECT * FROM service_logs WHERE id = ?').get(req.params.id);

        if (!existing) {
            return res.status(404).json({ error: 'Service log not found.' });
        }

        db.prepare(`
      UPDATE service_logs SET vendor_id = ?, provider_id = ?, scheduled_date = ?, cost = ?, notes = ?
      WHERE id = ?
    `).run(
            vendor_id ?? existing.vendor_id, provider_id ?? existing.provider_id,
            scheduled_date || existing.scheduled_date, cost ?? existing.cost,
            notes ?? existing.notes, req.params.id
        );

        const service = db.prepare('SELECT * FROM service_logs WHERE id = ?').get(req.params.id);
        res.json({ service });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update service log.' });
    }
});

// POST /api/services/:id/feedback
router.post('/:id/feedback', authMiddleware, (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        const existing = db.prepare('SELECT * FROM feedback WHERE service_log_id = ? AND homeowner_id = ?')
            .get(req.params.id, req.user.id);
        if (existing) {
            return res.status(409).json({ error: 'Feedback already submitted for this service.' });
        }

        db.prepare('INSERT INTO feedback (service_log_id, homeowner_id, rating, comment) VALUES (?, ?, ?, ?)')
            .run(req.params.id, req.user.id, rating, comment || null);

        // Update vendor rating
        const service = db.prepare('SELECT vendor_id FROM service_logs WHERE id = ?').get(req.params.id);
        if (service && service.vendor_id) {
            const avgRating = db.prepare(`
        SELECT AVG(f.rating) as avg_rating, COUNT(*) as count
        FROM feedback f
        JOIN service_logs sl ON f.service_log_id = sl.id
        WHERE sl.vendor_id = ?
      `).get(service.vendor_id);

            db.prepare('UPDATE vendors SET rating = ?, total_jobs = ? WHERE id = ?')
                .run(Math.round(avgRating.avg_rating * 10) / 10, avgRating.count, service.vendor_id);
        }

        res.status(201).json({ message: 'Feedback submitted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit feedback.' });
    }
});

// DELETE /api/services/:id
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM service_logs WHERE id = ? AND user_id = ?')
            .get(req.params.id, req.user.id);
        if (!existing && req.user.role !== 'admin') {
            return res.status(404).json({ error: 'Service log not found.' });
        }

        db.prepare('DELETE FROM service_logs WHERE id = ?').run(req.params.id);
        res.json({ message: 'Service log deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete service log.' });
    }
});

module.exports = router;
