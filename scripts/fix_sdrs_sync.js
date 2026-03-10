const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function syncSdrs() {
    const client = await pool.connect();
    try {
        console.log('--- Starting SDR Sync ---');

        // 1. Find all users with role 'sdr'
        const usersRes = await client.query("SELECT id, email, name FROM users WHERE role = 'sdr'");
        console.log(`Found ${usersRes.rows.length} users with 'sdr' role.`);

        for (const user of usersRes.rows) {
            console.log(`Syncing user: ${user.name} (${user.email})`);

            // 2. Insert or Update in sdrs table
            await client.query(`
        INSERT INTO sdrs (user_id, full_name, email, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (email) DO UPDATE 
        SET user_id = EXCLUDED.user_id, 
            full_name = EXCLUDED.full_name,
            updated_at = CURRENT_TIMESTAMP
      `, [user.id, user.name, user.email]);
        }

        console.log('✅ SDR Sync completed successfully.');
    } catch (err) {
        console.error('❌ Error during SDR Sync:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

syncSdrs();
