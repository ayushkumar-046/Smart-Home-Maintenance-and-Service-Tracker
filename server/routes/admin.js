const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');
const { generateServiceReport } = require('../services/pdfService');

// GET /api/admin/users - Get all users
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
    try {
        const usersRes = await db.query(`
            SELECT id, public_id, name, email, role, plan, created_at FROM users
      ORDER BY created_at DESC
    `);
        res.json({ users: usersRes.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// PUT /api/admin/users/:id/role - Promote/demote user
router.put('/users/:id/role', authMiddleware, isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['homeowner', 'service_provider', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }

        const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);

        await db.query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, $2, $3, $4)
    `, [req.params.id, 'Role Updated', `Your account role has been changed to ${role}.`, 'info']);

        const updatedRes = await db.query('SELECT id, name, email, role, plan, created_at FROM users WHERE id = $1',
            [req.params.id]);
        res.json({ user: updatedRes.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user role.' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account.' });
        }

        await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// GET /api/admin/stats - Platform analytics
router.get('/stats', authMiddleware, isAdmin, async (req, res) => {
    try {
        const totalUsersRes = await db.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = parseInt(totalUsersRes.rows[0].count);

        const activeUsersRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role != 'admin'");
        const activeUsers = parseInt(activeUsersRes.rows[0].count);

        const premiumUsersRes = await db.query("SELECT COUNT(*) as count FROM users WHERE plan = 'premium'");
        const premiumUsers = parseInt(premiumUsersRes.rows[0].count);

        const totalPropertiesRes = await db.query('SELECT COUNT(*) as count FROM properties');
        const totalProperties = parseInt(totalPropertiesRes.rows[0].count);

        const totalAppliancesRes = await db.query('SELECT COUNT(*) as count FROM appliances');
        const totalAppliances = parseInt(totalAppliancesRes.rows[0].count);

        const totalServicesRes = await db.query('SELECT COUNT(*) as count FROM service_logs');
        const totalServices = parseInt(totalServicesRes.rows[0].count);

        const totalSchedulesRes = await db.query('SELECT COUNT(*) as count FROM schedules');
        const totalSchedules = parseInt(totalSchedulesRes.rows[0].count);

        const totalProvidersRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'service_provider'");
        const totalProviders = parseInt(totalProvidersRes.rows[0].count);

        const totalRevenueRes = await db.query(`
      SELECT SUM(sl.cost) as total FROM service_logs sl WHERE sl.status = 'completed'
    `);
        const totalRevenue = parseFloat(totalRevenueRes.rows[0].total || 0);

        const expenseByYearRes = await db.query(`
            SELECT EXTRACT(YEAR FROM created_at::date)::text as year, SUM(cost) as total_cost
            FROM service_logs
            WHERE status = 'completed'
            GROUP BY year ORDER BY year DESC
        `);

        const providerPerformanceRes = await db.query(`
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
        `);

        const jobsByMonthRes = await db.query(`
            SELECT TO_CHAR(created_at::date, 'YYYY-MM') as month, COUNT(*) as count
            FROM service_logs
            GROUP BY month ORDER BY month DESC LIMIT 12
        `);

        const usersByRoleRes = await db.query(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `);

        const recentServicesRes = await db.query(`
      SELECT sl.*, a.name as appliance_name, u.name as user_name
      FROM service_logs sl
      JOIN appliances a ON sl.appliance_id = a.id
      LEFT JOIN users u ON sl.user_id = u.id
      ORDER BY sl.created_at DESC LIMIT 10
    `);

        res.json({
            totalUsers, activeUsers, premiumUsers, totalProperties, totalAppliances,
            totalServices, totalVendors: 0, totalSchedules, totalProviders, totalRevenue, subscriptionRevenue: 0,
            expenseByYear: expenseByYearRes.rows, jobsByMonth: jobsByMonthRes.rows, 
            usersByRole: usersByRoleRes.rows, recentServices: recentServicesRes.rows, 
            providerPerformance: providerPerformanceRes.rows
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

router.get('/properties', authMiddleware, isAdmin, async (req, res) => {
    try {
        const propertiesRes = await db.query(`
      SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM appliances WHERE property_id = p.id) as appliance_count
      FROM properties p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.id DESC
    `);
        res.json({ properties: propertiesRes.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch properties.' });
    }
});

router.get('/appliances', authMiddleware, isAdmin, async (req, res) => {
    try {
        const appliancesRes = await db.query(`
      SELECT a.*, p.name as property_name, u.name as owner_name
      FROM appliances a
      JOIN properties p ON a.property_id = p.id
      JOIN users u ON p.user_id = u.id
      ORDER BY a.id DESC
    `);
        res.json({ appliances: appliancesRes.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch appliances.' });
    }
});

router.get('/schedules', authMiddleware, isAdmin, async (req, res) => {
    try {
        const schedulesRes = await db.query(`
      SELECT s.*, a.name as appliance_name, p.name as property_name, u.name as owner_name
      FROM schedules s
      JOIN appliances a ON s.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      JOIN users u ON p.user_id = u.id
      ORDER BY s.next_due ASC
    `);
        res.json({ schedules: schedulesRes.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules.' });
    }
});

// GET /api/admin/subscriptions
router.get('/subscriptions', authMiddleware, isAdmin, async (req, res) => {
    try {
        res.json({ subscriptions: [] }); // Stub since we don't have subscriptions table yet
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscriptions.' });
    }
});

// GET /api/admin/report - Generate platform report PDF
router.get('/report', authMiddleware, isAdmin, async (req, res) => {
    try {
        const servicesRes = await db.query(`
        SELECT sl.created_at as date, a.name as appliance, 'Provider' as vendor, sl.status, sl.cost
        FROM service_logs sl
        JOIN appliances a ON sl.appliance_id = a.id
        ORDER BY sl.created_at DESC LIMIT 50
      `);

        const totalServicesRes = await db.query('SELECT COUNT(*) as c FROM service_logs');
        const totalCostRes = await db.query("SELECT SUM(cost) as c FROM service_logs WHERE status='completed'");
        const totalAppliancesRes = await db.query('SELECT COUNT(*) as c FROM appliances');

        const pdfBuffer = await generateServiceReport({
            propertyName: 'Platform Overview',
            period: 'All Time',
            totalServices: totalServicesRes.rows[0].c,
            totalCost: parseFloat(totalCostRes.rows[0].c || 0).toFixed(2),
            totalAppliances: totalAppliancesRes.rows[0].c,
            services: servicesRes.rows
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=platform_report.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Report gen error:', error);
        res.status(500).json({ error: 'Failed to generate report.' });
    }
});

module.exports = router;
