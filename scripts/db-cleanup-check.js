const db = require('../src/config/db');

async function checkSeedData() {
    try {
        console.log('--- Checking for "Ana" seed data ---');
        
        const users = await db.query("SELECT id, name, email FROM users WHERE name ILIKE '%ana%' OR email ILIKE '%ana%'");
        console.log('Users found:', users.rows);

        const leads = await db.query("SELECT id, name, email FROM leads WHERE name ILIKE '%ana%' OR email ILIKE '%ana%'");
        console.log('Leads found:', leads.rows);

        const schedules = await db.query(`
            SELECT s.*, l.name as lead_name 
            FROM schedules s 
            JOIN leads l ON s.lead_id = l.id 
            WHERE l.name ILIKE '%ana%' OR l.email ILIKE '%ana%'
        `);
        console.log('Schedules found:', schedules.rows);

        console.log('\n--- Checking for other possible seed leads (generic names) ---');
        const genericLeads = await db.query("SELECT id, name, email FROM leads WHERE name IN ('João', 'Maria', 'Teste', 'Lead Teste')");
        console.log('Generic leads found:', genericLeads.rows);

        console.log('\n--- Checking for all schedules ---');
        const allSchedules = await db.query(`
            SELECT s.*, l.name as lead_name 
            FROM schedules s 
            JOIN leads l ON s.lead_id = l.id
            ORDER BY s.scheduled_at DESC
            LIMIT 10
        `);
        console.log('Recent schedules:', allSchedules.rows);

    } catch (err) {
        console.error('Error checking seed data:', err);
    } finally {
        process.exit();
    }
}

checkSeedData();
