const db = require('../src/config/db');

async function checkSeedData() {
    try {
        console.log('--- Inspecting leads table schema ---');
        const schema = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads'
        `);
        console.log('Columns in leads table:', schema.rows.map(r => r.column_name));

        const leadNameColumn = schema.rows.find(r => r.column_name === 'name') ? 'name' : (schema.rows.find(r => r.column_name === 'first_name') ? 'first_name' : null);
        console.log('Detected lead name column:', leadNameColumn);

        const users = await db.query("SELECT id, name, email FROM users WHERE name ILIKE '%ana%' OR email ILIKE '%ana%'");
        console.log('Users found:', users.rows);

        let leadsRows = [];
        if (leadNameColumn) {
            const leads = await db.query(`SELECT id, ${leadNameColumn}, email FROM leads WHERE ${leadNameColumn} ILIKE '%ana%' OR email ILIKE '%ana%'`);
            leadsRows = leads.rows;
        } else {
            const leads = await db.query("SELECT id, email FROM leads WHERE email ILIKE '%ana%'");
            leadsRows = leads.rows;
        }
        console.log('Leads found:', leadsRows);

        if (leadsRows.length > 0) {
            const leadIds = leadsRows.map(l => l.id);
            const schedules = await db.query(`
                SELECT s.*, l.${leadNameColumn || 'email'} as lead_identifier 
                FROM schedules s 
                JOIN leads l ON s.lead_id = l.id 
                WHERE l.id = ANY($1)
            `, [leadIds]);
            console.log('Schedules found for these leads:', schedules.rows);
        }

        console.log('\n--- Checking for other possible seed leads (generic names) ---');
        const genericLeads = await db.query("SELECT id, email FROM leads WHERE email IN ('joao@teste.com', 'maria@teste.com') OR id::text LIKE 'seed-%'");
        console.log('Generic/Seed leads found:', genericLeads.rows);

    } catch (err) {
        console.error('Error checking seed data:', err);
    } finally {
        process.exit();
    }
}

checkSeedData();
