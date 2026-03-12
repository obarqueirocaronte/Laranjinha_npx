const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'profile_picture_url'
        `);
        console.log("--- User Profile Picture Column ---");
        console.table(res.rows);

        const leads = await pool.query("SELECT COUNT(*) FROM leads");
        console.log(`\nTotal Leads in DB: ${leads.rows[0].count}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
