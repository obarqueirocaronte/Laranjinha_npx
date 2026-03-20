require('dotenv').config();
const db = require('./src/config/db');

async function fix() {
    try {
        await db.query('ALTER TABLE cadence_completions ADD COLUMN IF NOT EXISTS cadence_name VARCHAR(100)');
        console.log('✅ Column cadence_name added to cadence_completions');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fix();
