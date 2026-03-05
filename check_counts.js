require('dotenv').config();
const db = require('./src/config/db');

async function main() {
    const sdrCount = await db.query('SELECT COUNT(*) FROM sdrs');
    const leadCount = await db.query('SELECT COUNT(*) FROM leads');
    const columnCount = await db.query('SELECT COUNT(*) FROM pipeline_columns');

    console.log(`📊 Current DB Data:`);
    console.log(`- SDRs: ${sdrCount.rows[0].count}`);
    console.log(`- Leads: ${leadCount.rows[0].count}`);
    console.log(`- Pipeline Columns: ${columnCount.rows[0].count}`);

    process.exit(0);
}

main();
