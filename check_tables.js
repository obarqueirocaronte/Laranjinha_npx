const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('call_logs', 'schedules', 'cadence_completions');
    `);
    
    console.log('--- Existing Tables ---');
    res.rows.forEach(row => console.log(`- ${row.table_name}`));

    if (res.rows.length < 3) {
        console.log('\nMissing some persistence tables. Running creation script...');
        // I won't run it automatically here, just report.
    }

    // Check columns for each
    for (const table of ['call_logs', 'schedules', 'cadence_completions']) {
        const colRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position;
        `, [table]);
        console.log(`\n--- ${table} Columns ---`);
        colRes.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));
    }

  } catch (err) {
    console.error('Error checking tables:', err);
  } finally {
    await pool.end();
  }
}

checkTables();
