const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: process.env.DATABASE_POOL_MIN ? parseInt(process.env.DATABASE_POOL_MIN) : 2,
  max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX) : 10,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
