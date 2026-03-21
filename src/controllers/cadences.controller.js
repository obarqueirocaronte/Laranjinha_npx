/**
 * Cadences Controller
 * Reconstrução do sistema de cadências — inside-sales-pipeline-beta
 *
 * Etapas implementadas aqui:
 *   Etapa 5 — POST  /api/cadences/apply        (manager aplica cadência em lote)
 *   Etapa 6 — PUT   /api/cadences/:id/step     (SDR registra resultado da tentativa)
 *   Etapa 7 — PUT   /api/cadences/:id/reschedule (SDR agenda retorno manualmente)
 *
 * Regra central: intervalo_retorno_horas
 *   null → SDR agenda manualmente (cria registro em schedules)
 *   24   → sistema programa proxima_acao_em = NOW() + 24h
 *   48   → sistema programa proxima_acao_em = NOW() + 48h
 *
 * Regra de nota obrigatória:
 *   notes é OBRIGATÓRIO somente quando outcome = 'reschedule'
 *   Para todos os outros outcomes, notes é opcional
 */

const db = require('../config/db');

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

/**
 * Outcomes válidos para registro de ligação.
 * Gravados em cadence_logs.resultado E em call_logs (legado).
 */
const VALID_OUTCOMES = [
  'success',        // Atendeu e converteu
  'no_answer',      // Não atendeu / sem resposta
  'busy',           // Linha ocupada
  'voicemail',      // Caiu na caixa postal
  'invalid_number', // Número inválido ou inexistente
  'reschedule',     // SDR agendou retorno com o lead
];

/**
 * Outcomes que encerram a cadência imediatamente.
 * Independente do step atual.
 */
const OUTCOMES_THAT_CLOSE = ['success', 'invalid_number'];

/**
 * Único outcome que EXIGE nota obrigatória.
 * O SDR deve registrar o contexto do agendamento.
 */
const OUTCOME_REQUIRES_NOTES = 'reschedule';


// ─────────────────────────────────────────────────────────────
// HELPER: buscar SDR pelo user_id autenticado
// ─────────────────────────────────────────────────────────────
async function getSdrId(userId) {
  if (!userId) return null;
  const result = await db.query(
    'SELECT id FROM sdrs WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return result.rows[0]?.id || null;
}


// ─────────────────────────────────────────────────────────────
// ETAPA 5: POST /api/cadences/apply
// Manager aplica uma cadência em lote de leads
// ─────────────────────────────────────────────────────────────
exports.applyCadence = async (req, res, next) => {
  try {
    const {
      cadence_config_id,
      lead_ids,         // optional if filter_type is used
      filter_type,      // optional: 'all_pending' | 'tag' | 'lead'
      filter_value,     // optional value for tag or lead search
      sdr_assignments,  // [{ sdr_id, percentage/quantity }] or [{ sdr_id, lead_ids: [] }]
      intervalo_retorno_horas,
      allow_sdr_override,
      max_steps         // optional pass from frontend
    } = req.body;

    let targetLeadIds = Array.isArray(lead_ids) ? [...lead_ids] : [];

    // Se vier filtro, buscar lead_ids dinamicamente
    if (filter_type) {
      let qs = '';
      const params = [];
      if (filter_type === 'all_pending') {
          qs = `SELECT id FROM leads WHERE qualification_status = 'pending' AND cadence_status != 'ativa'`;
      } else if (filter_type === 'tag') {
          qs = `SELECT id FROM leads WHERE $1 = ANY(tags) AND cadence_status != 'ativa'`;
          params.push(filter_value);
      } else if (filter_type === 'lead') {
          qs = `SELECT id FROM leads WHERE (full_name ILIKE $1 OR company_name ILIKE $1 OR email ILIKE $1) AND cadence_status != 'ativa'`;
          params.push(`%${filter_value}%`);
      }
      if (qs) {
          const result = await db.query(qs, params);
          targetLeadIds = result.rows.map(r => r.id);
      }
    }

    // Validação básica
    if (!targetLeadIds || targetLeadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nenhum lead encontrado para aplicar cadência.' },
      });
    }

    // Buscar configuração da cadência
    let config = null;
    if (cadence_config_id) {
      const configRes = await db.query(
        'SELECT * FROM cadence_configs WHERE id = $1',
        [cadence_config_id]
      );
      config = configRes.rows[0] || null;
    }

    // Resolver intervalo de retorno: body → config → null (SDR manual)
    const intervaloFinal =
      intervalo_retorno_horas !== undefined
        ? intervalo_retorno_horas
        : config?.intervalo_retorno_horas ?? null;

    const allowOverride =
      allow_sdr_override !== undefined
        ? allow_sdr_override
        : config?.allow_sdr_override ?? true;

    const maxStepsFinal =
      max_steps ||
      ((config?.phone_rolls || 0) +
      (config?.whatsapp_rolls || 0) +
      (config?.email_rolls || 0)) || 3;

    // Montar mapa sdr_id → lead_ids para atribuição
    const sdrMap = {};
    if (Array.isArray(sdr_assignments) && sdr_assignments.length > 0) {
      if (sdr_assignments[0].lead_ids) {
        // Formato antigo com lead_ids explícitos
        for (const assignment of sdr_assignments) {
          for (const lid of assignment.lead_ids) {
            sdrMap[lid] = assignment.sdr_id;
          }
        }
      } else {
        // Formato novo com quantity/percentage
        let tIdx = 0;
        for (const assignment of sdr_assignments) {
            const qty = assignment.quantity || Math.floor((assignment.percentage / 100) * targetLeadIds.length);
            for (let i = 0; i < qty && tIdx < targetLeadIds.length; i++) {
                sdrMap[targetLeadIds[tIdx]] = assignment.sdr_id;
                tIdx++;
            }
        }
        // Atribuir o resto ao último SDR (arredondamentos)
        const lastSdr = sdr_assignments[sdr_assignments.length - 1].sdr_id;
        while (tIdx < targetLeadIds.length) {
             sdrMap[targetLeadIds[tIdx]] = lastSdr;
             tIdx++;
        }
      }
    }

    // Proxima ação: 5 minutos a partir de agora (primeira tentativa quase imediata)
    const proximaAcaoBase = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const leadId of targetLeadIds) {
      try {
        const sdrId = sdrMap[leadId] || null;

        // UPSERT — se já existe cadência ativa, pular (UNIQUE constraint em lead_id)
        const upsertRes = await db.query(
          `INSERT INTO lead_cadence (
            lead_id, cadence_config_id, sdr_id, step_atual, max_steps,
            status, intervalo_retorno_horas, proxima_acao_em
          ) VALUES ($1, $2, $3, 1, $4, 'ativa', $5, $6)
          ON CONFLICT (lead_id) DO NOTHING
          RETURNING id`,
          [leadId, cadence_config_id || null, sdrId, maxStepsFinal, intervaloFinal, proximaAcaoBase]
        );

        if (upsertRes.rows.length === 0) {
          // Conflito: lead já tem cadência ativa
          skipped++;
          continue;
        }

        const leadCadenceId = upsertRes.rows[0].id;

        // Log inicial na cadence_logs (acao = 'tentativa', step = 1)
        await db.query(
          `INSERT INTO cadence_logs (lead_id, lead_cadence_id, sdr_id, step, canal, acao)
           VALUES ($1, $2, $3, 1, 'call', 'tentativa')`,
          [leadId, leadCadenceId, sdrId]
        );

        created++;
      } catch (err) {
        errors.push({ lead_id: leadId, error: err.message });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        created,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        intervalo_retorno_horas: intervaloFinal,
        allow_sdr_override: allowOverride,
      },
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────────────────────
// ETAPA 6: PUT /api/cadences/:id/step
// SDR registra o resultado de uma tentativa de contato
// ─────────────────────────────────────────────────────────────
exports.registerStep = async (req, res, next) => {
  try {
    const { id } = req.params;   // lead_cadence.id
    const userId = req.user?.id;
    const {
      outcome,           // OBRIGATÓRIO — um dos VALID_OUTCOMES
      canal,             // 'call' | 'whatsapp' | 'email'
      notes,             // OBRIGATÓRIO quando outcome = 'reschedule'
      retorno_manual_em, // ISO timestamp — informado quando SDR agenda na hora
    } = req.body;

    // ── Validação: outcome obrigatório e válido ──────────────
    if (!outcome) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'outcome é obrigatório' },
      });
    }

    if (!VALID_OUTCOMES.includes(outcome)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `outcome inválido. Valores aceitos: ${VALID_OUTCOMES.join(', ')}`,
        },
      });
    }

    // ── Validação: nota obrigatória para reschedule ──────────
    if (outcome === OUTCOME_REQUIRES_NOTES && (!notes || notes.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOTES_REQUIRED',
          message: 'notes é obrigatório quando outcome = reschedule. Registre o contexto do agendamento.',
        },
      });
    }

    // ── Buscar cadência atual ────────────────────────────────
    const cadenceRes = await db.query(
      'SELECT * FROM lead_cadence WHERE id = $1',
      [id]
    );

    if (cadenceRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cadência não encontrada' },
      });
    }

    const cadence = cadenceRes.rows[0];

    if (cadence.status !== 'ativa') {
      return res.status(409).json({
        success: false,
        error: { code: 'CADENCE_NOT_ACTIVE', message: `Cadência já está ${cadence.status}` },
      });
    }

    const sdrId = cadence.sdr_id || (await getSdrId(userId));
    const stepAtual = cadence.step_atual;
    const maxSteps = cadence.max_steps;
    const intervalo = cadence.intervalo_retorno_horas;

    let novoStatus = 'ativa';
    let novaProximaAcao = null;
    let novoStep = stepAtual;
    let acaoLog = 'tentativa';
    let scheduleId = null;

    // ── Lógica de progressão baseada no outcome ──────────────

    if (OUTCOMES_THAT_CLOSE.includes(outcome)) {
      // Encerra cadência imediatamente (success ou invalid_number)
      novoStatus = 'concluida';
      acaoLog = 'encerramento';

    } else if (outcome === 'reschedule') {
      // SDR agendou retorno — registrar em schedules
      acaoLog = 'agendamento';

      if (retorno_manual_em) {
        novaProximaAcao = retorno_manual_em;

        // Criar registro em schedules para aparecer na agenda do SDR
        const scheduleRes = await db.query(
          `INSERT INTO schedules (lead_id, sdr_id, scheduled_at, type, status, notes, lead_cadence_id, cadence_step)
           VALUES ($1, $2, $3, 'cadence', 'pending', $4, $5, $6)
           RETURNING id`,
          [cadence.lead_id, sdrId, retorno_manual_em, notes, id, stepAtual]
        );
        scheduleId = scheduleRes.rows[0]?.id;
      }
      // Se retorno_manual_em não foi informado, proxima_acao_em fica null — SDR deve agendar depois

    } else {
      // no_answer, busy, voicemail — progressão normal
      novoStep = stepAtual + 1;

      if (novoStep > maxSteps) {
        // Esgotou todos os steps
        novoStatus = 'concluida';
        acaoLog = 'encerramento';
        novoStep = maxSteps; // mantém no último step
      } else {
        // Calcular próxima ação com base na variável de retorno
        if (intervalo === null) {
          // SDR define manualmente — proxima_acao_em fica null
          novaProximaAcao = null;
        } else {
          // Automático: NOW() + intervalo horas
          novaProximaAcao = new Date(
            Date.now() + intervalo * 60 * 60 * 1000
          ).toISOString();
        }
      }
    }

    // ── Atualizar lead_cadence ───────────────────────────────
    await db.query(
      `UPDATE lead_cadence SET
        step_atual       = $1,
        status           = $2,
        resultado_anterior = $3,
        proxima_acao_em  = $4,
        updated_at       = NOW()
       WHERE id = $5`,
      [novoStep, novoStatus, outcome, novaProximaAcao, id]
    );

    // ── Inserir em cadence_logs ──────────────────────────────
    await db.query(
      `INSERT INTO cadence_logs
        (lead_id, lead_cadence_id, sdr_id, step, canal, acao, resultado, notas, retorno_agendado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        cadence.lead_id, id, sdrId,
        stepAtual,
        canal || 'call',
        acaoLog,
        outcome,
        notes || null,
        outcome === 'reschedule' ? retorno_manual_em || null : null,
      ]
    );

    // ── Gravar também em call_logs (compatibilidade com dashboard atual) ──
    await db.query(
      `INSERT INTO call_logs (lead_id, sdr_id, outcome, notes)
       VALUES ($1, $2, $3, $4)`,
      [cadence.lead_id, sdrId, outcome, notes || null]
    );

    return res.json({
      success: true,
      data: {
        lead_cadence_id: id,
        step_executado: stepAtual,
        outcome,
        novo_status: novoStatus,
        novo_step: novoStep,
        proxima_acao_em: novaProximaAcao,
        intervalo_retorno_horas: intervalo,
        schedule_id: scheduleId,
        acao_log: acaoLog,
      },
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────────────────────
// ETAPA 7: PUT /api/cadences/:id/reschedule
// SDR agenda/reagenda retorno manualmente para uma cadência ativa
// (pode sobrescrever intervalo automático se allow_sdr_override = true)
// ─────────────────────────────────────────────────────────────
exports.rescheduleCadence = async (req, res, next) => {
  try {
    const { id } = req.params;  // lead_cadence.id
    const userId = req.user?.id;
    const { retorno_em, notes } = req.body;

    // ── notes é obrigatório neste endpoint (é sempre um agendamento) ──
    if (!retorno_em) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'retorno_em (ISO timestamp) é obrigatório' },
      });
    }

    if (!notes || notes.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOTES_REQUIRED',
          message: 'notes é obrigatório ao agendar retorno. Registre o contexto do agendamento.',
        },
      });
    }

    // ── Buscar cadência ──────────────────────────────────────
    const cadenceRes = await db.query(
      `SELECT lc.*, cc.allow_sdr_override
       FROM lead_cadence lc
       LEFT JOIN cadence_configs cc ON lc.cadence_config_id = cc.id
       WHERE lc.id = $1`,
      [id]
    );

    if (cadenceRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cadência não encontrada' },
      });
    }

    const cadence = cadenceRes.rows[0];

    if (cadence.status !== 'ativa') {
      return res.status(409).json({
        success: false,
        error: { code: 'CADENCE_NOT_ACTIVE', message: `Cadência já está ${cadence.status}` },
      });
    }

    // ── Verificar permissão de override (se config tem allow_sdr_override = false) ──
    if (cadence.allow_sdr_override === false) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'OVERRIDE_NOT_ALLOWED',
          message: 'Esta cadência não permite que o SDR sobrescreva o agendamento automático.',
        },
      });
    }

    const sdrId = cadence.sdr_id || (await getSdrId(userId));

    // ── Atualizar proxima_acao_em em lead_cadence ────────────
    await db.query(
      `UPDATE lead_cadence
       SET proxima_acao_em = $1, updated_at = NOW()
       WHERE id = $2`,
      [retorno_em, id]
    );

    // ── Upsert em schedules (criar ou atualizar agendamento pendente desta cadência) ──
    const existingSchedule = await db.query(
      `SELECT id FROM schedules
       WHERE lead_cadence_id = $1 AND status = 'pending'
       LIMIT 1`,
      [id]
    );

    let scheduleId;
    if (existingSchedule.rows.length > 0) {
      // Atualiza o agendamento pendente existente
      await db.query(
        `UPDATE schedules
         SET scheduled_at = $1, notes = $2, updated_at = NOW()
         WHERE id = $3`,
        [retorno_em, notes, existingSchedule.rows[0].id]
      );
      scheduleId = existingSchedule.rows[0].id;
    } else {
      // Cria novo agendamento
      const newSchedule = await db.query(
        `INSERT INTO schedules (lead_id, sdr_id, scheduled_at, type, status, notes, lead_cadence_id, cadence_step)
         VALUES ($1, $2, $3, 'cadence', 'pending', $4, $5, $6)
         RETURNING id`,
        [cadence.lead_id, sdrId, retorno_em, notes, id, cadence.step_atual]
      );
      scheduleId = newSchedule.rows[0]?.id;
    }

    // ── Log imutável em cadence_logs ─────────────────────────
    await db.query(
      `INSERT INTO cadence_logs
        (lead_id, lead_cadence_id, sdr_id, step, canal, acao, resultado, notas, retorno_agendado_em)
       VALUES ($1, $2, $3, $4, 'call', 'agendamento', 'reschedule', $5, $6)`,
      [cadence.lead_id, id, sdrId, cadence.step_atual, notes, retorno_em]
    );

    // ── Log em call_logs (compatibilidade) ───────────────────
    await db.query(
      `INSERT INTO call_logs (lead_id, sdr_id, outcome, notes)
       VALUES ($1, $2, 'reschedule', $3)`,
      [cadence.lead_id, sdrId, notes]
    );

    return res.json({
      success: true,
      data: {
        lead_cadence_id: id,
        proxima_acao_em: retorno_em,
        schedule_id: scheduleId,
      },
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────────────────────
// ETAPA 9 (Antigravity) — GET /api/cadences/status
// Listagem de cadências para o manager com stats por outcome
// ─────────────────────────────────────────────────────────────
exports.getCadenceStatus = async (req, res, next) => {
  try {
    const { sdr_id, status } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND lc.status = $${params.length}`;
    }
    if (sdr_id) {
      params.push(sdr_id);
      whereClause += ` AND lc.sdr_id = $${params.length}`;
    }

    // Cadências com stats de outcomes dos logs
    const cadenciasRes = await db.query(
      `SELECT
         lc.id,
         lc.lead_id,
         l.full_name        AS lead_name,
         lc.sdr_id,
         s.full_name        AS sdr_name,
         lc.step_atual,
         lc.max_steps,
         lc.status,
         lc.intervalo_retorno_horas,
         lc.proxima_acao_em,
         lc.resultado_anterior,
         lc.created_at,
         -- Horas parada (sem próxima ação)
         CASE
           WHEN lc.proxima_acao_em < NOW() THEN
             ROUND(EXTRACT(EPOCH FROM (NOW() - lc.proxima_acao_em))/3600)
           ELSE 0
         END AS horas_parada
       FROM lead_cadence lc
       JOIN leads l ON lc.lead_id = l.id
       LEFT JOIN sdrs s ON lc.sdr_id = s.id
       ${whereClause}
       ORDER BY lc.proxima_acao_em ASC NULLS LAST
       LIMIT 100`,
      params
    );

    // Totais por status
    const statsRes = await db.query(
      `SELECT status, COUNT(*) as total FROM lead_cadence GROUP BY status`
    );
    const stats = Object.fromEntries(
      statsRes.rows.map((r) => [r.status, parseInt(r.total)])
    );

    // Breakdown de outcomes (últimas 24h) — para o manager acompanhar produtividade
    const outcomesRes = await db.query(
      `SELECT resultado, COUNT(*) as total
       FROM cadence_logs
       WHERE timestamp >= NOW() - INTERVAL '24 hours'
         AND resultado IS NOT NULL
       GROUP BY resultado
       ORDER BY total DESC`
    );

    return res.json({
      success: true,
      data: {
        totais: {
          ativas: stats['ativa'] || 0,
          concluidas: stats['concluida'] || 0,
          paradas: stats['parada'] || 0,
        },
        outcomes_24h: outcomesRes.rows,
        cadencias: cadenciasRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────────────────────
// ETAPA 12 (Antigravity) — GET /api/logs/cadence
// Logs de auditoria de uma cadência (por lead ou por lead_cadence)
// Inclui breakdown completo de outcomes para o manager dashboard
// ─────────────────────────────────────────────────────────────
exports.getCadenceLogs = async (req, res, next) => {
  try {
    const { lead_id, lead_cadence_id, sdr_id, outcome } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (lead_id) {
      params.push(lead_id);
      whereClause += ` AND cl.lead_id = $${params.length}`;
    }
    if (lead_cadence_id) {
      params.push(lead_cadence_id);
      whereClause += ` AND cl.lead_cadence_id = $${params.length}`;
    }
    if (sdr_id) {
      params.push(sdr_id);
      whereClause += ` AND cl.sdr_id = $${params.length}`;
    }
    if (outcome) {
      params.push(outcome);
      whereClause += ` AND cl.resultado = $${params.length}`;
    }

    const logsRes = await db.query(
      `SELECT
         cl.id,
         cl.step,
         cl.canal,
         cl.acao,
         cl.resultado,
         cl.notas,
         cl.retorno_agendado_em,
         cl.timestamp,
         s.full_name AS sdr_name,
         l.full_name AS lead_name
       FROM cadence_logs cl
       JOIN leads l ON cl.lead_id = l.id
       LEFT JOIN sdrs s ON cl.sdr_id = s.id
       ${whereClause}
       ORDER BY cl.timestamp DESC
       LIMIT 200`,
      params
    );

    // Contagem por outcome para exibir no manager dashboard
    const outcomeSummary = logsRes.rows.reduce((acc, row) => {
      if (row.resultado) {
        acc[row.resultado] = (acc[row.resultado] || 0) + 1;
      }
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        total: logsRes.rows.length,
        outcome_summary: outcomeSummary,
        logs: logsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────────────────────
// ETAPA 10 (Antigravity) — GET /api/cadences/dashboard
// Dashboard com 4 zonas de impacto para o manager
// ─────────────────────────────────────────────────────────────
exports.getCadencesDashboard = async (req, res, next) => {
  try {
    const { period, sdr_id } = req.query; // 'today' | '7d' | '30d', optional sdr_id

    // Calcular filtro de data
    let dateFilter = '';
    if (period === 'today') {
      dateFilter = "AND lc.created_at >= CURRENT_DATE";
    } else if (period === '7d') {
      dateFilter = "AND lc.created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "AND lc.created_at >= NOW() - INTERVAL '30 days'";
    }

    // Filtro de SDR
    let sdrFilter = '';
    const paramsSdr = [];
    if (sdr_id) {
      paramsSdr.push(sdr_id);
      sdrFilter = `AND lc.sdr_id = $${paramsSdr.length}`;
    }

    // ── ZONA CRÍTICA: cadências paradas > 24h ──────────────────
    const criticaRes = await db.query(
      `SELECT lc.id, lc.lead_id, l.full_name AS lead_name, l.company_name,
              s.full_name AS sdr_name, lc.step_atual, lc.max_steps,
              lc.proxima_acao_em,
              ROUND(EXTRACT(EPOCH FROM (NOW() - lc.proxima_acao_em))/3600) AS horas_parada
       FROM lead_cadence lc
       JOIN leads l ON lc.lead_id = l.id
       LEFT JOIN sdrs s ON lc.sdr_id = s.id
       WHERE lc.status = 'ativa'
         AND lc.proxima_acao_em < NOW() - INTERVAL '24 hours'
         ${sdrFilter}
       ORDER BY lc.proxima_acao_em ASC
       LIMIT 50`,
      paramsSdr
    );

    // ── ZONA PROGRESSO: cadências ativas em andamento ──────────
    const progressoRes = await db.query(
      `SELECT lc.step_atual, COUNT(*) AS total
       FROM lead_cadence lc
       WHERE lc.status = 'ativa' ${sdrFilter}
       GROUP BY lc.step_atual
       ORDER BY lc.step_atual`,
      paramsSdr
    );

    const progressoLeadsRes = await db.query(
      `SELECT lc.id, lc.lead_id, l.full_name AS lead_name,
              s.full_name AS sdr_name, lc.step_atual, lc.max_steps,
              lc.proxima_acao_em, lc.resultado_anterior,
              lc.intervalo_retorno_horas
       FROM lead_cadence lc
       JOIN leads l ON lc.lead_id = l.id
       LEFT JOIN sdrs s ON lc.sdr_id = s.id
       WHERE lc.status = 'ativa'
         AND (lc.proxima_acao_em IS NULL OR lc.proxima_acao_em >= NOW() - INTERVAL '24 hours')
         ${sdrFilter}
       ORDER BY lc.proxima_acao_em ASC NULLS LAST
       LIMIT 50`,
      paramsSdr
    );

    // ── ZONA CONVERSÃO: cadências concluídas ───────────────────
    const conversaoRes = await db.query(
      `SELECT
         COUNT(*) AS total_concluidas,
         COUNT(*) FILTER (WHERE resultado_anterior = 'success') AS atendeu,
         COUNT(*) FILTER (WHERE resultado_anterior NOT IN ('success', 'invalid_number') OR resultado_anterior IS NULL) AS esgotado,
         COUNT(*) FILTER (WHERE resultado_anterior = 'invalid_number') AS numero_invalido
       FROM lead_cadence lc
       WHERE status = 'concluida' ${dateFilter} ${sdrFilter}`,
      paramsSdr
    );

    const conv = conversaoRes.rows[0];
    const totalConcluidas = parseInt(conv.total_concluidas) || 0;
    const atendeu = parseInt(conv.atendeu) || 0;
    const taxaConversao = totalConcluidas > 0
      ? ((atendeu / totalConcluidas) * 100).toFixed(1) + '%'
      : '0%';

    // ── ZONA SDR: performance por SDR ──────────────────────────
    const sdrRes = await db.query(
      `SELECT
         s.id AS sdr_id,
         s.full_name AS sdr_name,
         COUNT(*) FILTER (WHERE lc.status = 'ativa') AS leads_ativos,
         COUNT(*) FILTER (WHERE lc.status = 'ativa' AND lc.proxima_acao_em IS NOT NULL AND lc.proxima_acao_em >= NOW() - INTERVAL '24 hours') AS em_progresso,
         COUNT(*) FILTER (WHERE lc.status = 'concluida') AS concluidas,
         COUNT(*) FILTER (WHERE lc.status = 'concluida' AND lc.resultado_anterior = 'success') AS conversoes,
         CASE
           WHEN COUNT(*) FILTER (WHERE lc.status = 'concluida') > 0
           THEN ROUND((COUNT(*) FILTER (WHERE lc.status = 'concluida' AND lc.resultado_anterior = 'success')::numeric /
                  COUNT(*) FILTER (WHERE lc.status = 'concluida')) * 100, 1)
           ELSE 0
         END AS taxa_conversao
       FROM sdrs s
       LEFT JOIN lead_cadence lc ON lc.sdr_id = s.id ${dateFilter ? dateFilter.replace('lc.', 'lc.') : ''}
       ${sdr_id ? `WHERE s.id = $1` : ''}
       GROUP BY s.id, s.full_name
       ORDER BY leads_ativos DESC`,
      paramsSdr
    );

    // ── OUTCOME SUMMARY: contagem por resultado ──────────────
    const outcomeSummaryRes = await db.query(
      `SELECT
         cl.resultado,
         COUNT(*) AS total,
         s.full_name AS sdr_name,
         cl.sdr_id
       FROM cadence_logs cl
       LEFT JOIN sdrs s ON cl.sdr_id = s.id
       WHERE cl.resultado IS NOT NULL ${dateFilter ? dateFilter.replace('lc.', 'cl.') : ''}
       ${sdr_id ? `AND cl.sdr_id = $1` : ''}
       GROUP BY cl.resultado, s.full_name, cl.sdr_id
       ORDER BY total DESC`,
      paramsSdr
    );

    // Aggregate outcomes
    const outcomeTotals = {};
    const outcomeBySdr = {};
    for (const row of outcomeSummaryRes.rows) {
      const r = row.resultado;
      outcomeTotals[r] = (outcomeTotals[r] || 0) + parseInt(row.total);
      if (!outcomeBySdr[row.sdr_id]) outcomeBySdr[row.sdr_id] = { sdr_name: row.sdr_name, outcomes: {} };
      outcomeBySdr[row.sdr_id].outcomes[r] = parseInt(row.total);
    }

    // ── SCHEDULED RETURNS: retornos agendados com data ──────
    const scheduledReturnsRes = await db.query(
      `SELECT
         sc.id, sc.lead_id, sc.sdr_id, sc.scheduled_at, sc.status, sc.notes,
         l.full_name AS lead_name, l.company_name,
         s.full_name AS sdr_name
       FROM schedules sc
       JOIN leads l ON sc.lead_id = l.id
       LEFT JOIN sdrs s ON sc.sdr_id = s.id
       WHERE sc.status = 'pending' AND sc.scheduled_at >= NOW() - INTERVAL '7 days'
       ${sdr_id ? `AND sc.sdr_id = $1` : ''}
       ORDER BY sc.scheduled_at ASC
       LIMIT 100`,
      paramsSdr
    );

    // Montar por_step
    const porStep = {};
    for (const row of progressoRes.rows) {
      porStep[`step_${row.step_atual}`] = parseInt(row.total);
    }


    // ── ACTIVITY STATS: ligações, emails, whatsapp do banco ──
    const activityDateFilter = period === 'today'
      ? "AND cl2.timestamp >= CURRENT_DATE"
      : period === '7d'
        ? "AND cl2.timestamp >= NOW() - INTERVAL '7 days'"
        : period === '30d'
          ? "AND cl2.timestamp >= NOW() - INTERVAL '30 days'"
          : '';

    const activitySdrFilter = sdr_id ? `AND cl2.sdr_id = $1` : '';

    const activityRes = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE cl2.canal = 'call') AS total_ligacoes,
         COUNT(*) FILTER (WHERE cl2.canal = 'email') AS total_emails,
         COUNT(*) FILTER (WHERE cl2.canal = 'whatsapp') AS total_whatsapp,
         COUNT(*) AS total_atividades
       FROM cadence_logs cl2
       WHERE cl2.acao = 'tentativa'
         ${activityDateFilter}
         ${activitySdrFilter}`,
      paramsSdr
    );

    const activityStats = activityRes.rows[0] || {
      total_ligacoes: 0, total_emails: 0, total_whatsapp: 0, total_atividades: 0
    };

    // ── CADÊNCIAS PENDENTES: leads sem cadência ativa ────────
    const pendentesRes = await db.query(
      `SELECT COUNT(*) AS total
       FROM leads l
       WHERE l.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM lead_cadence lc_inner
           WHERE lc_inner.lead_id = l.id AND lc_inner.status = 'ativa'
         )`
    );

    const cadenciasPendentes = parseInt(pendentesRes.rows[0]?.total) || 0;

    // ── ATIVIDADES POR SDR (do banco) ────────────────────────
    const activityBySdrRes = await db.query(
      `SELECT
         s.id AS sdr_id,
         s.full_name AS sdr_name,
         COUNT(*) FILTER (WHERE cl3.canal = 'call') AS ligacoes,
         COUNT(*) FILTER (WHERE cl3.canal = 'email') AS emails,
         COUNT(*) FILTER (WHERE cl3.canal = 'whatsapp') AS whatsapp,
         COUNT(*) AS total
       FROM cadence_logs cl3
       LEFT JOIN sdrs s ON cl3.sdr_id = s.id
       WHERE cl3.acao = 'tentativa'
         ${activityDateFilter.replace(/cl2/g, 'cl3')}
         ${activitySdrFilter.replace(/cl2/g, 'cl3')}
       GROUP BY s.id, s.full_name
       ORDER BY total DESC`,
      paramsSdr
    );

    return res.json({
      success: true,
      data: {
        zona_critica: {
          total: criticaRes.rows.length,
          leads: criticaRes.rows,
        },
        zona_progresso: {
          total: progressoLeadsRes.rows.length,
          por_step: porStep,
          leads: progressoLeadsRes.rows,
        },
        zona_conversao: {
          total_concluidas: totalConcluidas,
          atendeu,
          esgotado: parseInt(conv.esgotado) || 0,
          numero_invalido: parseInt(conv.numero_invalido) || 0,
          taxa_conversao: taxaConversao,
        },
        zona_sdr: sdrRes.rows,
        outcome_summary: outcomeTotals,
        outcome_by_sdr: outcomeBySdr,
        scheduled_returns: scheduledReturnsRes.rows,
        activity_stats: {
          total_ligacoes: parseInt(activityStats.total_ligacoes) || 0,
          total_emails: parseInt(activityStats.total_emails) || 0,
          total_whatsapp: parseInt(activityStats.total_whatsapp) || 0,
          total_atividades: parseInt(activityStats.total_atividades) || 0,
        },
        cadencias_pendentes: cadenciasPendentes,
        activity_by_sdr: activityBySdrRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────────────────────
// ETAPA 11 (Antigravity) — GET /api/cadences/stalled
// Cadências paradas (proxima_acao_em venceu > 24h, ninguém executou)
// ─────────────────────────────────────────────────────────────
exports.getStalledCadences = async (req, res, next) => {
  try {
    const { sdr_id, min_hours } = req.query;

    const hoursThreshold = parseInt(min_hours) || 24;

    let whereExtra = '';
    const params = [hoursThreshold];

    if (sdr_id) {
      params.push(sdr_id);
      whereExtra += ` AND lc.sdr_id = $${params.length}`;
    }

    const stalledRes = await db.query(
      `SELECT
         lc.id,
         lc.lead_id,
         l.full_name AS lead_name,
         l.company_name,
         s.full_name AS sdr_name,
         s.id AS sdr_id,
         lc.step_atual,
         lc.max_steps,
         lc.status,
         lc.intervalo_retorno_horas,
         lc.proxima_acao_em,
         lc.resultado_anterior,
         lc.created_at,
         ROUND(EXTRACT(EPOCH FROM (NOW() - lc.proxima_acao_em))/3600) AS horas_parada
       FROM lead_cadence lc
       JOIN leads l ON lc.lead_id = l.id
       LEFT JOIN sdrs s ON lc.sdr_id = s.id
       WHERE lc.status = 'ativa'
         AND lc.proxima_acao_em < NOW() - ($1 || ' hours')::INTERVAL
         ${whereExtra}
       ORDER BY lc.proxima_acao_em ASC
       LIMIT 100`,
      params
    );

    // Agrupar por SDR para facilitar a visualização
    const porSdr = {};
    for (const row of stalledRes.rows) {
      const sdrName = row.sdr_name || 'Sem SDR';
      if (!porSdr[sdrName]) {
        porSdr[sdrName] = { sdr_id: row.sdr_id, count: 0, leads: [] };
      }
      porSdr[sdrName].count++;
      porSdr[sdrName].leads.push(row);
    }

    return res.json({
      success: true,
      data: {
        total: stalledRes.rows.length,
        threshold_hours: hoursThreshold,
        por_sdr: porSdr,
        cadencias: stalledRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};
