const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/inside_sales_pipeline',
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Mapear leads que foram importados hoje e têm e-mails criados por nós do CSV.
    // Ou simplesmente deletar todos criados >= '2026-03-17'.
    console.log('Fetching leads created today...');
    const leadsResult = await client.query(`
      SELECT id, email FROM leads 
      WHERE DATE(created_at) >= '2026-03-17'
    `);

    const leadIds = leadsResult.rows.map(r => r.id);
    if (leadIds.length === 0) {
      console.log('No leads found created today to delete.');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`Found ${leadIds.length} leads to delete. Deleting dependencies...`);

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
    console.log(`Successfully deleted ${leadIds.length} leads and all related records.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting leads:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
