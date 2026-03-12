const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupTest() {
    try {
        const email = 'rodrigo@npx.com.br';
        const userId = '11111111-0000-0000-0000-000000000001';
        const extension = '11012';

        console.log(`Setting up test for ${email} (${userId})...`);

        // 1. Set extension
        await pool.query(`
            INSERT INTO user_integrations (user_id, type, config, is_active)
            VALUES ($1, 'voice', $2, true)
            ON CONFLICT (user_id, type) DO UPDATE 
            SET config = EXCLUDED.config, is_active = true
        `, [userId, JSON.stringify({ extension })]);
        console.log(`Extension ${extension} configured.`);

        // 2. Ensure SDR record exists
        let sdrRes = await pool.query("SELECT id FROM sdrs WHERE user_id = $1", [userId]);
        let sdrId;
        if (sdrRes.rows.length === 0) {
            const newSdr = await pool.query("INSERT INTO sdrs (user_id, full_name, email, is_active) VALUES ($1, $2, $3, true) RETURNING id", [userId, "Rodrigo Dantas", email]);
            sdrId = newSdr.rows[0].id;
        } else {
            sdrId = sdrRes.rows[0].id;
        }
        console.log(`SDR ID: ${sdrId}`);

        // 3. Assign a lead to this SDR
        // Let's find a lead to use
        const leadRes = await pool.query("SELECT id, full_name FROM leads LIMIT 1");
        if (leadRes.rows.length > 0) {
            const leadId = leadRes.rows[0].id;
            await pool.query("UPDATE leads SET assigned_sdr_id = $1, qualification_status = 'qualified' WHERE id = $2", [sdrId, leadId]);
            console.log(`Lead "${leadRes.rows[0].full_name}" assigned to SDR ${sdrId}`);
        }

        console.log('\n--- SETUP COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

setupTest();
