require('dotenv').config();
const db = require('../db');

try {
    db.initDatabase();
    console.info('Database schema ensured and seed data verified.');
} catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
}