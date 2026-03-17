const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const activity = await pool.query(`
      SELECT pid, now() - query_start AS duration, query, state 
      FROM pg_stat_activity 
      WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%';
    `);
    console.log('--- Active Queries ---');
    console.table(activity.rows);

    const counts = await pool.query(`
      SELECT 
        (SELECT count(*) FROM leads) as leads_count,
        (SELECT count(*) FROM interactions_log) as interactions_count,
        (SELECT count(*) FROM users) as users_count;
    `);
    console.log('--- Table Counts ---');
    console.table(counts.rows);

    const poolStats = await pool.query(`
      SELECT count(*) as total_connections, state
      FROM pg_stat_activity
      GROUP BY state;
    `);
    console.log('--- Connection Stats ---');
    console.table(poolStats.rows);

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await pool.end();
  }
}

check();
