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
    { name: "System Admin", email: "admin@smarthome.com", pass: "Admin@123", role: "admin" }
  ];

  const homeownerProfiles = [
    { name: "Alice Smith", email: "alice.smith@example.com" },
    { name: "Bob Jones", email: "bob.jones@example.com" },
    { name: "Carol White", email: "carol.white@example.com" },
    { name: "David Brown", email: "david.brown@example.com" },
    { name: "Emma Davis", email: "emma.davis@example.com" },
    { name: "Frank Wilson", email: "frank.wilson@example.com" },
    { name: "Grace Taylor", email: "grace.taylor@example.com" },
    { name: "Henry Moore", email: "henry.moore@example.com" },
    { name: "Ivy Clark", email: "ivy.clark@example.com" },
    { name: "Jack Evans", email: "jack.evans@example.com" }
  ];

  const providerProfiles = [
    { name: "Paul (Plumbing)", email: "paul.plumbing@example.com" },
    { name: "Sarah (Electrical)", email: "sarah.electrical@example.com" },
    { name: "Mike (HVAC)", email: "mike.hvac@example.com" },
    { name: "Tom (Contracting)", email: "tom.contracting@example.com" },
    { name: "Linda (Cleaning)", email: "linda.cleaning@example.com" },
    { name: "Gary (Fix-It)", email: "gary.fixit@example.com" },
    { name: "Rosa (Painting)", email: "rosa.painting@example.com" },
    { name: "Kevin (Roofing)", email: "kevin.roofing@example.com" },
    { name: "Steve (Security)", email: "steve.security@example.com" },
    { name: "Anita (Tech Support)", email: "anita.tech@example.com" }
  ];

  for (let p of homeownerProfiles) {
    users.push({ ...p, pass: "Homeowner@123", role: "homeowner" });
  }

  for (let p of providerProfiles) {
    users.push({ ...p, pass: "Provider@123", role: "service_provider" });
  }

  const insertedUsers = [];

  for (let u of users) {
    const publicId = (u.role === 'admin' ? 'ADM' : u.role === 'service_provider' ? 'PRV' : 'HOM') + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const res = await pool.query(
      `INSERT INTO users(public_id, name, email, password_hash, role)
       VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [publicId, u.name, u.email, hash(u.pass), u.role]
    );
    insertedUsers.push({ id: res.rows[0].id, role: u.role, name: u.name });
  }

  const homeowners = insertedUsers.filter(u => u.role === 'homeowner');
  const providers = insertedUsers.filter(u => u.role === 'service_provider');

  // ---- PROPERTIES + APPLIANCES ----
  for (let i = 0; i < homeowners.length; i++) {
    const home = homeowners[i];
    
    // Add 1 or 2 properties
    const numProps = i % 3 === 0 ? 2 : 1;
    for (let pIdx = 0; pIdx < numProps; pIdx++) {
      const propTypes = ["House", "Apartment", "Condo", "Vacation Home"];
      const propType = propTypes[(i + pIdx) % propTypes.length];
      
      const prop = await pool.query(
        `INSERT INTO properties(user_id,name,address,type,size_sqft)
         VALUES($1,$2,$3,$4,$5) RETURNING id`,
        [home.id, `${home.name.split(' ')[0]}'s ${propType}`, `10${i}${pIdx} Main St, Cityville`, propType, 1200 + (i * 100)]
      );

      const propertyId = prop.rows[0].id;

      // Add 2 appliances per property
      const appliancesList = [
        { name: "HVAC System", category: "Heating/Cooling", brand: "Carrier", model: "Infinity" },
        { name: "Refrigerator", category: "Kitchen", brand: "Samsung", model: "Bespoke" },
        { name: "Water Heater", category: "Plumbing", brand: "Rheem", model: "ProG" },
        { name: "Washing Machine", category: "Laundry", brand: "LG", model: "ThinQ" }
      ];

      for (let aIdx = 0; aIdx < 2; aIdx++) {
        const appInfo = appliancesList[(i + aIdx) % appliancesList.length];
        const app = await pool.query(
          `INSERT INTO appliances(property_id,name,category,brand,model,condition)
           VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
          [propertyId, appInfo.name, appInfo.category, appInfo.brand, appInfo.model, aIdx === 0 ? "good" : "fair"]
        );

        const applianceId = app.rows[0].id;

        // Schedule
        const provider = providers[(i + aIdx) % providers.length];
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + (15 * (aIdx + 1))); // Future dates
        
        await pool.query(
          `INSERT INTO schedules(appliance_id,provider_id,next_due,frequency_days)
           VALUES($1,$2,$3,$4)`,
          [applianceId, provider.id, nextDue.toISOString().split('T')[0], 90 + (aIdx * 30)]
        );

        // Service Log (Past)
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - (30 * (aIdx + 1)));
        
        const service = await pool.query(
          `INSERT INTO service_logs(appliance_id,user_id,provider_id,status,cost,created_at)
           VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
          [applianceId, home.id, provider.id, "completed", 150 + (i * 20), pastDate.toISOString()]
        );

        // Feedback
        await pool.query(
          `INSERT INTO feedback(service_log_id,homeowner_id,rating,comment)
           VALUES($1,$2,$3,$4)`,
          [service.rows[0].id, home.id, 4 + (i % 2), "Great professional service!"]
        );
      }
    }

    // Notifications
    await pool.query(
      `INSERT INTO notifications(user_id,title,message,type)
       VALUES($1,$2,$3,$4)`,
      [home.id, "Welcome!", "Welcome to Smart Home Tracker! Your profile is set up.", "info"]
    );
  }

  // Provider Notifications
  for (let i = 0; i < providers.length; i++) {
     await pool.query(
      `INSERT INTO notifications(user_id,title,message,type)
       VALUES($1,$2,$3,$4)`,
      [providers[i].id, "Profile Active", "Your service provider profile is live and receiving jobs.", "success"]
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