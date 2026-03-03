const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('homeowner', 'service_provider', 'admin')),
    plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'premium')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appliances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    purchase_date TEXT,
    warranty_expiry TEXT,
    lifecycle_stage TEXT DEFAULT 'active' CHECK(lifecycle_stage IN ('new', 'active', 'aging', 'end_of_life')),
    notes TEXT,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    rating REAL DEFAULT 0,
    total_jobs INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS service_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appliance_id INTEGER NOT NULL,
    vendor_id INTEGER,
    user_id INTEGER,
    provider_id INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    scheduled_date TEXT,
    completed_date TEXT,
    cost REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appliance_id) REFERENCES appliances(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appliance_id INTEGER NOT NULL,
    frequency_days INTEGER NOT NULL DEFAULT 90,
    last_service TEXT,
    next_due TEXT,
    reminder_days_before INTEGER DEFAULT 7,
    FOREIGN KEY (appliance_id) REFERENCES appliances(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appliance_id INTEGER,
    service_log_id INTEGER,
    type TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY (appliance_id) REFERENCES appliances(id) ON DELETE SET NULL,
    FOREIGN KEY (service_log_id) REFERENCES service_logs(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL DEFAULT 'premium',
    stripe_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'expired', 'payment_failed')),
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_log_id INTEGER NOT NULL,
    homeowner_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_log_id) REFERENCES service_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (homeowner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS service_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
  );
`);

// Seed data function
function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) return; // Already seeded

  // Create seed users
  const adminHash = bcrypt.hashSync('Admin@123', 12);
  const homeownerHash = bcrypt.hashSync('Home@123', 12);
  const providerHash = bcrypt.hashSync('Provider@123', 12);

  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, plan) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('Admin User', 'admin@smarthome.com', adminHash, 'admin', 'premium');
  insertUser.run('John Homeowner', 'homeowner@smarthome.com', homeownerHash, 'homeowner', 'premium');
  insertUser.run('Jane Provider', 'provider@smarthome.com', providerHash, 'service_provider', 'free');
  insertUser.run('Mike Wilson', 'mike@smarthome.com', bcrypt.hashSync('Mike@123', 12), 'homeowner', 'free');
  insertUser.run('Priya Sharma', 'priya@smarthome.com', bcrypt.hashSync('Priya@123', 12), 'homeowner', 'premium');
  insertUser.run('Rahul Technician', 'rahul@smarthome.com', bcrypt.hashSync('Rahul@123', 12), 'service_provider', 'free');

  // Seed service categories
  const insertCategory = db.prepare('INSERT OR IGNORE INTO service_categories (name, description) VALUES (?, ?)');
  insertCategory.run('Appliance Maintenance', 'Air conditioners, refrigerators, washing machines');
  insertCategory.run('Utility Services', 'Plumbing, electrical, water tank cleaning');
  insertCategory.run('Home Infrastructure Care', 'Painting, pest control, roofing inspections');
  insertCategory.run('Home Security', 'CCTV, alarm systems, smart lock maintenance');
  insertCategory.run('Cleaning Services', 'Deep cleaning, carpet, upholstery');

  // Seed properties
  const insertProperty = db.prepare('INSERT INTO properties (user_id, name, address, type) VALUES (?, ?, ?, ?)');
  insertProperty.run(2, 'Main Residence', '123 Oak Street, Springfield, IL 62701', 'House');
  insertProperty.run(2, 'Beach House', '456 Coastal Blvd, Malibu, CA 90265', 'Vacation Home');
  insertProperty.run(4, 'City Apartment', '789 Downtown Ave, Apt 12B, Chicago, IL 60601', 'Apartment');
  insertProperty.run(5, 'Priya Villa', '42 MG Road, Koramangala, Bangalore 560034', 'Villa');
  insertProperty.run(5, 'Lake View Flat', '15 Marine Drive, Marine Lines, Mumbai 400020', 'Apartment');

  // Seed vendors (14 vendors)
  const insertVendor = db.prepare('INSERT INTO vendors (name, category, phone, email, rating, total_jobs) VALUES (?, ?, ?, ?, ?, ?)');
  insertVendor.run('CoolAir HVAC Services', 'Appliance Maintenance', '555-0101', 'info@coolair.com', 4.5, 156);
  insertVendor.run('QuickFix Plumbing', 'Utility Services', '555-0102', 'jobs@quickfix.com', 4.2, 89);
  insertVendor.run('SparkElectric Co.', 'Utility Services', '555-0103', 'hello@sparkelectric.com', 4.7, 210);
  insertVendor.run('FreshCoat Painters', 'Home Infrastructure Care', '555-0104', 'book@freshcoat.com', 4.0, 67);
  insertVendor.run('PestShield Solutions', 'Home Infrastructure Care', '555-0105', 'schedule@pestshield.com', 4.8, 134);
  insertVendor.run('AppliancePro Repairs', 'Appliance Maintenance', '555-0106', 'repair@appliancepro.com', 4.3, 98);
  insertVendor.run('SmartGuard Security', 'Home Security', '555-0107', 'secure@smartguard.com', 4.6, 175);
  insertVendor.run('DeepClean Pros', 'Cleaning Services', '555-0108', 'book@deepcleanpros.com', 4.4, 220);
  insertVendor.run('AquaPure Water Services', 'Utility Services', '555-0109', 'info@aquapure.com', 4.1, 112);
  insertVendor.run('GreenLawn Landscaping', 'Home Infrastructure Care', '555-0110', 'hello@greenlawn.com', 4.5, 88);
  insertVendor.run('SafeHome Fire Systems', 'Home Security', '555-0111', 'safety@safehome.com', 4.9, 145);
  insertVendor.run('RoofMasters India', 'Home Infrastructure Care', '555-0112', 'fix@roofmasters.in', 4.3, 76);
  insertVendor.run('Voltas AC Service', 'Appliance Maintenance', '555-0113', 'service@voltas.in', 4.6, 315);
  insertVendor.run('Urban Company', 'Cleaning Services', '555-0114', 'support@urbancompany.com', 4.7, 520);

  // Seed appliances for property 1 (Main Residence - John)
  const insertAppliance = db.prepare('INSERT INTO appliances (property_id, name, category, brand, model, purchase_date, warranty_expiry, lifecycle_stage, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertAppliance.run(1, 'Central AC Unit', 'Appliance Maintenance', 'Carrier', 'Infinity 24ANB1', '2022-06-15', '2027-06-15', 'active', 'Main floor cooling system');
  insertAppliance.run(1, 'Refrigerator', 'Appliance Maintenance', 'Samsung', 'RF28T5001SR', '2023-01-20', '2026-01-20', 'active', 'Smart French Door model');
  insertAppliance.run(1, 'Water Heater', 'Utility Services', 'Rheem', 'PROG50-38N', '2021-03-10', '2027-03-10', 'active', '50 gallon tank');
  insertAppliance.run(1, 'Washing Machine', 'Appliance Maintenance', 'LG', 'WM4000HWA', '2023-05-05', '2026-05-05', 'active', 'Front load washer');
  insertAppliance.run(1, 'Roof System', 'Home Infrastructure Care', 'GAF', 'Timberline HDZ', '2019-08-20', '2044-08-20', 'active', 'Asphalt shingle roof');
  insertAppliance.run(1, 'Microwave Oven', 'Appliance Maintenance', 'Samsung', 'ME21R7051SS', '2023-08-10', '2026-08-10', 'active', 'Over the range microwave');
  insertAppliance.run(1, 'Dishwasher', 'Appliance Maintenance', 'Bosch', 'SHPM88Z75N', '2022-11-15', '2025-11-15', 'aging', 'Built-in dishwasher');
  insertAppliance.run(1, 'Home Security System', 'Home Security', 'Ring', 'Alarm Pro', '2024-01-10', '2027-01-10', 'new', '8 cameras + alarm panel');
  insertAppliance.run(1, 'Water Purifier', 'Utility Services', 'Kent', 'Grand Plus', '2023-06-01', '2026-06-01', 'active', 'RO+UV+UF water purifier');

  // Seed appliances for property 2 (Beach House - John)
  insertAppliance.run(2, 'Mini Split AC', 'Appliance Maintenance', 'Mitsubishi', 'MSZ-GL09NA', '2023-07-01', '2028-07-01', 'new', 'Bedroom unit');
  insertAppliance.run(2, 'Plumbing System', 'Utility Services', 'Various', 'N/A', '2020-01-01', '2025-12-31', 'aging', 'Full house plumbing');
  insertAppliance.run(2, 'Solar Water Heater', 'Utility Services', 'Havells', 'Solero 200L', '2024-03-15', '2029-03-15', 'new', 'Roof-mounted solar heater');

  // Seed appliances for property 3 (City Apartment - Mike)
  insertAppliance.run(3, 'Window AC', 'Appliance Maintenance', 'Friedrich', 'CCF05A10A', '2024-04-15', '2026-04-15', 'new', 'Living room unit');
  insertAppliance.run(3, 'Gas Stove', 'Appliance Maintenance', 'Prestige', 'Svachh Duo', '2023-02-20', '2026-02-20', 'active', '3 burner gas stove');

  // Seed appliances for property 4 (Priya Villa)
  insertAppliance.run(4, 'Split AC - Master Bedroom', 'Appliance Maintenance', 'Daikin', 'FTKF50TV', '2023-04-10', '2028-04-10', 'active', '1.5 ton inverter AC');
  insertAppliance.run(4, 'Geyser', 'Utility Services', 'Bajaj', 'New Shakti 25L', '2022-12-01', '2025-12-01', 'aging', '25 litre storage water heater');
  insertAppliance.run(4, 'Chimney', 'Appliance Maintenance', 'Elica', 'WDFL 606 HAC', '2024-01-15', '2027-01-15', 'new', 'Auto-clean kitchen chimney');
  insertAppliance.run(4, 'CCTV System', 'Home Security', 'HikVision', 'DS-2CE72', '2023-10-20', '2026-10-20', 'active', '6 camera home surveillance');
  insertAppliance.run(4, 'Inverter Battery', 'Utility Services', 'Luminous', 'Red Charge RC 18000', '2022-05-15', '2025-05-15', 'aging', '150Ah tubular battery');

  // Seed appliances for property 5 (Lake View Flat - Priya)
  insertAppliance.run(5, 'Window AC - Hall', 'Appliance Maintenance', 'Voltas', '185V ADS', '2024-06-01', '2029-06-01', 'new', '1.5 ton 5 star window AC');
  insertAppliance.run(5, 'Washing Machine', 'Appliance Maintenance', 'IFB', 'Senator Plus SXS 7Kg', '2023-09-10', '2026-09-10', 'active', 'Front load fully automatic');

  // Seed service logs (28+ service entries)
  const insertService = db.prepare('INSERT INTO service_logs (appliance_id, vendor_id, user_id, provider_id, status, scheduled_date, completed_date, cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  // John's completed services
  insertService.run(1, 1, 2, 3, 'completed', '2025-06-15', '2025-06-15', 2500.00, 'Annual AC maintenance and filter replacement');
  insertService.run(1, 1, 2, 3, 'completed', '2025-12-01', '2025-12-03', 1800.00, 'Winter pre-season check');
  insertService.run(2, 6, 2, 3, 'completed', '2025-09-10', '2025-09-10', 1200.00, 'Condenser coil cleaning');
  insertService.run(3, 2, 2, 3, 'completed', '2025-07-20', '2025-07-22', 3500.00, 'Anode rod replacement');
  insertService.run(4, 6, 2, 3, 'completed', '2025-11-05', '2025-11-05', 950.00, 'Drum cleaning and filter check');
  insertService.run(6, 6, 2, 3, 'completed', '2025-10-08', '2025-10-08', 650.00, 'Microwave magnetron check');
  insertService.run(7, 6, 2, 3, 'completed', '2025-08-20', '2025-08-22', 1800.00, 'Dishwasher pump motor repair');
  insertService.run(9, 9, 2, 3, 'completed', '2025-09-25', '2025-09-25', 1500.00, 'Water purifier filter replacement and service');
  insertService.run(11, 2, 2, 3, 'completed', '2025-10-15', '2025-10-16', 4500.00, 'Emergency pipe repair');
  insertService.run(12, 9, 2, 6, 'completed', '2025-12-10', '2025-12-10', 800.00, 'Solar heater descaling');
  // John's active/upcoming services
  insertService.run(1, 1, 2, 3, 'scheduled', '2026-06-15', null, 0, 'Upcoming annual AC maintenance');
  insertService.run(3, 2, 2, 3, 'in_progress', '2026-02-28', null, 0, 'Water heater annual flush');
  insertService.run(5, 4, 2, 3, 'scheduled', '2026-04-01', null, 0, 'Roof inspection before spring');
  insertService.run(8, 7, 2, 6, 'scheduled', '2026-03-20', null, 0, 'Security system firmware update and camera check');
  insertService.run(7, 6, 2, 3, 'scheduled', '2026-04-15', null, 0, 'Dishwasher annual deep clean');
  insertService.run(2, 6, 2, 3, 'in_progress', '2026-03-01', null, 0, 'Refrigerator compressor noise investigation');
  // Mike's services
  insertService.run(13, 1, 4, 3, 'scheduled', '2026-03-15', null, 0, 'AC pre-summer checkup');
  insertService.run(14, 6, 4, 6, 'completed', '2025-11-20', '2025-11-20', 750.00, 'Gas stove burner replacement');
  insertService.run(13, 1, 4, 6, 'completed', '2025-08-10', '2025-08-12', 1200.00, 'AC gas refill and filter cleaning');
  // Priya's services
  insertService.run(15, 13, 5, 3, 'completed', '2025-10-05', '2025-10-05', 1800.00, 'Split AC annual maintenance');
  insertService.run(16, 9, 5, 6, 'completed', '2025-09-15', '2025-09-16', 2200.00, 'Geyser element replacement');
  insertService.run(17, 6, 5, 3, 'completed', '2025-11-12', '2025-11-12', 1500.00, 'Chimney filter deep clean');
  insertService.run(18, 7, 5, 6, 'completed', '2025-12-05', '2025-12-05', 3500.00, 'CCTV DVR upgrade and cable repair');
  insertService.run(19, 3, 5, 3, 'completed', '2025-10-25', '2025-10-26', 4500.00, 'Inverter battery replacement');
  insertService.run(20, 13, 5, 6, 'scheduled', '2026-04-05', null, 0, 'AC pre-summer maintenance');
  insertService.run(21, 14, 5, 6, 'scheduled', '2026-03-10', null, 0, 'Washing machine deep clean service');
  insertService.run(15, 13, 5, 3, 'in_progress', '2026-03-02', null, 0, 'Split AC gas top-up');
  insertService.run(16, 9, 5, 6, 'scheduled', '2026-03-25', null, 0, 'Geyser annual descaling');

  // Seed schedules
  const insertSchedule = db.prepare('INSERT INTO schedules (appliance_id, frequency_days, last_service, next_due, reminder_days_before) VALUES (?, ?, ?, ?, ?)');
  insertSchedule.run(1, 180, '2025-12-03', '2026-06-01', 7);
  insertSchedule.run(2, 365, '2025-09-10', '2026-09-10', 14);
  insertSchedule.run(3, 365, '2025-07-22', '2026-07-20', 7);
  insertSchedule.run(4, 90, '2025-11-05', '2026-02-03', 3);
  insertSchedule.run(5, 365, null, '2026-04-01', 14);
  insertSchedule.run(6, 180, '2025-10-08', '2026-04-08', 7);
  insertSchedule.run(7, 180, '2025-08-22', '2026-02-22', 7);
  insertSchedule.run(8, 365, null, '2027-01-10', 14);
  insertSchedule.run(9, 90, '2025-09-25', '2025-12-25', 5);
  insertSchedule.run(15, 180, '2025-10-05', '2026-04-05', 7);
  insertSchedule.run(16, 365, '2025-09-16', '2026-09-15', 14);
  insertSchedule.run(18, 365, '2025-12-05', '2026-12-05', 14);

  // Seed subscriptions
  const insertSub = db.prepare('INSERT INTO subscriptions (user_id, plan, stripe_session_id, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)');
  insertSub.run(2, 'premium', 'cs_test_seed_session_001', 'active', '2025-12-01', '2026-12-01');
  insertSub.run(5, 'premium', 'cs_test_seed_session_002', 'active', '2026-01-15', '2027-01-15');

  // Seed notifications
  const insertNotif = db.prepare('INSERT INTO notifications (user_id, title, message, type, read) VALUES (?, ?, ?, ?, ?)');
  insertNotif.run(2, 'Service Completed', 'Your AC maintenance has been completed successfully.', 'success', 1);
  insertNotif.run(2, 'Upcoming Service', 'Your water heater flush is scheduled for Feb 28, 2026.', 'reminder', 0);
  insertNotif.run(2, 'Warranty Expiring', 'Your Samsung Refrigerator warranty expires on Jan 20, 2026.', 'warning', 0);
  insertNotif.run(2, 'Roof Inspection', 'Roof inspection scheduled for April 1, 2026.', 'info', 0);
  insertNotif.run(2, 'Dishwasher Aging', 'Your Bosch Dishwasher is nearing end of warranty. Consider an extended warranty.', 'warning', 0);
  insertNotif.run(2, 'Security Update', 'Your Ring Alarm Pro has a pending firmware update. Schedule a tech visit.', 'info', 0);
  insertNotif.run(2, 'Monthly Report', 'Your March 2026 maintenance report is ready. Total spend: ₹8,450.', 'info', 0);
  insertNotif.run(3, 'New Job Assigned', 'You have been assigned a new AC maintenance job for John Homeowner.', 'info', 0);
  insertNotif.run(3, 'Job Completed', 'Your roof inspection job has been marked as completed. Rating: ⭐⭐⭐⭐⭐', 'success', 1);
  insertNotif.run(3, 'New Request', 'New service request: Dishwasher deep clean scheduled for April 15.', 'info', 0);
  insertNotif.run(3, 'Payment Received', 'Payment of ₹1,800 received for Split AC maintenance.', 'success', 0);
  insertNotif.run(4, 'Welcome!', 'Welcome to Smart Home Tracker. Add your first property to get started.', 'info', 0);
  insertNotif.run(5, 'Battery Alert', 'Your Luminous inverter battery is aging. Consider a replacement soon.', 'warning', 0);
  insertNotif.run(5, 'Service Due', 'AC pre-summer maintenance is scheduled for April 5, 2026.', 'reminder', 0);
  insertNotif.run(6, 'New Job', 'You have been assigned a washing machine service for Priya Sharma.', 'info', 0);
  insertNotif.run(6, 'Job Completed', 'Geyser element replacement completed. Great work!', 'success', 1);

  // Seed feedback
  const insertFeedback = db.prepare('INSERT INTO feedback (service_log_id, homeowner_id, rating, comment) VALUES (?, ?, ?, ?)');
  insertFeedback.run(1, 2, 5, 'Excellent service! Very thorough and professional.');
  insertFeedback.run(3, 2, 4, 'Good job on the cleaning, arrived on time.');
  insertFeedback.run(4, 2, 4, 'Fixed the issue quickly. A bit pricey though.');
  insertFeedback.run(5, 2, 5, 'Great attention to detail. Machine runs like new.');
  insertFeedback.run(6, 2, 4, 'Quick microwave check, found no issues.');
  insertFeedback.run(7, 2, 3, 'Took longer than expected but the dishwasher works fine now.');
  insertFeedback.run(9, 2, 5, 'Emergency plumbing handled fast and efficiently. Lifesaver!');
  insertFeedback.run(20, 5, 5, 'Daikin AC running perfectly after service. Highly recommend!');
  insertFeedback.run(21, 5, 4, 'Geyser works great now. Technician was knowledgeable.');
  insertFeedback.run(22, 5, 5, 'Chimney is sparkling clean. Excellent work.');
  insertFeedback.run(23, 5, 4, 'CCTV system upgraded smoothly. Good job.');
  insertFeedback.run(18, 4, 5, 'Gas stove burner replaced. Works like new!');

  console.log('✅ Database seeded successfully');
}

seedDatabase();

module.exports = db;
