const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, JPG, and PNG files are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// GET /api/documents
router.get('/', authMiddleware, (req, res) => {
    try {
        const { appliance_id, service_log_id } = req.query;
        let query = `
      SELECT d.*, a.name as appliance_name
      FROM documents d
      LEFT JOIN appliances a ON d.appliance_id = a.id
      WHERE d.user_id = ?
    `;
        const params = [req.user.id];

        if (req.user.role === 'admin') {
            query = `
        SELECT d.*, a.name as appliance_name, u.name as uploader_name
        FROM documents d
        LEFT JOIN appliances a ON d.appliance_id = a.id
        LEFT JOIN users u ON d.user_id = u.id
        WHERE 1=1
      `;
            params.length = 0;
        }

        if (appliance_id) { query += ' AND d.appliance_id = ?'; params.push(appliance_id); }
        if (service_log_id) { query += ' AND d.service_log_id = ?'; params.push(service_log_id); }

        query += ' ORDER BY d.uploaded_at DESC';
        const documents = db.prepare(query).all(...params);
        res.json({ documents });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch documents.' });
    }
});

// POST /api/documents/upload
router.post('/upload', authMiddleware, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
                }
                return res.status(400).json({ error: err.message });
            }
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        try {
            const { appliance_id, service_log_id, type } = req.body;
            const docType = type || 'general';

            const result = db.prepare(`
        INSERT INTO documents (appliance_id, service_log_id, type, filename, filepath, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
                appliance_id || null, service_log_id || null, docType,
                req.file.originalname, req.file.filename, req.user.id
            );

            const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
            res.status(201).json({ document });
        } catch (error) {
            console.error('Document upload error:', error);
            res.status(500).json({ error: 'Failed to save document.' });
        }
    });
});

// GET /api/documents/download/:id
router.get('/download/:id', authMiddleware, (req, res) => {
    try {
        const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
        if (!document) {
            return res.status(404).json({ error: 'Document not found.' });
        }

        if (document.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const filePath = path.join(__dirname, '..', 'uploads', document.filepath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk.' });
        }

        res.download(filePath, document.filename);
    } catch (error) {
        res.status(500).json({ error: 'Failed to download document.' });
    }
});

// DELETE /api/documents/:id
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
        if (!document) {
            return res.status(404).json({ error: 'Document not found.' });
        }

        if (document.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        // Delete file from disk
        const filePath = path.join(__dirname, '..', 'uploads', document.filepath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
        res.json({ message: 'Document deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete document.' });
    }
});

module.exports = router;
