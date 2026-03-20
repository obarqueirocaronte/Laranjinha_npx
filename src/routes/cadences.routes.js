/**
 * Cadences Routes
 * inside-sales-pipeline-beta
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const cadencesController = require('../controllers/cadences.controller');

// ─── Rotas Claude (Etapas 5, 6, 7) ──────────────────────────────────────────

/**
 * POST /api/cadences/apply
 * Manager aplica uma cadência configurada em lote de leads.
 * Body: { cadence_config_id, lead_ids, sdr_assignments, intervalo_retorno_horas?, allow_sdr_override? }
 */
router.post('/apply', authenticate, cadencesController.applyCadence);

/**
 * PUT /api/cadences/:id/step
 * SDR registra resultado de uma tentativa de contato.
 * Body: { outcome, canal, notes?, retorno_manual_em? }
 *
 * REGRA: notes é OBRIGATÓRIO quando outcome = 'reschedule'
 * Outcomes válidos: success | no_answer | busy | voicemail | invalid_number | reschedule
 */
router.put('/:id/step', authenticate, cadencesController.registerStep);

/**
 * PUT /api/cadences/:id/reschedule
 * SDR agenda retorno manualmente para uma cadência ativa.
 * Body: { retorno_em (ISO timestamp), notes }
 *
 * REGRA: notes é OBRIGATÓRIO — contexto do agendamento
 * Cria/atualiza registro em schedules vinculado ao lead_cadence
 */
router.put('/:id/reschedule', authenticate, cadencesController.rescheduleCadence);

// ─── Rotas Antigravity (Etapas 9, 10, 11, 12) ───────────────────────────────

/**
 * GET /api/cadences/status
 * Listagem de cadências ativas com stats de outcomes (últimas 24h).
 * Query: ?sdr_id=UUID&status=ativa|concluida|parada
 */
router.get('/status', authenticate, cadencesController.getCadenceStatus);

/**
 * GET /api/cadences/dashboard
 * Dashboard com 4 zonas de impacto para o manager.
 * Query: ?period=today|7d|30d
 */
router.get('/dashboard', authenticate, cadencesController.getCadencesDashboard);

/**
 * GET /api/cadences/stalled
 * Cadências paradas (proxima_acao_em venceu > 24h sem execução).
 * Query: ?sdr_id=UUID&min_hours=24
 */
router.get('/stalled', authenticate, cadencesController.getStalledCadences);

/**
 * GET /api/cadences/logs
 * Logs de auditoria (imutáveis) com breakdown de outcomes.
 * Query: ?lead_id=UUID&lead_cadence_id=UUID&sdr_id=UUID&outcome=STRING
 */
router.get('/logs', authenticate, cadencesController.getCadenceLogs);

module.exports = router;
