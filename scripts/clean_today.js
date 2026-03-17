require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function clean() {
    try {
        const res = await pool.query(`DELETE FROM leads WHERE DATE(created_at) = '2026-03-17'`);
        console.log(`Deleted ${res.rowCount} leads created today.`);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
clean();
