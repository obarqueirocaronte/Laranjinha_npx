const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyStats() {
  console.log('🔍 Verifying Log-based Stats...');
  const client = await pool.connect();

  try {
    // 1. Get Summary Stats from logs
    const summarySql = `
      SELECT 
        (SELECT COUNT(*)::integer FROM call_logs) as calls,
        (SELECT COUNT(*)::integer FROM interactions_log WHERE action_type = 'EMAIL_SENT') as emails,
        (SELECT COUNT(*)::integer FROM interactions_log WHERE action_type = 'WHATSAPP_SENT') as whatsapp,
        (SELECT COUNT(*)::integer FROM cadence_completions) as completed
    `;
    const summaryRes = await client.query(summarySql);
    console.log('✅ Global Summary Stats (from logs):', summaryRes.rows[0]);

    // 2. Get SDR Breakdown
    const sdrSql = `
      SELECT 
        s.full_name,
        (SELECT COUNT(*)::integer FROM call_logs cl WHERE cl.sdr_id = s.id) as calls,
        (SELECT COUNT(*)::integer FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'EMAIL_SENT') as emails,
        (SELECT COUNT(*)::integer FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'WHATSAPP_SENT') as whatsapp,
        (SELECT COUNT(*)::integer FROM cadence_completions cc WHERE cc.sdr_id = s.id) as completed
      FROM sdrs s
      WHERE s.is_active = true
      ORDER BY s.full_name ASC
    `;
    const sdrRes = await client.query(sdrSql);
    console.log('✅ SDR Individual Stats (from logs):');
    sdrRes.rows.forEach(sdr => {
      console.log(`   - ${sdr.full_name}: Calls: ${sdr.calls}, Emails: ${sdr.emails}, WhatsApp: ${sdr.whatsapp}, Completed: ${sdr.completed}`);
    });

    console.log('\n✨ Stats verification complete!');
  } catch (err) {
    console.error('❌ Stats verification failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyStats();
