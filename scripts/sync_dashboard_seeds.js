/**
 * sync_dashboard_seeds.js
 * 
 * Sincroniza os dados de cadence_logs com call_logs + interactions_log + cadence_completions,
 * garantindo que as métricas de produtividade reflitam o trabalho real dos SDRs.
 * 
 * Também cria users para SDRs sem user_id.
 */
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function sync() {
  await client.connect();
  console.log('=== Sync Dashboard Seeds ===\n');

  // 0. Verificar que todos SDRs têm user_id
  const orphanCheck = await client.query(`SELECT id, full_name FROM sdrs WHERE user_id IS NULL AND is_active = true`);
  if (orphanCheck.rows.length > 0) {
    console.log('⚠️  SDRs sem user_id encontrados:', orphanCheck.rows.map(r => r.full_name).join(', '));
    console.log('   Execute o script de vinculação de SDRs primeiro.');
    process.exit(1);
  }

  // 1. Buscar SDRs e seus user_ids (agora todos têm)
  const sdrsRes = await client.query(`SELECT id, user_id, full_name FROM sdrs WHERE is_active = true`);
  const sdrs = sdrsRes.rows;
  const sdrMap = {};
  for (const s of sdrs) { sdrMap[s.id] = s; }
  console.log(`\nSDRs encontrados: ${sdrs.length}`);

  // 2. Buscar cadence_logs com resultado
  const logsRes = await client.query(
    `SELECT cl.* FROM cadence_logs cl WHERE cl.resultado IS NOT NULL ORDER BY cl.timestamp ASC`
  );
  console.log(`Cadence logs com resultado: ${logsRes.rows.length}`);

  // 3. Limpar seeds anteriores
  await client.query(`DELETE FROM call_logs WHERE notes LIKE '%[sync-seed]%'`);
  await client.query(`DELETE FROM interactions_log WHERE content_snapshot LIKE '%[sync-seed]%'`);
  await client.query(`DELETE FROM cadence_completions WHERE notes LIKE '%[sync-seed]%'`);
  console.log('Seeds anteriores limpos.\n');

  let callsInserted = 0;
  let interactionsInserted = 0;
  let completionsInserted = 0;

  for (const log of logsRes.rows) {
    const sdr = sdrMap[log.sdr_id];
    if (!sdr || !sdr.user_id) { console.log(`Skip: SDR ${log.sdr_id} sem user_id`); continue; }

    const userId = sdr.user_id;
    const ts = log.timestamp || log.created_at;

    // call_logs FK uses users.id
    if (log.canal === 'call') {
      await client.query(
        `INSERT INTO call_logs (lead_id, sdr_id, outcome, notes, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [log.lead_id, userId, log.resultado, `[sync-seed] ${log.notes || ''}`, ts]
      );
      callsInserted++;
    }

    // interactions_log FK uses sdrs.id
    if (log.canal === 'whatsapp') {
      await client.query(
        `INSERT INTO interactions_log (lead_id, sdr_id, action_type, content_snapshot, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [log.lead_id, sdr.id, 'WHATSAPP_SENT', `[sync-seed] ${log.notes || ''}`, ts]
      );
      interactionsInserted++;
    }

    if (log.canal === 'email') {
      await client.query(
        `INSERT INTO interactions_log (lead_id, sdr_id, action_type, content_snapshot, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [log.lead_id, sdr.id, 'EMAIL_SENT', `[sync-seed] ${log.notes || ''}`, ts]
      );
      interactionsInserted++;
    }

    // cadence_completions FK uses users.id
    if (log.resultado === 'success') {
      await client.query(
        `INSERT INTO cadence_completions (lead_id, sdr_id, final_outcome, notes, completed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [log.lead_id, userId, 'opportunity', `[sync-seed] ${log.notes || ''}`, ts]
      );
      completionsInserted++;
    }
  }

  console.log(`✅ call_logs inseridos: ${callsInserted}`);
  console.log(`✅ interactions_log inseridos: ${interactionsInserted}`);
  console.log(`✅ cadence_completions inseridos: ${completionsInserted}`);

  // 5. Atualizar sdr_stats com contagens reais
  console.log('\n--- Atualizando sdr_stats ---');
  for (const sdr of sdrs) {
    const userId = sdr.user_id;

    const callCount = await client.query(
      `SELECT COUNT(*)::integer as c FROM call_logs WHERE sdr_id = $1`, [userId]
    );
    const emailCount = await client.query(
      `SELECT COUNT(*)::integer as c FROM interactions_log WHERE sdr_id = $1 AND action_type = 'EMAIL_SENT'`, [sdr.id]
    );
    const whatsappCount = await client.query(
      `SELECT COUNT(*)::integer as c FROM interactions_log WHERE sdr_id = $1 AND action_type = 'WHATSAPP_SENT'`, [sdr.id]
    );
    const completedCount = await client.query(
      `SELECT COUNT(*)::integer as c FROM cadence_completions WHERE sdr_id = $1`, [userId]
    );

    await client.query(
      `INSERT INTO sdr_stats (sdr_id, calls, emails, whatsapp, completed_leads)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (sdr_id)
       DO UPDATE SET calls = $2, emails = $3, whatsapp = $4, completed_leads = $5, updated_at = CURRENT_TIMESTAMP`,
      [sdr.id, callCount.rows[0].c, emailCount.rows[0].c, whatsappCount.rows[0].c, completedCount.rows[0].c]
    );
    console.log(`  ${sdr.full_name}: calls=${callCount.rows[0].c}, emails=${emailCount.rows[0].c}, wpp=${whatsappCount.rows[0].c}, completed=${completedCount.rows[0].c}`);
  }

  console.log('\n🎯 Sync completo! Dados de produtividade sincronizados com cadências.');
  await client.end();
}

sync().catch(e => { console.error(e); process.exit(1); });
