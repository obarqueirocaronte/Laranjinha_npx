const db = require('./src/config/db');
async function seed() {
    try {
        const sdrResult = await db.query("SELECT id FROM users WHERE role = 'sdr' LIMIT 1");
        if (sdrResult.rows.length === 0) {
            console.log('No user with role=sdr found to seed data.');
            process.exit(0);
        }
        const sdrId = sdrResult.rows[0].id;
        const leadResult = await db.query('SELECT id FROM leads LIMIT 1');
        if (leadResult.rows.length === 0) {
            console.log('No Leads found to seed data.');
            process.exit(0);
        }
        const leadId = leadResult.rows[0].id;

        const now = new Date();
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 7);

        // Seed 1 completion today
        await db.query('INSERT INTO cadence_completions (lead_id, sdr_id, completed_at) VALUES ($1, $2, $3)', [leadId, sdrId, now]);
        // Seed 1 completion yesterday (part of week)
        await db.query('INSERT INTO cadence_completions (lead_id, sdr_id, completed_at) VALUES ($1, $2, $3)', [leadId, sdrId, yesterday]);
        // Seed 1 completion last week (part of month)
        await db.query('INSERT INTO cadence_completions (lead_id, sdr_id, completed_at) VALUES ($1, $2, $3)', [leadId, sdrId, lastWeek]);

        console.log('Seed successful: 3 completions added (1 today, 1 yesterday, 1 last week)');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seed();
