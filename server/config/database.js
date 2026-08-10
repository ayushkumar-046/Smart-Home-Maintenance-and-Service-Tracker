const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ================= DB CONNECTION =================
const isProduction = process.env.NODE_ENV === 'production';
const dbUrl = process.env.DATABASE_URL || '';

const poolConfig = {
  connectionString: dbUrl,
};

// Only enable SSL for production or when the connection string requires it
if (isProduction || dbUrl.includes('sslmode=require')) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Connection Error:", err));


// ================= SCHEMA =================
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      public_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK (role IN ('homeowner','service_provider','admin')),
      plan TEXT DEFAULT 'free',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS properties (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT,
      address TEXT,
      type TEXT,
      size_sqft INTEGER
    );

    CREATE TABLE IF NOT EXISTS appliances (
      id BIGSERIAL PRIMARY KEY,
      property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
      name TEXT,
      category TEXT,
      brand TEXT,
      model TEXT,
      condition TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id BIGSERIAL PRIMARY KEY,
      appliance_id BIGINT REFERENCES appliances(id) ON DELETE CASCADE,
      provider_id BIGINT REFERENCES users(id),
      next_due TEXT,
      frequency_days INTEGER
    );

    CREATE TABLE IF NOT EXISTS service_logs (
      id BIGSERIAL PRIMARY KEY,
      appliance_id BIGINT REFERENCES appliances(id),
      user_id BIGINT REFERENCES users(id),
      provider_id BIGINT REFERENCES users(id),
      status TEXT,
      cost REAL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id),
      title TEXT,
      message TEXT,
      type TEXT,
      read BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id BIGSERIAL PRIMARY KEY,
      service_log_id BIGINT REFERENCES service_logs(id),
      homeowner_id BIGINT REFERENCES users(id),
      rating INTEGER,
      comment TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id),
      filename TEXT,
      mime_type TEXT,
      file_data BYTEA
    );
  `);

  console.log("✅ Tables created");
}


// ================= SEED DATA =================
async function seedDatabase() {
  const { rows } = await pool.query(`SELECT COUNT(*) FROM users`);
  if (parseInt(rows[0].count) > 0) {
    console.log("✅ DB already seeded");
    return;
  }

  console.log("🌱 Seeding database...");

  const hash = (p) => bcrypt.hashSync(p, 10);

  // ---- USERS ----
  const users = [
    { name: "Admin", email: "admin@smarthome.com", pass: "Admin@123", role: "admin" }
  ];

  for (let i = 1; i <= 10; i++) {
    users.push({
      name: `Homeowner ${i}`,
      email: `homeowner${i}@smarthome.com`,
      pass: `Home@123`,
      role: "homeowner"
    });

    users.push({
      name: `Provider ${i}`,
      email: `provider${i}@smarthome.com`,
      pass: `Provider@123`,
      role: "service_provider"
    });
  }

  const insertedUsers = [];

  for (let u of users) {
    const res = await pool.query(
      `INSERT INTO users(name,email,password_hash,role)
       VALUES($1,$2,$3,$4) RETURNING id`,
      [u.name, u.email, hash(u.pass), u.role]
    );
    insertedUsers.push({ id: res.rows[0].id, role: u.role });
  }

  const homeowners = insertedUsers.filter(u => u.role === 'homeowner');
  const providers = insertedUsers.filter(u => u.role === 'service_provider');

  // ---- PROPERTIES + APPLIANCES ----
  for (let i = 0; i < homeowners.length; i++) {
    const home = homeowners[i];

    const prop = await pool.query(
      `INSERT INTO properties(user_id,name,address,type,size_sqft)
       VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [home.id, `House ${i+1}`, `City ${i}`, "Apartment", 1200]
    );

    const propertyId = prop.rows[0].id;

    const app = await pool.query(
      `INSERT INTO appliances(property_id,name,category,brand,model,condition)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [propertyId, "AC", "Cooling", "LG", "X1", "good"]
    );

    const applianceId = app.rows[0].id;

    // schedule
    await pool.query(
      `INSERT INTO schedules(appliance_id,provider_id,next_due,frequency_days)
       VALUES($1,$2,$3,$4)`,
      [applianceId, providers[i % providers.length].id, "2026-09-01", 90]
    );

    // service log
    const service = await pool.query(
      `INSERT INTO service_logs(appliance_id,user_id,provider_id,status,cost)
       VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [applianceId, home.id, providers[i % providers.length].id, "completed", 1500]
    );

    // feedback
    await pool.query(
      `INSERT INTO feedback(service_log_id,homeowner_id,rating,comment)
       VALUES($1,$2,$3,$4)`,
      [service.rows[0].id, home.id, 4, "Good service"]
    );

    // notifications
    await pool.query(
      `INSERT INTO notifications(user_id,title,message,type)
       VALUES($1,$2,$3,$4)`,
      [home.id, "Service Done", "Your AC service is completed", "success"]
    );

    await pool.query(
      `INSERT INTO notifications(user_id,title,message,type)
       VALUES($1,$2,$3,$4)`,
      [providers[i % providers.length].id, "New Job", "You got a new job", "info"]
    );
  }

  console.log("✅ Seeding completed");
}


// ================= INIT =================
async function initDatabase() {
  await initSchema();
  await seedDatabase();
}


// ================= EXPORT =================
module.exports = { pool, initDatabase };