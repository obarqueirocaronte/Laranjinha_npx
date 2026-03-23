const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-forte-aqui';

// Gerar token de bypass para teste
const bypassToken = jwt.sign(
    { userId: '00000000-0000-0000-0000-000000000001', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
);
const headers = { 'Authorization': `Bearer ${bypassToken}` };

async function run() {
    console.log('🚀 Iniciando teste de progressão de cadência...');

    try {
        // 1. Pegar um lead ativo
        const leadsRes = await axios.get(`${API_BASE}/leads/active`, { headers });
        const lead = leadsRes.data.data[0];
        if (!lead) {
            console.error('❌ Nenhum lead ativo encontrado para teste.');
            return;
        }
        console.log(`📌 Testando com Lead: ${lead.full_name} (${lead.id})`);

        // LIMPEZA: Deletar cadência antiga para testar do zero
        console.log('🧹 Limpando cadências antigas do lead...');
        const db = require('../src/config/db');
        await db.query('DELETE FROM lead_cadence WHERE lead_id = $1', [lead.id]);

        // 2. Aplicar uma cadência (se não tiver)
        let cadenceId = lead.lead_cadence_id;
        if (!cadenceId) {
            console.log('🔄 Aplicando nova cadência de teste...');
            await axios.post(`${API_BASE}/cadences/apply`, {
                lead_ids: [lead.id],
                total_cycles: 3
            }, { headers });
            console.log('✅ Cadência aplicada.');
            
            // Refresh para pegar o ID
            const refresh = await axios.get(`${API_BASE}/leads/${lead.id}`, { headers });
            console.log('🔍 LEAD REFRESH DATA:', JSON.stringify(refresh.data.data, null, 2));
            cadenceId = refresh.data.data.lead_cadence_id;
        }

        console.log(`🆔 Lead Cadence ID: ${cadenceId}`);

        // 3. Registrar Passo 1 (33%)
        console.log('📞 Registrando Passo 1 (Telefonema: no_answer)...');
        const step1 = await axios.put(`${API_BASE}/cadences/${cadenceId}/step`, {
            outcome: 'no_answer',
            canal: 'call'
        }, { headers });
        console.log(`📊 Progresso: ${step1.data.data.current_percentage}% (Ciclos: ${step1.data.data.completed_cycles})`);

        // 4. Registrar Passo 2 (66%)
        console.log('📞 Registrando Passo 2 (Telefonema: busy)...');
        const step2 = await axios.put(`${API_BASE}/cadences/${cadenceId}/step`, {
            outcome: 'busy',
            canal: 'call'
        }, { headers });
        console.log(`📊 Progresso: ${step2.data.data.current_percentage}% (Ciclos: ${step2.data.data.completed_cycles})`);

        // 5. Registrar Passo 3 (100% / Concluída)
        console.log('📞 Registrando Passo 3 (Telefonema: no_answer)...');
        const step3 = await axios.put(`${API_BASE}/cadences/${cadenceId}/step`, {
            outcome: 'no_answer',
            canal: 'call'
        }, { headers });
        console.log(`📊 Progresso: ${step3.data.data.current_percentage}% (Ciclos: ${step3.data.data.completed_cycles})`);
        console.log(`🏁 Status Final: ${step3.data.data.novo_status}`);

        if (step3.data.data.current_percentage === 100 && step3.data.data.novo_status === 'concluida') {
            console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO! A lógica de 33/66/100 está funcional.');
        } else {
            console.error('\n❌ TESTE FALHOU: Progresso ou status incorreto.');
        }

    } catch (err) {
        console.error('❌ Erro no teste:', err.response?.data || err.message);
    }
}

run();
