const db = require('./src/config/db');
async function verify() {
    try {
        const cadences = await db.query('SELECT COUNT(*) FROM cadence_completions');
        const interactions = await db.query('SELECT COUNT(*) FROM interactions_log');
        const stats = await db.query('SELECT COUNT(*) FROM sdr_stats');
        console.log('CADENCE_COMPLETIONS:', cadences.rows[0].count);
        console.log('INTERACTIONS_LOG:', interactions.rows[0].count);
        console.log('SDR_STATS:', stats.rows[0].count);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
verify();
