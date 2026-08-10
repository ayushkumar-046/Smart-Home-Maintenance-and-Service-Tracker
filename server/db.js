const { pool, initDatabase } = require('./config/database');

// Export pool as the default (backward compatible with all route files using db.query)
module.exports = pool;
module.exports.initDatabase = initDatabase;