const db = require('../src/config/db');
require('dotenv').config();

async function audit() {
    console.log('--- DB AUDIT: LOCAL VS PRODUCTION PREP ---');
    
    // 1. Check required tables
    const tables = [
        'leads', 'users', 'lead_cadence', 'cadence_configs', 
        'cadence_logs', 'sdr_stats', 'interactions_log', 'schedules'
    ];
    
    for (const table of tables) {
        const res = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
        `, [table]);
        
        if (res.rowCount > 0) {
            console.log(`[✓] Table '${table}' exists.`);
        } else {
            console.log(`[✗] Table '${table}' MISSING!`);
        }
    }

    // 2. Check essential columns for new cadence logic
    const required = [
        { t: 'lead_cadence', c: 'current_percentage', type: 'integer' },
        { t: 'lead_cadence', c: 'completed_cycles', type: 'integer' },
        { t: 'lead_cadence', c: 'total_cycles', type: 'integer' },
        { t: 'cadence_configs', c: 'cycles_config', type: 'jsonb' }
    ];

    console.log('\n--- ESSENTIAL COLUMNS (Phased Cadence) ---');
    for (const col of required) {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = $2
        `, [col.t, col.c]);

        if (res.rowCount > 0) {
            console.log(`[✓] ${col.t}.${col.c} exists (${res.rows[0].data_type}).`);
        } else {
            console.log(`[✗] ${col.t}.${col.c} MISSING! Recommendation: ALTER TABLE ${col.t} ADD COLUMN ${col.c} ${col.type} DEFAULT NULL;`);
        }
    }

    // 3. Summarize status
    console.log('\nAudit complete.');
    process.exit(0);
}

audit().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
