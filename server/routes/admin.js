const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');
const { generateServiceReport } = require('../services/pdfService');

// GET /api/admin/users - Get all users
router.get('/users', authMiddleware, isAdmin, (req, res) => {
    try {
                const users = db.prepare(`
            SELECT id, public_id, name, email, role, plan, created_at FROM users
      ORDER BY created_at DESC
    `).all();
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// PUT /api/admin/users/:id/role - Promote/demote user
router.put('/users/:id/role', authMiddleware, isAdmin, (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['homeowner', 'service_provider', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

        db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, 'Role Updated', `Your account role has been changed to ${role}.`, 'info');

        const updated = db.prepare('SELECT id, name, email, role, plan, created_at FROM users WHERE id = ?')
            .get(req.params.id);
        res.json({ user: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user role.' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authMiddleware, isAdmin, (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account.' });
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        res.json({ message: 'User deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// GET /api/admin/stats - Platform analytics
router.get('/stats', authMiddleware, isAdmin, (req, res) => {
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin'").get().count;
        const premiumUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'premium'").get().count;
        const totalProperties = db.prepare('SELECT COUNT(*) as count FROM properties').get().count;
        const totalAppliances = db.prepare('SELECT COUNT(*) as count FROM appliances').get().count;
        const totalServices = db.prepare('SELECT COUNT(*) as count FROM service_logs').get().count;
        const totalVendors = db.prepare('SELECT COUNT(*) as count FROM vendors').get().count;
                const totalSchedules = db.prepare('SELECT COUNT(*) as count FROM schedules').get().count;
                const totalProviders = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'service_provider'").get().count;

        const totalRevenue = db.prepare(`
      SELECT SUM(sl.cost) as total FROM service_logs sl WHERE sl.status = 'completed'
    `).get().total || 0;

        const subscriptionRevenue = db.prepare(`
      SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'
    `).get().count * 499;

                const expenseByYear = db.prepare(`
                    SELECT EXTRACT(YEAR FROM completed_date::date)::text as year, SUM(cost) as total_cost
                    FROM service_logs
                    WHERE status = 'completed' AND completed_date IS NOT NULL
                    GROUP BY year ORDER BY year DESC
                `).all();

                const providerPerformance = db.prepare(`
            SELECT u.id, u.public_id, u.name, u.email,
            COUNT(sl.id) as assigned_jobs,
            SUM(CASE WHEN sl.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
            COALESCE(AVG(f.rating), 0) as avg_rating,
            COALESCE(SUM(CASE WHEN sl.status = 'completed' THEN sl.cost ELSE 0 END), 0) as earnings
            FROM users u
            LEFT JOIN service_logs sl ON sl.provider_id = u.id
            LEFT JOIN feedback f ON f.service_log_id = sl.id
            WHERE u.role = 'service_provider'
            GROUP BY u.id
            ORDER BY earnings DESC
            LIMIT 10
        `).all();

        // Jobs by month
                const jobsByMonth = db.prepare(`
            SELECT TO_CHAR(created_at::date, 'YYYY-MM') as month, COUNT(*) as count
            FROM service_logs
            GROUP BY month ORDER BY month DESC LIMIT 12
        `).all();

        // Users by role
        const usersByRole = db.prepare(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `).all();

        // Recent activities
        const recentServices = db.prepare(`
      SELECT sl.*, a.name as appliance_name, u.name as user_name
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      LEFT JOIN users u ON sl.user_id = u.id
      ORDER BY sl.created_at DESC LIMIT 10
    `).all();

        res.json({
            totalUsers, activeUsers, premiumUsers, totalProperties, totalAppliances,
            totalServices, totalVendors, totalSchedules, totalProviders, totalRevenue, subscriptionRevenue,
            expenseByYear, jobsByMonth, usersByRole, recentServices, providerPerformance
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

router.get('/properties', authMiddleware, isAdmin, (req, res) => {
    try {
        const properties = db.prepare(`
      SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM appliances WHERE property_id = p.id) as appliance_count
      FROM properties p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();
        res.json({ properties });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch properties.' });
    }
});

router.get('/appliances', authMiddleware, isAdmin, (req, res) => {
    try {
        const appliances = db.prepare(`
      SELECT a.*, p.name as property_name, u.name as owner_name
      FROM appliances a
      JOIN properties p ON a.property_id = p.id
      JOIN users u ON p.user_id = u.id
      ORDER BY a.id DESC
    `).all();
        res.json({ appliances });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch appliances.' });
    }
});

router.get('/schedules', authMiddleware, isAdmin, (req, res) => {
    try {
        const schedules = db.prepare(`
      SELECT s.*, a.name as appliance_name, p.name as property_name, u.name as owner_name
      FROM schedules s
      JOIN appliances a ON s.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      JOIN users u ON p.user_id = u.id
      ORDER BY s.next_due ASC
    `).all();
        res.json({ schedules });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules.' });
    }
});

// GET /api/admin/categories
router.get('/categories', authMiddleware, isAdmin, (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM service_categories ORDER BY name').all();
        res.json({ categories });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

// POST /api/admin/categories
router.post('/categories', authMiddleware, isAdmin, (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Category name required.' });

        const result = db.prepare('INSERT INTO service_categories (name, description) VALUES (?, ?)')
            .run(name, description || null);
        const category = db.prepare('SELECT * FROM service_categories WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ category });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Category already exists.' });
        }
        res.status(500).json({ error: 'Failed to create category.' });
    }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', authMiddleware, isAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM service_categories WHERE id = ?').run(req.params.id);
        res.json({ message: 'Category deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category.' });
    }
});

// GET /api/admin/subscriptions
router.get('/subscriptions', authMiddleware, isAdmin, (req, res) => {
    try {
        const subscriptions = db.prepare(`
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC
    `).all();
        res.json({ subscriptions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscriptions.' });
    }
});

// GET /api/admin/report - Generate platform report PDF
router.get('/report', authMiddleware, isAdmin, (req, res) => {
    (async () => {
        try {
            const services = db.prepare(`
        SELECT sl.scheduled_date as date, a.name as appliance, v.name as vendor, sl.status, sl.cost
        FROM service_logs sl
        JOIN appliances a ON sl.appliance_id = a.id
        LEFT JOIN vendors v ON sl.vendor_id = v.id
        ORDER BY sl.created_at DESC LIMIT 50
      `).all();

            const totalServices = db.prepare('SELECT COUNT(*) as c FROM service_logs').get().c;
            const totalCost = db.prepare("SELECT SUM(cost) as c FROM service_logs WHERE status='completed'").get().c || 0;
            const totalAppliances = db.prepare('SELECT COUNT(*) as c FROM appliances').get().c;

            const pdfBuffer = await generateServiceReport({
                propertyName: 'Platform Overview',
                period: 'All Time',
                totalServices,
                totalCost: totalCost.toFixed(2),
                totalAppliances,
                services
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=platform_report.pdf');
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Report gen error:', error);
            res.status(500).json({ error: 'Failed to generate report.' });
        }
    })();
});

module.exports = router;
