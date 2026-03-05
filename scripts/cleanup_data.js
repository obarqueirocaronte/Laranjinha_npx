const db = require('../src/config/db');

async function cleanup() {
    try {
        console.log('Starting data cleanup...');

        // Truncate leads and related data
        // Order matters for foreign keys, or use CASCADE
        const tables = [
            'notifications',
            'interactions_log',
            'lead_pipeline_history',
            'leads'
        ];

        for (const table of tables) {
            console.log(`Truncating table: ${table}`);
            await db.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        }

        console.log('Data cleanup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

cleanup();
