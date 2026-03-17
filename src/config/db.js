const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: process.env.DATABASE_POOL_MIN ? parseInt(process.env.DATABASE_POOL_MIN) : 2,
  max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX) : 30,
});

pool.on('error', (err, client) => {
  console.error('❌ [DB ERROR] Unexpected error on idle client:', {
    message: err.message,
    stack: err.stack,
    code: err.code
  });
  // Instead of crashing, we log it. The pool should handle creating new clients.
});

// Add periodic connection check or logging if needed
setInterval(() => {
  const status = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
  console.log('ℹ️ [DB POOL] Current status:', status);
}, 30000); // Every 30 seconds

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
