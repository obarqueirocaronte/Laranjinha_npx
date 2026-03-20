const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function fix() {
  await client.connect();
  console.log('--- Adicionando colunas faltantes ---');

  // cadence_logs: resultado, retorno_agendado_em, timestamp
  await client.query(`
    ALTER TABLE cadence_logs ADD COLUMN IF NOT EXISTS resultado VARCHAR(50);
    ALTER TABLE cadence_logs ADD COLUMN IF NOT EXISTS retorno_agendado_em TIMESTAMP WITH TIME ZONE;
    ALTER TABLE cadence_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `);
  console.log('✅ cadence_logs atualizada');

  // lead_cadence: resultado_anterior
  await client.query(`
    ALTER TABLE lead_cadence ADD COLUMN IF NOT EXISTS resultado_anterior VARCHAR(50);
  `);
  console.log('✅ lead_cadence atualizada');

  // schedules: lead_cadence_id, cadence_step
  await client.query(`
    ALTER TABLE schedules ADD COLUMN IF NOT EXISTS lead_cadence_id UUID;
    ALTER TABLE schedules ADD COLUMN IF NOT EXISTS cadence_step INTEGER;
  `);
  console.log('✅ schedules atualizada');

  // Agora popular seeds mais ricos com outcomes
  console.log('--- Populando outcomes realistas ---');

  // Limpar logs antigos do seed
  await client.query(`DELETE FROM cadence_logs WHERE notes LIKE '%Seed%' OR notes LIKE '%Chamou%' OR notes LIKE '%Enviado%' OR notes LIKE '%Reunião%'`);

  // SDRs existentes
  const sdrs = [
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Ana
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Bruno
    'cccccccc-cccc-cccc-cccc-cccccccccccc', // Carla
  ];

  const leads = [
    'b0000001-0000-0000-0000-000000000001', // João Pedro Santos
    'b0000002-0000-0000-0000-000000000002', // Maria Fernanda Lima
    'b0000003-0000-0000-0000-000000000003', // Carlos Eduardo Rocha
    'b0000004-0000-0000-0000-000000000004', // Patrícia Alves
    'b0000005-0000-0000-0000-000000000005', // Roberto Silva
    'af6179e3-57d8-4001-8b95-61914e0891a7', // Garra Distribuidora
    '217a212f-1be9-4084-9b70-b75cd517aa4e', // Kennedy Bebidas Sul
  ];

  // Get lead_cadence ids
  const lcRes = await client.query('SELECT id, lead_id FROM lead_cadence');
  const lcMap = {};
  lcRes.rows.forEach(r => { lcMap[r.lead_id] = r.id; });

  // Outcomes realistas
  const outcomes = [
    { lead: leads[0], sdr: sdrs[0], step: 1, canal: 'call', acao: 'tentativa', resultado: 'no_answer', notes: 'Seed: Nao atendeu', hoursAgo: 48 },
    { lead: leads[0], sdr: sdrs[0], step: 1, canal: 'whatsapp', acao: 'tentativa', resultado: 'no_answer', notes: 'Seed: Enviou wpp sem resposta', hoursAgo: 24 },
    { lead: leads[1], sdr: sdrs[1], step: 1, canal: 'call', acao: 'tentativa', resultado: 'busy', notes: 'Seed: Ocupado na linha', hoursAgo: 36 },
    { lead: leads[1], sdr: sdrs[1], step: 2, canal: 'call', acao: 'tentativa', resultado: 'voicemail', notes: 'Seed: Caiu na caixa postal', hoursAgo: 12 },
    { lead: leads[2], sdr: sdrs[0], step: 1, canal: 'call', acao: 'tentativa', resultado: 'no_answer', notes: 'Seed: Sem resposta', hoursAgo: 50 },
    { lead: leads[2], sdr: sdrs[0], step: 2, canal: 'call', acao: 'tentativa', resultado: 'invalid_number', notes: 'Seed: Numero invalido', hoursAgo: 30 },
    { lead: leads[3], sdr: sdrs[1], step: 1, canal: 'call', acao: 'tentativa', resultado: 'no_answer', notes: 'Seed: Desligou rapido', hoursAgo: 60 },
    { lead: leads[4], sdr: sdrs[2], step: 1, canal: 'call', acao: 'tentativa', resultado: 'success', notes: 'Seed: Reuniao marcada dia 25', hoursAgo: 20 },
    { lead: leads[5], sdr: sdrs[2], step: 1, canal: 'call', acao: 'tentativa', resultado: 'reschedule', notes: 'Seed: Pediu pra ligar amanha', hoursAgo: 6 },
    { lead: leads[6], sdr: sdrs[0], step: 1, canal: 'call', acao: 'tentativa', resultado: 'success', notes: 'Seed: Converteu!', hoursAgo: 10 },
    // Extra interactions for volume
    { lead: leads[0], sdr: sdrs[0], step: 1, canal: 'email', acao: 'tentativa', resultado: 'no_answer', notes: 'Seed: Email nao respondido', hoursAgo: 44 },
    { lead: leads[3], sdr: sdrs[1], step: 1, canal: 'whatsapp', acao: 'tentativa', resultado: 'busy', notes: 'Seed: Online mas nao respondeu', hoursAgo: 55 },
  ];

  for (const o of outcomes) {
    const lcId = lcMap[o.lead];
    if (!lcId) { console.log('Skip lead sem cadence:', o.lead); continue; }
    
    const ts = new Date(Date.now() - o.hoursAgo * 3600000).toISOString();
    
    await client.query(`
      INSERT INTO cadence_logs (lead_id, lead_cadence_id, sdr_id, step, canal, acao, resultado, notes, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [o.lead, lcId, o.sdr, o.step, o.canal, o.acao, o.resultado, o.notes, ts]);
  }

  // Update resultado_anterior on lead_cadence
  await client.query(`UPDATE lead_cadence SET resultado_anterior = 'no_answer' WHERE lead_id = $1`, [leads[0]]);
  await client.query(`UPDATE lead_cadence SET resultado_anterior = 'voicemail' WHERE lead_id = $1`, [leads[1]]);
  await client.query(`UPDATE lead_cadence SET resultado_anterior = 'invalid_number' WHERE lead_id = $1`, [leads[2]]);
  await client.query(`UPDATE lead_cadence SET resultado_anterior = 'no_answer' WHERE lead_id = $1`, [leads[3]]);
  await client.query(`UPDATE lead_cadence SET resultado_anterior = 'success' WHERE lead_id = $1`, [leads[4]]);
  await client.query(`UPDATE lead_cadence SET resultado_anterior = 'reschedule' WHERE lead_id = $1`, [leads[5]]);
  await client.query(`UPDATE lead_cadence SET resultado_anterior = 'success' WHERE lead_id = $1`, [leads[6]]);

  // Add more schedules for the calendar
  console.log('--- Populando schedules para calendário ---');
  const now = new Date();
  const scheduleData = [
    { lead: leads[0], sdr: sdrs[0], daysOffset: 0, hours: 14 },
    { lead: leads[1], sdr: sdrs[1], daysOffset: 0, hours: 16 },
    { lead: leads[5], sdr: sdrs[2], daysOffset: 1, hours: 9 },
    { lead: leads[3], sdr: sdrs[1], daysOffset: 1, hours: 11 },
    { lead: leads[2], sdr: sdrs[0], daysOffset: 2, hours: 10 },
    { lead: leads[6], sdr: sdrs[0], daysOffset: 3, hours: 15 },
    { lead: leads[4], sdr: sdrs[2], daysOffset: 4, hours: 10 },
  ];

  for (const s of scheduleData) {
    const d = new Date(now);
    d.setDate(d.getDate() + s.daysOffset);
    d.setHours(s.hours, 0, 0, 0);
    await client.query(`
      INSERT INTO schedules (id, lead_id, sdr_id, scheduled_at, type, status, notes)
      VALUES (gen_random_uuid(), $1, $2, $3, 'cadence', 'pending', 'Seed: retorno cadencia')
    `, [s.lead, s.sdr, d.toISOString()]);
  }

  console.log('✅ Seed completo com outcomes e schedules!');
  await client.end();
}

fix().catch(console.error);
