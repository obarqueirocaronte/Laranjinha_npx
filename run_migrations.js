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
        const migrationsDir = path.join(__dirname, 'database/migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Sort to ensure chronological order if prefixed with date

        for (const file of files) {
            await runMigration(path.join(migrationsDir, file));
        }

        console.log('🎉 All migrations applied successfully!');
    } catch (error) {
        console.error('💥 Migration process failed:', error.message);
    } finally {
        process.exit(0);
    }
}

main();
