const db = require('../src/config/db');

async function checkSeedData() {
    try {
        console.log('--- Checking for Tables Existence ---');
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('call_logs', 'schedules', 'cadence_completions', 'sdrs', 'leads')
        `);
        console.log('Tables found:', tables.rows.map(r => r.table_name));

        console.log('\n--- Broad search for "Ana" and "Roberta" ---');
        const users = await db.query("SELECT id, name, email, role FROM users WHERE name ILIKE '%ana%' OR name ILIKE '%roberta%' OR email ILIKE '%ana%' OR email ILIKE '%roberta%'");
        console.log('Users found:', users.rows);

        const leads = await db.query("SELECT id, full_name, email FROM leads WHERE full_name ILIKE '%ana%' OR full_name ILIKE '%roberta%' OR email ILIKE '%ana%' OR email ILIKE '%roberta%'");
        console.log('Leads found:', leads.rows);

        console.log('\n--- Checking for leads with "seed" or "mock" in ID or metadata ---');
        const seedLeads = await db.query("SELECT id, full_name, email FROM leads WHERE id::text LIKE 'seed-%' OR id::text LIKE 'mock-%' OR metadata::text ILIKE '%seed%' OR metadata::text ILIKE '%mock%'");
        console.log('Potential seed leads in DB:', seedLeads.rows);

    } catch (err) {
        console.error('Error checking seed data:', err);
    } finally {
        process.exit();
    }
}

checkSeedData();
