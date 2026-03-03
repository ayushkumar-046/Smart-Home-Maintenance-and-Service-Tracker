const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/notifications
router.get('/', authMiddleware, (req, res) => {
    try {
        const notifications = db.prepare(`
      SELECT * FROM notifications WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(req.user.id);

        const unreadCount = db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
        ).get(req.user.id);

        res.json({ notifications, unreadCount: unreadCount.count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authMiddleware, (req, res) => {
    try {
        db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
            .run(req.params.id, req.user.id);
        res.json({ message: 'Notification marked as read.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification.' });
    }
});

// PUT /api/notifications/read-all
router.put('/read-all', authMiddleware, (req, res) => {
    try {
        db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
        res.json({ message: 'All notifications marked as read.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notifications.' });
    }
});

// DELETE /api/notifications/:id
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')
            .run(req.params.id, req.user.id);
        res.json({ message: 'Notification deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete notification.' });
    }
});

module.exports = router;
