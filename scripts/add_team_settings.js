const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: Adding settings column to teams...');
    await client.query(`
      ALTER TABLE teams 
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"allow_return_to_queue": true}';
    `);
    console.log('Migration successful: settings column added to teams.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
