require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../db');
const pool = db;
const initDatabase = db.initDatabase;

async function reseed() {
    try {
        console.log("Dropping existing tables...");
        await pool.query(`
            DROP TABLE IF EXISTS documents CASCADE;
            DROP TABLE IF EXISTS feedback CASCADE;
            DROP TABLE IF EXISTS notifications CASCADE;
            DROP TABLE IF EXISTS service_logs CASCADE;
            DROP TABLE IF EXISTS schedules CASCADE;
            DROP TABLE IF EXISTS appliances CASCADE;
            DROP TABLE IF EXISTS properties CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `);
        console.log("✅ Tables dropped.");
        
        console.log("Re-initializing database...");
        await initDatabase();
        
        console.log("🎉 Database successfully re-seeded!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Reseed error:", err);
        process.exit(1);
    }
}

reseed();
