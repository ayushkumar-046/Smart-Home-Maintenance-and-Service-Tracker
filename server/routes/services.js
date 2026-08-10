const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Helper to convert ? parameters to $1, $2, etc.
const toPgSql = (sql) => {
    let count = 1;
    return sql.replace(/\?/g, () => `$${count++}`);
};

// GET /api/services - Get service logs
router.get('/', authMiddleware, async (req, res) => {
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
        
        const { rows } = await db.query(toPgSql(query), params);
        res.json({ services: rows });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ error: 'Failed to fetch service logs.' });
    }
});

// GET /api/services/stats - Get expense stats
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? null : req.user.id;
        const params = [];

        // By category
        let byCategoryQuery = `
      SELECT a.category, SUM(sl.cost) as total_cost, COUNT(*) as count
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      WHERE sl.status = 'completed'
    `;
        if (userId) {
            byCategoryQuery += ` AND p.user_id = $1`;
            params.push(userId);
        }
        byCategoryQuery += ' GROUP BY a.category';

        const byCategoryRes = await db.query(byCategoryQuery, params);

        // By month (last 12 months)
        let byMonthQuery = `
            SELECT TO_CHAR(sl.created_at::date, 'YYYY-MM') as month, SUM(sl.cost) as total_cost, COUNT(*) as count
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      WHERE sl.status = 'completed'
    `;
        if (userId) byMonthQuery += ` AND p.user_id = $1`;
        byMonthQuery += ' GROUP BY month ORDER BY month DESC LIMIT 12';

        const byMonthRes = await db.query(byMonthQuery, params);

        // Total stats
        let totalQuery = `
      SELECT COUNT(*) as total_services, SUM(CASE WHEN status = 'completed' THEN cost ELSE 0 END) as total_cost
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      WHERE 1=1
    `;
        if (userId) totalQuery += ` AND p.user_id = $1`;

        const totalsRes = await db.query(totalQuery, params);

        res.json({ 
            byCategory: byCategoryRes.rows, 
            byMonth: byMonthRes.rows, 
            totals: totalsRes.rows[0] 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// GET /api/services/provider/stats - Provider analytics
router.get('/provider/stats', authMiddleware, async (req, res) => {
        try {
                const providerId = req.user.id;

                const countsRes = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE provider_id = $1) as assigned_jobs,
                COUNT(*) FILTER (WHERE provider_id = $2 AND status = 'completed') as completed_jobs,
                COUNT(*) FILTER (WHERE provider_id = $3 AND status IN ('scheduled', 'in_progress')) as active_jobs,
                COALESCE(SUM(CASE WHEN provider_id = $4 AND status = 'completed' THEN cost ELSE 0 END), 0) as earnings
            FROM service_logs
        `, [providerId, providerId, providerId, providerId]);

                const ratingRes = await db.query(`
            SELECT COALESCE(AVG(f.rating), 0) as avg_rating, COUNT(f.id) as total_reviews
            FROM feedback f
            JOIN service_logs sl ON f.service_log_id = sl.id
            WHERE sl.provider_id = $1
        `, [providerId]);

                const monthlyEarningsRes = await db.query(`
            SELECT TO_CHAR(sl.created_at::date, 'YYYY-MM') as month, SUM(sl.cost) as total
            FROM service_logs sl
            WHERE sl.provider_id = $1 AND sl.status = 'completed'
            GROUP BY month ORDER BY month DESC LIMIT 12
        `, [providerId]);

                res.json({
                        assignedJobs: Number(countsRes.rows[0].assigned_jobs || 0),
                        completedJobs: Number(countsRes.rows[0].completed_jobs || 0),
                        activeJobs: Number(countsRes.rows[0].active_jobs || 0),
                        earnings: Number(countsRes.rows[0].earnings || 0),
                        avgRating: Number(ratingRes.rows[0].avg_rating || 0),
                        totalReviews: Number(ratingRes.rows[0].total_reviews || 0),
                        monthlyEarnings: monthlyEarningsRes.rows
                });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch provider stats.' });
        }
});

// GET /api/services/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const serviceRes = await db.query(`
      SELECT sl.*, a.name as appliance_name, a.category, v.name as vendor_name,
      p.name as property_name
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      LEFT JOIN vendors v ON sl.vendor_id = v.id
      WHERE sl.id = $1
    `, [req.params.id]);

        if (serviceRes.rows.length === 0) {
            return res.status(404).json({ error: 'Service log not found.' });
        }

        const feedbackRes = await db.query('SELECT * FROM feedback WHERE service_log_id = $1', [req.params.id]);

        res.json({ service: serviceRes.rows[0], feedback: feedbackRes.rows[0] || null });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch service log.' });
    }
});

// POST /api/services
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { appliance_id, vendor_id, provider_id, scheduled_date, notes, cost } = req.body;

        if (!appliance_id || !scheduled_date) {
            return res.status(400).json({ error: 'Appliance and scheduled date are required.' });
        }

        const userRes = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows[0].plan === 'free') {
            const countRes = await db.query(`
        SELECT COUNT(*) as count FROM service_logs sl
        JOIN appliances a ON sl.appliance_id = a.id
        JOIN properties p ON a.property_id = p.id
        WHERE p.user_id = $1
      `, [req.user.id]);
            if (parseInt(countRes.rows[0].count) >= 5) {
                return res.status(403).json({
                    error: 'Free plan allows maximum 5 service logs. Upgrade to Premium for unlimited.',
                    upgrade_required: true
                });
            }
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

        const insertRes = await db.query(`
      INSERT INTO service_logs (appliance_id, vendor_id, user_id, provider_id, status, cost)
      VALUES ($1, $2, $3, $4, 'scheduled', $5) RETURNING id
        `, [appliance_id, vendor_id || null, req.user.id, assignedProviderId, cost || 0]);
        
        const newId = insertRes.rows[0].id;

        await db.query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, $2, $3, $4)
    `, [req.user.id, 'Service Scheduled', `A new service has been scheduled.`, 'info']);

        if (assignedProviderId) {
            await db.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
            `, [assignedProviderId, 'New Job Assigned', `You have been assigned a new service job.`, 'info']);
        }

        const serviceRes = await db.query(`
      SELECT sl.*, a.name as appliance_name, v.name as vendor_name
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      LEFT JOIN vendors v ON sl.vendor_id = v.id
      WHERE sl.id = $1
    `, [newId]);

        res.status(201).json({ service: serviceRes.rows[0] });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ error: 'Failed to create service log.' });
    }
});

// PUT /api/services/:id/status
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const existingRes = await db.query('SELECT * FROM service_logs WHERE id = $1', [req.params.id]);
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Service log not found.' });
        }
        const existing = existingRes.rows[0];

        await db.query(`
      UPDATE service_logs SET status = $1
      WHERE id = $2
    `, [status, req.params.id]);

        if (existing.user_id) {
            await db.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
      `, [existing.user_id, 'Service Status Updated',
                `Service #${req.params.id} status changed to ${status}.`,
                status === 'completed' ? 'success' : 'info']);
        }

        if (status === 'completed') {
            const scheduleRes = await db.query('SELECT * FROM schedules WHERE appliance_id = $1', [existing.appliance_id]);
            if (scheduleRes.rows.length > 0) {
                const schedule = scheduleRes.rows[0];
                const nextDue = new Date();
                nextDue.setDate(nextDue.getDate() + schedule.frequency_days);
                await db.query('UPDATE schedules SET next_due = $1 WHERE id = $2',
                    [nextDue.toISOString().split('T')[0], schedule.id]);
            }
        }

        const serviceRes = await db.query('SELECT * FROM service_logs WHERE id = $1', [req.params.id]);
        res.json({ service: serviceRes.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update service status.' });
    }
});

// PUT /api/services/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { vendor_id, provider_id, cost } = req.body;
        const existingRes = await db.query('SELECT * FROM service_logs WHERE id = $1', [req.params.id]);

        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Service log not found.' });
        }
        const existing = existingRes.rows[0];

        await db.query(`
      UPDATE service_logs SET vendor_id = $1, provider_id = $2, cost = $3
      WHERE id = $4
    `, [vendor_id ?? existing.vendor_id, provider_id ?? existing.provider_id, cost ?? existing.cost, req.params.id]);

        const serviceRes = await db.query('SELECT * FROM service_logs WHERE id = $1', [req.params.id]);
        res.json({ service: serviceRes.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update service log.' });
    }
});

// POST /api/services/:id/feedback
router.post('/:id/feedback', authMiddleware, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        const existingRes = await db.query('SELECT * FROM feedback WHERE service_log_id = $1 AND homeowner_id = $2',
            [req.params.id, req.user.id]);
        if (existingRes.rows.length > 0) {
            return res.status(409).json({ error: 'Feedback already submitted for this service.' });
        }

        await db.query('INSERT INTO feedback (service_log_id, homeowner_id, rating, comment) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.user.id, rating, comment || null]);

        res.status(201).json({ message: 'Feedback submitted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit feedback.' });
    }
});

// DELETE /api/services/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const existingRes = await db.query('SELECT * FROM service_logs WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]);
        if (existingRes.rows.length === 0 && req.user.role !== 'admin') {
            return res.status(404).json({ error: 'Service log not found.' });
        }

        await db.query('DELETE FROM service_logs WHERE id = $1', [req.params.id]);
        res.json({ message: 'Service log deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete service log.' });
    }
});

module.exports = router;
