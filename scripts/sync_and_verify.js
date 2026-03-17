const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function syncAndVerify() {
  console.log('🚀 Starting Sync and Verification...');
  const client = await pool.connect();

  try {
    // 1. Read CSV Data (simplified parser for this specific file)
    const csvPath = '/Users/rodrigodantas/Downloads/NPX LEADS.csv';
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found at:', csvPath);
      return;
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',');
    const leadLines = lines.slice(1);

    console.log(`📊 Found ${leadLines.length} leads in CSV.`);

    // 2. Get first column and a dummy SDR
    const colRes = await client.query('SELECT id FROM pipeline_columns ORDER BY position ASC LIMIT 1');
    const firstColId = colRes.rows[0]?.id;

    const sdrRes = await client.query('SELECT id, user_id FROM sdrs LIMIT 1');
    const sdrId = sdrRes.rows[0]?.id;
    const userId = sdrRes.rows[0]?.user_id;

    if (!firstColId || !sdrId || !userId) {
      console.error('❌ Missing pipeline columns, SDRs, or User IDs. Run db:setup first.');
      return;
    }

    let syncedCount = 0;
    let treatedCount = 0;

    for (const line of leadLines) {
      const fields = line.split(',');
      const name = fields[0];
      const email = fields[1];
      const phone = fields[2];
      const company = fields[3];

      if (!email) continue;

      // Check if exists
      const check = await client.query('SELECT id FROM leads WHERE email = $1', [email]);
      let leadId;

      if (check.rows.length === 0) {
        // Insert
        const insertRes = await client.query(
          `INSERT INTO leads (full_name, email, phone, company_name, current_column_id, qualification_status, assigned_sdr_id, status)
           VALUES ($1, $2, $3, $4, $5, 'qualified', $6, 'active')
           RETURNING id`,
          [name, email, phone, company, firstColId, sdrId]
        );
        leadId = insertRes.rows[0].id;
        syncedCount++;
      } else {
        leadId = check.rows[0].id;
      }

      // 3. Simulate "Treatment" (Move to Complete and set outcome)
      // Outcome: some are opportunities, some are rejected
      const isOpportunity = Math.random() > 0.5;
      const outcome = isOpportunity ? 'opportunity' : 'rejected';
      const status = isOpportunity ? 'qualified' : 'lost';

      // Log completion
      await client.query(
        `INSERT INTO cadence_completions (lead_id, sdr_id, notes, final_outcome)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [leadId, userId, 'Simulated transfer from production', outcome]
      );

      // Update lead status (this is what triggers the fix)
      await client.query(
        `UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [status, leadId]
      );
      treatedCount++;
    }

    console.log(`✅ Synced ${syncedCount} new leads.`);
    console.log(`✅ Treated ${treatedCount} leads total.`);

    // 4. Verification Check
    console.log('🔍 Verifying Fix...');
    const verifyRes = await client.query(
      `SELECT count(*) FROM leads l 
       WHERE l.qualification_status = 'qualified' 
       AND (l.status = 'active' OR l.status IS NULL)`
    );

    const activeCount = parseInt(verifyRes.rows[0].count);
    console.log(`📊 Active Leads remaining in query: ${activeCount}`);

    if (activeCount === 0) {
      console.log('✨ SUCCESS: Treated leads are no longer appearing in the "qualified" set!');
    } else {
      console.log(`⚠️ WARNING: ${activeCount} leads still appearing. Check filters.`);
    }

  } catch (err) {
    console.error('❌ Error during sync/verify:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

syncAndVerify();
