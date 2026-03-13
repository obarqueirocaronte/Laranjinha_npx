const db = require('../src/config/db');

async function checkSeedData() {
    try {
        console.log('--- Broad search for "Ana" and "Roberta" ---');
        
        const users = await db.query("SELECT id, name, email, role FROM users WHERE name ILIKE '%ana%' OR name ILIKE '%roberta%' OR email ILIKE '%ana%' OR email ILIKE '%roberta%'");
        console.log('Users found:', users.rows);

        const leads = await db.query("SELECT id, full_name, email FROM leads WHERE full_name ILIKE '%ana%' OR full_name ILIKE '%roberta%' OR email ILIKE '%ana%' OR email ILIKE '%roberta%'");
        console.log('Leads found:', leads.rows);

        console.log('\n--- Checking all schedules (Top 20) ---');
        const schedules = await db.query(`
            SELECT s.*, l.full_name as lead_name, u.name as user_name
            FROM schedules s 
            LEFT JOIN leads l ON s.lead_id = l.id 
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.scheduled_at DESC
            LIMIT 20
        `);
        console.table(schedules.rows);

        console.log('\n--- Checking for leads with "seed" in ID or metadata ---');
        const seedLeads = await db.query("SELECT id, full_name, email FROM leads WHERE id::text LIKE 'seed-%' OR metadata::text ILIKE '%seed%'");
        console.log('Seed leads found:', seedLeads.rows);

    } catch (err) {
        console.error('Error checking seed data:', err);
    } finally {
        process.exit();
    }
}

checkSeedData();
