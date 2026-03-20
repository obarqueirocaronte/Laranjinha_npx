const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function seed() {
    try {
        await client.connect();
        console.log('🌱 Iniciando seed de cadências...');

        // 1. Criar uma Cadência Config
        const configId = 'c0000000-0000-0000-0000-000000000001';
        await client.query(`
            INSERT INTO cadence_configs (id, name, description, phone_rolls, whatsapp_rolls, email_rolls, intervalo_retorno_horas)
            VALUES ($1, 'Cadência Padrão Outbound', '3 tentativas de telefone, 2 whatsapp, 1 email', 3, 2, 1, 24)
            ON CONFLICT (id) DO NOTHING
        `, [configId]);

        const leads = [
            { id: 'b0000001-0000-0000-0000-000000000001', name: 'João Pedro Santos' },
            { id: 'b0000002-0000-0000-0000-000000000002', name: 'Maria Fernanda Lima' },
            { id: 'b0000003-0000-0000-0000-000000000003', name: 'Carlos Eduardo Rocha' },
            { id: 'b0000004-0000-0000-0000-000000000004', name: 'Patrícia Alves' },
            { id: 'b0000005-0000-0000-0000-000000000005', name: 'Roberto Silva' },
            { id: 'af6179e3-57d8-4001-8b95-61914e0891a7', name: 'Garra Distribuidora' },
            { id: '217a212f-1be9-4084-9b70-b75cd517aa4e', name: 'Kennedy Bebidas Sul' }
        ];

        const sdrs = [
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Ana
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Bruno
            'cccccccc-cccc-cccc-cccc-cccccccccccc'  // Carla
        ];

        // 2. Inserir lead_cadence (Ativas)
        console.log('--- Ativas ---');
        const activeLeads = [
            { lead_id: leads[0].id, sdr_id: sdrs[0], step: 1, proxima: 'NOW() + INTERVAL \'2 hours\'' },
            { lead_id: leads[1].id, sdr_id: sdrs[1], step: 2, proxima: 'NOW() + INTERVAL \'5 hours\'' },
            { lead_id: leads[5].id, sdr_id: sdrs[2], step: 1, proxima: 'NOW() + INTERVAL \'1 hour\'' }
        ];

        for (const al of activeLeads) {
            await client.query(`
                INSERT INTO lead_cadence (lead_id, cadence_config_id, sdr_id, step_atual, max_steps, status, proxima_acao_em)
                VALUES ($1, $2, $3, $4, 6, 'ativa', ${al.proxima})
                ON CONFLICT (lead_id) DO UPDATE SET status = 'ativa', proxima_acao_em = ${al.proxima}
            `, [al.lead_id, configId, al.sdr_id, al.step]);
        }

        // 3. Inserir lead_cadence (Paradas > 24h)
        console.log('--- Paradas ---');
        const stalledLeads = [
            { lead_id: leads[2].id, sdr_id: sdrs[0], step: 3, proxima: 'NOW() - INTERVAL \'30 hours\'' },
            { lead_id: leads[3].id, sdr_id: sdrs[1], step: 1, proxima: 'NOW() - INTERVAL \'48 hours\'' }
        ];

        for (const sl of stalledLeads) {
            await client.query(`
                INSERT INTO lead_cadence (lead_id, cadence_config_id, sdr_id, step_atual, max_steps, status, proxima_acao_em)
                VALUES ($1, $2, $3, $4, 6, 'ativa', ${sl.proxima})
                ON CONFLICT (lead_id) DO UPDATE SET status = 'ativa', proxima_acao_em = ${sl.proxima}
            `, [sl.lead_id, configId, sl.sdr_id, sl.step]);
        }

        // 4. Inserir lead_cadence (Concluídas)
        console.log('--- Concluídas ---');
        const completedLeads = [
            { lead_id: leads[4].id, sdr_id: sdrs[2], step: 6, status: 'concluida' },
            { lead_id: leads[6].id, sdr_id: sdrs[0], step: 2, status: 'concluida' }
        ];

        for (const cl of completedLeads) {
            await client.query(`
                INSERT INTO lead_cadence (lead_id, cadence_config_id, sdr_id, step_atual, max_steps, status)
                VALUES ($1, $2, $3, $4, 6, $5)
                ON CONFLICT (lead_id) DO UPDATE SET status = $5
            `, [cl.lead_id, configId, cl.sdr_id, cl.step, cl.status]);
        }

        // 5. Cadence Logs (Atividade recente)
        console.log('--- Logs ---');
        const logs = [
            { lead_id: leads[0].id, sdr_id: sdrs[0], step: 1, canal: 'telefone', acao: 'tentativa', notes: 'Chamou até cair' },
            { lead_id: leads[1].id, sdr_id: sdrs[1], step: 1, canal: 'whatsapp', acao: 'mensagem', notes: 'Enviado template 1' },
            { lead_id: leads[4].id, sdr_id: sdrs[2], step: 6, canal: 'telefone', acao: 'success', notes: 'Reunião agendada para dia 25' }
        ];

        for (const log of logs) {
            const lcRes = await client.query('SELECT id FROM lead_cadence WHERE lead_id = $1', [log.lead_id]);
            const lcId = lcRes.rows[0].id;

            await client.query(`
                INSERT INTO cadence_logs (lead_id, lead_cadence_id, sdr_id, step, canal, acao, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [log.lead_id, lcId, log.sdr_id, log.step, log.canal, log.acao, log.notes]);
        }

        // 6. Interaction Logs (Sincronizar com stats globais)
        console.log('--- Interactions ---');
        const interactions = [
            { lead_id: leads[0].id, sdr_id: sdrs[0], type: 'CALL_MADE' },
            { lead_id: leads[1].id, sdr_id: sdrs[1], type: 'WHATSAPP_SENT' },
            { lead_id: leads[4].id, sdr_id: sdrs[2], type: 'CALL_MADE' },
            { lead_id: leads[2].id, sdr_id: sdrs[0], type: 'EMAIL_SENT' }
        ];

        for (const inter of interactions) {
            await client.query(`
                INSERT INTO interactions_log (lead_id, sdr_id, action_type, content_snapshot)
                VALUES ($1, $2, $3, $4)
            `, [inter.lead_id, inter.sdr_id, inter.type, 'Seed interaction for dashboard preview']);
        }

        // 7. Schedules (Retornos programados)
        console.log('--- Schedules ---');
        const schedules = [
            { lead_id: leads[0].id, sdr_id: sdrs[0], date: 'NOW() + INTERVAL \'2 hours\'' },
            { lead_id: leads[1].id, sdr_id: sdrs[1], date: 'NOW() + INTERVAL \'5 hours\'' },
            { lead_id: leads[5].id, sdr_id: sdrs[2], date: 'NOW() + INTERVAL \'1 day\'' },
            { lead_id: leads[2].id, sdr_id: sdrs[0], date: 'NOW() - INTERVAL \'30 hours\'' }
        ];

        for (const sch of schedules) {
            await client.query(`
                INSERT INTO schedules (id, lead_id, sdr_id, scheduled_at, type, status)
                VALUES (gen_random_uuid(), $1, $2, ${sch.date}, 'callback', 'pending')
            `, [sch.lead_id, sch.sdr_id]);
        }

        console.log('✅ Seed concluído com sucesso!');
    } catch (err) {
        console.error('❌ Erro no seed:', err);
    } finally {
        await client.end();
    }
}

seed();
