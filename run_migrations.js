require('dotenv').config();
const db = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration(filePath) {
    console.log(`🚀 Running migration: ${path.basename(filePath)}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
        await db.query(sql);
        console.log(`✅ ${path.basename(filePath)} finished.`);
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log(`ℹ️ ${path.basename(filePath)} skipped (already exists).`);
        } else {
            console.error(`❌ Error in ${path.basename(filePath)}:`, err.message);
            throw err;
        }
    }
}

async function main() {
    try {
        await runMigration(path.join(__dirname, 'database/migrations/20260304_create_sdr_stats_table.sql'));
        await runMigration(path.join(__dirname, 'database/migrations/20260304_add_goals_to_sdrs.sql'));
        await runMigration(path.join(__dirname, 'database/migrations/20260304_add_management_report_config.sql'));
        await runMigration(path.join(__dirname, 'database/migrations/20260305_add_schedules_table.sql'));
        await runMigration(path.join(__dirname, 'database/migrations/20260306_add_google_oauth.sql'));
        await runMigration(path.join(__dirname, 'database/migrations/20260306_add_invites.sql'));
        console.log('🎉 All migrations applied!');
    } catch (error) {
        console.error('💥 Migration failed!');
    } finally {
        process.exit(0);
    }
}

main();
