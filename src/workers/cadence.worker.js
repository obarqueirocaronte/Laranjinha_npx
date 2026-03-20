/**
 * Cadence Worker — Etapa 8
 * inside-sales-pipeline-beta
 *
 * Roda a cada 5 minutos. Busca cadências elegíveis (proxima_acao_em vencida)
 * e cria tasks na fila do SDR via tabela `schedules`.
 *
 * Evita duplicatas: só cria schedule se não existir 'pending' para o mesmo lead hoje.
 */

const cron = require('node-cron');
const db = require('../config/db');

class CadenceWorker {
    constructor() {
        this.task = null;
        this.isRunning = false;
    }

    /**
     * Inicia o worker com cron a cada 5 minutos.
     */
    start() {
        console.log('⏰ [CADENCE WORKER] Iniciando scheduler de cadências (a cada 5 min)...');

        // Roda a cada 5 minutos: */5 * * * *
        this.task = cron.schedule('*/5 * * * *', async () => {
            await this.processEligibleCadences();
        });

        // Primeira execução após 30 segundos do boot
        setTimeout(() => this.processEligibleCadences(), 30000);
    }

    /**
     * Para o worker.
     */
    stop() {
        if (this.task) {
            this.task.stop();
            console.log('🛑 [CADENCE WORKER] Scheduler parado.');
        }
    }

    /**
     * Busca e processa cadências com proxima_acao_em vencida.
     */
    async processEligibleCadences() {
        if (this.isRunning) {
            console.log('⏳ [CADENCE WORKER] Já em execução, pulando...');
            return;
        }

        this.isRunning = true;

        try {
            // ── Buscar cadências elegíveis ────────────────────────────
            const result = await db.query(
                `SELECT lc.*, l.full_name AS lead_name, l.company_name, s.full_name AS sdr_name
                 FROM lead_cadence lc
                 JOIN leads l ON lc.lead_id = l.id
                 LEFT JOIN sdrs s ON lc.sdr_id = s.id
                 WHERE lc.status = 'ativa'
                   AND lc.proxima_acao_em IS NOT NULL
                   AND lc.proxima_acao_em <= NOW()
                 ORDER BY lc.proxima_acao_em ASC
                 LIMIT 20`
            );

            if (result.rows.length === 0) {
                this.isRunning = false;
                return;
            }

            console.log(`📋 [CADENCE WORKER] ${result.rows.length} cadência(s) elegível(is) encontrada(s).`);

            let created = 0;
            let skipped = 0;

            for (const cadence of result.rows) {
                try {
                    // ── Verificar se já existe schedule 'pending' para este lead hoje ──
                    const existingSchedule = await db.query(
                        `SELECT id FROM schedules
                         WHERE lead_id = $1
                           AND status = 'pending'
                           AND DATE(scheduled_at) = CURRENT_DATE
                         LIMIT 1`,
                        [cadence.lead_id]
                    );

                    if (existingSchedule.rows.length > 0) {
                        // Já tem schedule pendente hoje → evitar duplicata
                        skipped++;
                        continue;
                    }

                    // ── Criar schedule para o SDR executar ────────────────
                    await db.query(
                        `INSERT INTO schedules (lead_id, sdr_id, scheduled_at, type, status, notes, lead_cadence_id, cadence_step)
                         VALUES ($1, $2, NOW(), 'cadence', 'pending', $3, $4, $5)`,
                        [
                            cadence.lead_id,
                            cadence.sdr_id,
                            `[Auto] Step ${cadence.step_atual}/${cadence.max_steps} - ${cadence.lead_name || 'Lead'}`,
                            cadence.id,
                            cadence.step_atual,
                        ]
                    );

                    // ── Atualizar updated_at da cadência ──────────────────
                    await db.query(
                        `UPDATE lead_cadence SET updated_at = NOW() WHERE id = $1`,
                        [cadence.id]
                    );

                    created++;
                    console.log(`  ✅ Schedule criado: Lead "${cadence.lead_name}" → SDR "${cadence.sdr_name}" (Step ${cadence.step_atual})`);
                } catch (err) {
                    console.error(`  ❌ Erro ao processar cadência ${cadence.id}:`, err.message);
                }
            }

            console.log(`📊 [CADENCE WORKER] Resultado: ${created} criado(s), ${skipped} pulado(s) (duplicata).`);
        } catch (err) {
            console.error('❌ [CADENCE WORKER] Erro geral:', err.message);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = new CadenceWorker();
