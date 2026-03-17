const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/inside_sales_pipeline',
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Identificar leads pendentes (qualification_status = 'pending' e status = 'active')
    console.log('Fetching pending leads in production...');
    const leadsResult = await client.query(`
      SELECT id, email, full_name 
      FROM leads 
      WHERE qualification_status = 'pending' 
      AND status = 'active'
    `);

    const leadIds = leadsResult.rows.map(r => r.id);
    if (leadIds.length === 0) {
      console.log('No pending leads found to delete.');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`Found ${leadIds.length} pending leads to delete. Cleaning up associated records...`);

    // Delete cadence completions
    await client.query(`
      DELETE FROM cadence_completions
      WHERE lead_id = ANY($1)
    `, [leadIds]);

    // Delete interactions log
    await client.query(`
      DELETE FROM interactions_log
      WHERE lead_id = ANY($1)
    `, [leadIds]);

    // Delete pipeline history
    await client.query(`
      DELETE FROM lead_pipeline_history
      WHERE lead_id = ANY($1)
    `, [leadIds]);

    // Delete leads
    await client.query(`
      DELETE FROM leads
      WHERE id = ANY($1)
    `, [leadIds]);

    await client.query('COMMIT');
    console.log(`Successfully deleted ${leadIds.length} pending leads and their dependencies from the database.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during cleanup:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
