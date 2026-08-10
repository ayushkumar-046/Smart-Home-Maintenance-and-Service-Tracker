require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const users = await pool.query('SELECT id, email, role FROM users');
    console.log(`Users: ${users.rowCount}`);
    
    const props = await pool.query('SELECT * FROM properties');
    console.log(`Properties: ${props.rowCount}`);
    
    const apps = await pool.query('SELECT * FROM appliances');
    console.log(`Appliances: ${apps.rowCount}`);
    
    const logs = await pool.query('SELECT * FROM service_logs');
    console.log(`Service Logs: ${logs.rowCount}`);
    
    const alice = users.rows.find(u => u.email === 'alice.smith@example.com');
    if (alice) {
      console.log('Alice ID:', alice.id);
      const aliceProps = props.rows.filter(p => p.user_id == alice.id);
      console.log('Alice Props:', aliceProps.length);
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

check();
