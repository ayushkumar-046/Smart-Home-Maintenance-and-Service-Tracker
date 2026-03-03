const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { isHomeowner } = require('../middleware/roleCheck');
const aiService = require('../services/aiService');

// Middleware to check premium plan
function requirePremium(req, res, next) {
    const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
    if (user.plan !== 'premium' && req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'AI features require a Premium subscription.',
            upgrade_required: true
        });
    }
    next();
}

// POST /api/ai/predict - Predictive Maintenance
router.post('/predict', authMiddleware, requirePremium, async (req, res) => {
    try {
        const { appliance_id } = req.body;
        if (!appliance_id) {
            return res.status(400).json({ error: 'Appliance ID is required.' });
        }

        const appliance = db.prepare(`
      SELECT a.*, p.user_id FROM appliances a
      JOIN properties p ON a.property_id = p.id
      WHERE a.id = ?
    `).get(appliance_id);

        if (!appliance) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }

        const serviceHistory = db.prepare(`
      SELECT * FROM service_logs WHERE appliance_id = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(appliance_id);

        const result = await aiService.predictMaintenance({
            ...appliance,
            service_history: serviceHistory
        });

        res.json(result);
    } catch (error) {
        console.error('AI predict error:', error);
        res.status(500).json({ error: 'AI prediction failed.' });
    }
});

// POST /api/ai/cost-forecast - Cost Forecast
router.post('/cost-forecast', authMiddleware, requirePremium, async (req, res) => {
    try {
        const { appliance_id } = req.body;
        if (!appliance_id) {
            return res.status(400).json({ error: 'Appliance ID is required.' });
        }

        const appliance = db.prepare('SELECT * FROM appliances WHERE id = ?').get(appliance_id);
        if (!appliance) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }

        const costs = db.prepare(`
      SELECT cost FROM service_logs WHERE appliance_id = ? AND status = 'completed' AND cost > 0
    `).all(appliance_id).map(c => c.cost);

        const purchaseDate = appliance.purchase_date ? new Date(appliance.purchase_date) : new Date();
        const ageYears = Math.round((Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;

        const result = await aiService.costForecast({
            category: appliance.category,
            age_years: ageYears,
            past_costs: costs
        });

        res.json(result);
    } catch (error) {
        console.error('AI cost forecast error:', error);
        res.status(500).json({ error: 'Cost forecast failed.' });
    }
});

// POST /api/ai/anomaly - Anomaly Detection
router.post('/anomaly', authMiddleware, requirePremium, async (req, res) => {
    try {
        const { appliance_id } = req.body;
        if (!appliance_id) {
            return res.status(400).json({ error: 'Appliance ID is required.' });
        }

        const serviceLogs = db.prepare(`
      SELECT * FROM service_logs WHERE appliance_id = ?
      ORDER BY scheduled_date DESC
    `).all(appliance_id);

        const result = await aiService.detectAnomalies(serviceLogs);
        res.json(result);
    } catch (error) {
        console.error('AI anomaly error:', error);
        res.status(500).json({ error: 'Anomaly detection failed.' });
    }
});

// POST /api/ai/recommend-vendor - Vendor Recommendation
router.post('/recommend-vendor', authMiddleware, requirePremium, async (req, res) => {
    try {
        const { category } = req.body;
        if (!category) {
            return res.status(400).json({ error: 'Category is required.' });
        }

        const vendors = db.prepare('SELECT * FROM vendors WHERE category = ?').all(category);
        if (vendors.length === 0) {
            return res.status(404).json({ error: 'No vendors found for this category.' });
        }

        const result = await aiService.recommendVendor({ category, vendors });
        res.json(result);
    } catch (error) {
        console.error('AI vendor rec error:', error);
        res.status(500).json({ error: 'Vendor recommendation failed.' });
    }
});

// POST /api/ai/optimize - Lifespan Optimization
router.post('/optimize', authMiddleware, requirePremium, async (req, res) => {
    try {
        const { appliance_id } = req.body;
        if (!appliance_id) {
            return res.status(400).json({ error: 'Appliance ID is required.' });
        }

        const appliance = db.prepare('SELECT * FROM appliances WHERE id = ?').get(appliance_id);
        if (!appliance) {
            return res.status(404).json({ error: 'Appliance not found.' });
        }

        const serviceHistory = db.prepare(`
      SELECT * FROM service_logs WHERE appliance_id = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(appliance_id);

        const purchaseDate = appliance.purchase_date ? new Date(appliance.purchase_date) : new Date();
        const ageYears = Math.round((Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;

        const result = await aiService.optimizeLifespan({
            name: appliance.name,
            category: appliance.category,
            age_years: ageYears,
            lifecycle_stage: appliance.lifecycle_stage,
            service_history: serviceHistory
        });

        res.json(result);
    } catch (error) {
        console.error('AI optimize error:', error);
        res.status(500).json({ error: 'Lifespan optimization failed.' });
    }
});

module.exports = router;
