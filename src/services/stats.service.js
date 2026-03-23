const db = require('../config/db');

class StatsService {
    /**
     * Get stats for the current SDR.
     * For now, we'll return aggregate stats or per-SDR stats.
     */
    async getStats(sdrId, period = 'all') {
        let callWhere = ["sdr_id = $1"];
        let intWhere = ["sdr_id = $1"];
        let compWhere = ["sdr_id = $1"];

        if (period === 'hoje') {
            callWhere.push("created_at >= CURRENT_DATE");
            intWhere.push("created_at >= CURRENT_DATE");
            compWhere.push("completed_at >= CURRENT_DATE");
        } else if (period === 'semana') {
            const startOfWeek = "DATE_TRUNC('week', CURRENT_DATE)";
            callWhere.push(`created_at >= ${startOfWeek}`);
            intWhere.push(`created_at >= ${startOfWeek}`);
            compWhere.push(`completed_at >= ${startOfWeek}`);
        } else if (period === 'mes') {
            const startOfMonth = "DATE_TRUNC('month', CURRENT_DATE)";
            callWhere.push(`created_at >= ${startOfMonth}`);
            intWhere.push(`created_at >= ${startOfMonth}`);
            compWhere.push(`completed_at >= ${startOfMonth}`);
        }

        // Build WHERE/AND filter strings from arrays
        const dateFilterCall = callWhere.length > 0 ? `WHERE ${callWhere.join(' AND ')}` : '';
        const andFilterCall = callWhere.length > 0 ? `AND ${callWhere.join(' AND ')}` : '';
        const dateFilterInt = intWhere.length > 0 ? `WHERE ${intWhere.join(' AND ')}` : '';
        const andFilterInt = intWhere.length > 0 ? `AND ${intWhere.join(' AND ')}` : '';
        const dateFilterComp = compWhere.length > 0 ? `WHERE ${compWhere.join(' AND ')}` : '';

        // dateFilterCl for cadence_logs (uses 'timestamp' instead of 'created_at')
        const clWhere = callWhere.map(w => w.replace('created_at', 'timestamp'));
        const dateFilterCl = clWhere.length > 0 ? `WHERE ${clWhere.join(' AND ')}` : '';
        const andFilterCl = clWhere.length > 0 ? `AND ${clWhere.join(' AND ')}` : '';

        // Query logs for accurate activity counts for this specific SDR
        const sql = `
            SELECT 
                ((SELECT COUNT(*)::integer FROM call_logs ${dateFilterCall}) + 
                 (SELECT COUNT(*)::integer FROM cadence_logs ${dateFilterCl ? dateFilterCl + ' AND' : 'WHERE'} canal = 'call' AND acao = 'tentativa' ${andFilterCall.replace(/created_at/g, 'timestamp')})) as calls,
                ((SELECT COUNT(*)::integer FROM interactions_log ${dateFilterInt ? dateFilterInt + ' AND' : 'WHERE'} action_type = 'EMAIL_SENT') +
                 (SELECT COUNT(*)::integer FROM cadence_logs ${dateFilterCl ? dateFilterCl + ' AND' : 'WHERE'} canal = 'email' AND acao = 'tentativa')) as emails,
                ((SELECT COUNT(*)::integer FROM interactions_log ${dateFilterInt ? dateFilterInt + ' AND' : 'WHERE'} action_type = 'WHATSAPP_SENT') + 
                 (SELECT COUNT(*)::integer FROM cadence_logs ${dateFilterCl ? dateFilterCl + ' AND' : 'WHERE'} canal = 'whatsapp' AND acao = 'tentativa')) as whatsapp,
                ((SELECT COUNT(*)::integer FROM cadence_completions ${dateFilterComp}) +
                 (SELECT COUNT(*)::integer FROM lead_cadence ${dateFilterComp ? dateFilterComp.replace('completed_at', 'updated_at') + ' AND' : 'WHERE'} status = 'concluida')) as completed_leads
        `;
        const res = await db.query(sql, [sdrId]);
        return res.rows[0];
    }

    /**
     * Increment an activity counter.
     * sdrOrUserId can be either the SDR UUID or the User UUID.
     */
    async updateActivity(sdrOrUserId, type) {
        // Map frontend types to backend DB columns
        const typeMap = {
            'call': 'calls',
            'email': 'emails',
            'whatsapp': 'whatsapp',
            'calls': 'calls',
            'emails': 'emails'
        };

        if (!['contato', 'agendamento', 'reuniao', 'conexao', 'no-show', 'venda', 'perda'].includes(type)) {
            return;
        }

        // 1. Try to find the SDR by ID or user_id
        let sdrRes = await db.query(
            'SELECT id FROM sdrs WHERE id = $1 OR user_id = $1',
            [sdrOrUserId]
        );

        let finalSdrId;

        if (sdrRes.rows.length > 0) {
            finalSdrId = sdrRes.rows[0].id;
        } else {
            // 2. If not found, check if it's a valid user_id
            const userRes = await db.query('SELECT id, full_name, email FROM users WHERE id = $1', [sdrOrUserId]);
            if (userRes.rows.length === 0) {
                throw new Error('User not found and no SDR profile exists for tracking');
            }

            // 3. Create a minimal SDR profile for this user to enable tracking
            const user = userRes.rows[0];
            const insertSdr = await db.query(
                'INSERT INTO sdrs (user_id, full_name, email) VALUES ($1, $2, $3) RETURNING id',
                [user.id, user.full_name, user.email]
            );
            finalSdrId = insertSdr.rows[0].id;
        }

        const sql = `
            INSERT INTO sdr_stats (sdr_id, ${dbType})
            VALUES ($1, 1)
            ON CONFLICT (sdr_id)
            DO UPDATE SET ${dbType} = sdr_stats.${dbType} + 1, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const res = await db.query(sql, [finalSdrId]);
        return res.rows[0];
    }

    /**
     * Reset stats (clear data).
     */
    async resetStats(sdrId) {
        const sql = `
            UPDATE sdr_stats
            SET calls = 0, emails = 0, whatsapp = 0, completed_leads = 0, updated_at = CURRENT_TIMESTAMP
            WHERE sdr_id = $1
            RETURNING *
        `;
        const res = await db.query(sql, [sdrId]);
        return res.rows[0];
    }

    /**
     * Increment completed leads (trophy).
     */
    async incrementCompletedLeads(sdrId) {
        const sql = `
            INSERT INTO sdr_stats (sdr_id, completed_leads)
            VALUES ($1, 1)
            ON CONFLICT (sdr_id)
            DO UPDATE SET completed_leads = sdr_stats.completed_leads + 1, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const res = await db.query(sql, [sdrId]);
        return res.rows[0];
    }

    /**
     * Get aggregate stats for all SDRs and lead counts per column.
     * Now includes individual breakdown with goals, active leads, and pipeline moves.
     */
    /**
     * Get aggregate stats for all SDRs and lead counts per column.
     * Now includes individual breakdown with goals, active leads, and pipeline moves.
     * Supports filtering by period: 'hoje', 'semana', 'mes', 'tudo'.
     */
    async getGlobalStats(period = 'all', sdrIds = [], customStartDate = null, customEndDate = null) {
        let callWhere = [];
        let intWhere = [];
        let compWhere = [];
        let moveWhere = [];
        let params = [];

        const addCondition = (field, start, end) => {
            let clauses = [];
            if (start) {
                clauses.push(`${field} >= $${params.length + 1}`);
                params.push(start);
            }
            if (end) {
                clauses.push(`${field} <= $${params.length + 1}`);
                params.push(end);
            }
            return clauses;
        };

        if (customStartDate || customEndDate) {
            callWhere.push(...addCondition('created_at', customStartDate, customEndDate));
            intWhere.push(...addCondition('created_at', customStartDate, customEndDate));
            compWhere.push(...addCondition('completed_at', customStartDate, customEndDate));
            moveWhere.push(...addCondition('moved_at', customStartDate, customEndDate));
        } else if (period === 'hoje') {
            callWhere.push("created_at >= CURRENT_DATE");
            intWhere.push("created_at >= CURRENT_DATE");
            compWhere.push("completed_at >= CURRENT_DATE");
            moveWhere.push("moved_at >= CURRENT_DATE");
        } else if (period === 'semana') {
            const startOfWeek = "DATE_TRUNC('week', CURRENT_DATE)";
            callWhere.push(`created_at >= ${startOfWeek}`);
            intWhere.push(`created_at >= ${startOfWeek}`);
            compWhere.push(`completed_at >= ${startOfWeek}`);
            moveWhere.push(`moved_at >= ${startOfWeek}`);
        } else if (period === 'mes') {
            const startOfMonth = "DATE_TRUNC('month', CURRENT_DATE)";
            callWhere.push(`created_at >= ${startOfMonth}`);
            intWhere.push(`created_at >= ${startOfMonth}`);
            compWhere.push(`completed_at >= ${startOfMonth}`);
            moveWhere.push(`moved_at >= ${startOfMonth}`);
        }

        const dateFilterCall = callWhere.length > 0 ? `WHERE ${callWhere.join(' AND ')}` : '';
        const andFilterCall = callWhere.length > 0 ? `AND ${callWhere.join(' AND ')}` : '';
        const andFilterInt = intWhere.length > 0 ? `AND ${intWhere.join(' AND ')}` : '';
        const dateFilterComp = compWhere.length > 0 ? `WHERE ${compWhere.join(' AND ')}` : '';
        const andFilterComp = compWhere.length > 0 ? `AND ${compWhere.join(' AND ')}` : '';
        const dateFilterMove = moveWhere.length > 0 ? `WHERE ${moveWhere.join(' AND ')}` : '';

        // SDR filtering
        let sdrFilterLog = ''; 
        let sdrFilterLeads = ''; 
        
        if (sdrIds && sdrIds.length > 0) {
            const placeholders = sdrIds.map((_, i) => `$${params.length + i + 1}`).join(',');
            sdrFilterLog = `AND sdr_id IN (${placeholders})`;
            sdrFilterLeads = `AND assigned_sdr_id IN (${placeholders})`;
            params.push(...sdrIds);
        }

        const clWhere = callWhere.map(w => w.replace('created_at', 'timestamp'));
        const dateFilterCl = clWhere.length > 0 ? `WHERE ${clWhere.join(' AND ')}` : '';
        const andFilterCl = clWhere.length > 0 ? `AND ${clWhere.join(' AND ')}` : '';

        const combine = (...parts) => {
          const valid = parts.filter(p => p && p.trim());
          if (valid.length === 0) return '';
          const clauses = valid.map(p => p.replace(/^\s*(WHERE|AND)\s+/i, '').trim()).filter(Boolean);
          return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
        };

        const activitySql = `
            SELECT 
                ((SELECT COUNT(*)::integer FROM call_logs ${combine(dateFilterCall, sdrFilterLog)}) + 
                 (SELECT COUNT(*)::integer FROM cadence_logs ${combine(dateFilterCl, sdrFilterLog, "canal = 'call' AND acao = 'tentativa'")})) as total_calls,
                ((SELECT COUNT(*)::integer FROM interactions_log ${combine("action_type = 'EMAIL_SENT'", andFilterInt ? andFilterInt.replace(/^AND\s+/, '') : '', sdrFilterLog)}) + 
                 (SELECT COUNT(*)::integer FROM cadence_logs ${combine("canal = 'email' AND acao = 'tentativa'", andFilterCl ? andFilterCl.replace(/^AND\s+/, '') : '', sdrFilterLog)})) as total_emails,
                ((SELECT COUNT(*)::integer FROM interactions_log ${combine("action_type = 'WHATSAPP_SENT'", andFilterInt ? andFilterInt.replace(/^AND\s+/, '') : '', sdrFilterLog)}) +
                 (SELECT COUNT(*)::integer FROM cadence_logs ${combine("canal = 'whatsapp' AND acao = 'tentativa'", andFilterCl ? andFilterCl.replace(/^AND\s+/, '') : '', sdrFilterLog)})) as total_whatsapp,
                ((SELECT COUNT(*)::integer FROM cadence_completions ${combine(dateFilterComp, sdrFilterLog)}) +
                 (SELECT COUNT(*)::integer FROM lead_cadence ${combine(dateFilterComp ? dateFilterComp.replace('completed_at', 'updated_at') : '', sdrFilterLog, "status = 'concluida'")})) as total_completed
        `;
        
        const activityRes = await db.query(activitySql, params);

        const columnSql = `
            SELECT pc.name, COUNT(l.id)::integer as count
            FROM pipeline_columns pc
            LEFT JOIN leads l ON pc.id = l.current_column_id ${sdrFilterLeads}
            GROUP BY pc.id, pc.name, pc.position
            ORDER BY pc.position
        `;
        const columnRes = await db.query(columnSql, sdrIds && sdrIds.length > 0 ? params.slice(params.length - sdrIds.length) : []);

        const activeLeadsSql = `SELECT COUNT(id)::integer as count FROM leads WHERE status = 'active' ${sdrFilterLeads}`;
        const activeLeadsRes = await db.query(activeLeadsSql, sdrIds && sdrIds.length > 0 ? params.slice(params.length - sdrIds.length) : []);
        const totalActiveLeads = activeLeadsRes.rows[0].count;

        const sdrSql = `
            WITH movement_counts AS (
                SELECT moved_by_sdr_id, COUNT(id) as movements
                FROM lead_pipeline_history
                ${dateFilterMove}
                GROUP BY moved_by_sdr_id
            ),
            active_counts AS (
                SELECT assigned_sdr_id, COUNT(id) as pending_leads
                FROM leads
                WHERE status = 'active'
                GROUP BY assigned_sdr_id
            ),
            cadence_counts AS (
                SELECT sdr_id,
                    COUNT(*) FILTER (WHERE status IN ('ativo','pausado','concluido','esgotado')) as total_in_cadence,
                    COUNT(*) FILTER (WHERE status IN ('concluido','esgotado')) as total_finished
                FROM lead_cadence
                GROUP BY sdr_id
            )
            SELECT 
                s.id,
                s.full_name,
                s.email,
                s.user_id,
                u.profile_picture_url,
                s.total_leads_assigned,
                COALESCE(ac.pending_leads, 0)::integer as pending_leads,
                COALESCE(mc.movements, 0)::integer as pipeline_movements,
                (SELECT COUNT(*)::integer FROM call_logs cl WHERE cl.sdr_id = s.id ${andFilterCall}) as calls,
                (SELECT COUNT(*)::integer FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'EMAIL_SENT' ${andFilterInt}) as emails,
                (SELECT COUNT(*)::integer FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'WHATSAPP_SENT' ${andFilterInt}) as whatsapp,
                (SELECT COUNT(*)::integer FROM cadence_completions cc WHERE cc.sdr_id = s.id ${andFilterComp}) as completed,
                COALESCE(cdc.total_in_cadence, 0)::integer as total_in_cadence,
                COALESCE(cdc.total_finished, 0)::integer as total_finished,
                CASE WHEN COALESCE(s.total_leads_assigned, 0) > 0
                    THEN ROUND(
                        (COALESCE((SELECT COUNT(DISTINCT lead_id) FROM call_logs WHERE sdr_id = s.id), 0)
                         + COALESCE((SELECT COUNT(DISTINCT lead_id) FROM interactions_log WHERE sdr_id = s.id), 0))::numeric
                        / s.total_leads_assigned * 100, 1)
                    ELSE 0 END as pct_tratativa,
                CASE WHEN COALESCE(cdc.total_in_cadence, 0) > 0
                    THEN ROUND(COALESCE(cdc.total_finished, 0)::numeric / cdc.total_in_cadence * 100, 1)
                    ELSE 0 END as pct_conclusao,
                s.goal_calls,
                s.goal_emails,
                s.goal_whatsapp,
                s.goal_completed
            FROM sdrs s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN movement_counts mc ON s.id = mc.moved_by_sdr_id
            LEFT JOIN active_counts ac ON s.id = ac.assigned_sdr_id
            LEFT JOIN cadence_counts cdc ON s.id = cdc.sdr_id
            WHERE s.is_active = true ${sdrIds && sdrIds.length > 0 ? `AND s.id IN (${sdrIds.map((_, i) => `$${params.length - sdrIds.length + i + 1}`).join(',')})` : ''}
            ORDER BY s.full_name ASC
        `;
        
        const sdrRes = await db.query(sdrSql, params);

        return {
            summary: {
                ...activityRes.rows[0],
                total_active: totalActiveLeads,
                columns: columnRes.rows
            },
            sdrs: sdrRes.rows
        };
    }

    /**
     * Get raw history logs for dashboard analysis (day/week/month).
     * Includes unified interactions from interactions_log and call_logs.
     */
    async getStatsHistory() {
        // Fetch interactions (calls, emails, whatsapp) - last 30 days
        // Unifying interactions_log and call_logs
        const interactionsSql = `
            SELECT 'CALL_MADE' as action_type, created_at, sdr_id
            FROM call_logs
            WHERE created_at >= NOW() - INTERVAL '30 days'
            UNION ALL
            SELECT action_type, created_at, sdr_id
            FROM interactions_log
            WHERE created_at >= NOW() - INTERVAL '30 days'
            ORDER BY created_at DESC
        `;
        const interactionsRes = await db.query(interactionsSql);

        // Fetch pipeline movements - last 30 days
        const pipelineSql = `
            SELECT from_column_id, to_column_id, moved_at, moved_by_sdr_id
            FROM lead_pipeline_history
            WHERE moved_at >= NOW() - INTERVAL '30 days'
            ORDER BY moved_at DESC
        `;
        const pipelineRes = await db.query(pipelineSql);

        // Fetch cadence completions - last 30 days
        const completionSql = `
            SELECT final_outcome, completed_at, sdr_id
            FROM cadence_completions
            WHERE completed_at >= NOW() - INTERVAL '30 days'
            ORDER BY completed_at DESC
        `;
        const completionRes = await db.query(completionSql);

        return {
            interactions: interactionsRes.rows,
            movements: pipelineRes.rows,
            completions: completionRes.rows
        };
    }

    /**
     * Get the management report configuration.
     */
    async getReportConfig() {
        const sql = `SELECT * FROM management_report_config LIMIT 1`;
        const res = await db.query(sql);
        return res.rows[0] || null;
    }

    /**
     * Update the management report configuration.
     */
    async updateReportConfig(config) {
        const { webhook_url, schedule_times, is_active, last_sent_at, sdr_ids } = config;
        
        // Since there's only one row, we can just update all
        const sql = `
            UPDATE management_report_config
            SET webhook_url = $1, 
                schedule_times = $2, 
                is_active = $3, 
                last_sent_at = $4,
                sdr_ids = $5,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const res = await db.query(sql, [webhook_url, schedule_times, is_active, last_sent_at, JSON.stringify(sdr_ids || [])]);
        
        if (res.rows.length === 0) {
            // If somehow deleted, re-insert
            const insertSql = `
                INSERT INTO management_report_config (webhook_url, schedule_times, is_active, sdr_ids)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const insertRes = await db.query(insertSql, [webhook_url, schedule_times, is_active, JSON.stringify(sdr_ids || [])]);
            return insertRes.rows[0];
        }

        return res.rows[0];
    }

    /**
     * Get detailed BI stats for the premium dashboard.
     * Supports filtering by SDR and custom date range.
     */
    async getBIFullStats(sdrId = 'all', startDate = null, endDate = null) {
        const w = (sdrField, dateField) => {
            const clauses = [];
            const p = [];
            if (sdrId && sdrId !== 'all') {
                clauses.push(`${sdrField} = $${p.length + 1}`);
                p.push(sdrId);
            }
            if (startDate) {
                clauses.push(`${dateField} >= $${p.length + 1}`);
                p.push(startDate + ' 00:00:00');
            }
            if (endDate) {
                clauses.push(`${dateField} <= $${p.length + 1}`);
                p.push(endDate + ' 23:59:59');
            }
            return { where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', params: p };
        };

        const wCalls   = w('sdr_id', 'created_at');
        const wInt     = w('sdr_id', 'created_at');
        const wComp    = w('sdr_id', 'completed_at');
        const wLeads   = w('assigned_sdr_id', 'created_at');
        const wCad     = w('sdr_id', 'timestamp');
        const wLeadsLC = w('sdr_id', 'updated_at');   // for lead_cadence

        const q = (sql, params) => db.query(sql, params);

        const [callsRes, reschedRes, emailsRes, wppRes, meetingsRes, cadFin, cadAct, leadsRes, batchRes] = await Promise.all([
            q(`SELECT COUNT(*)::integer as c FROM call_logs ${wCalls.where}`, wCalls.params),
            q(`SELECT COUNT(*)::integer as c FROM cadence_logs ${wCad.where ? wCad.where + ' AND' : 'WHERE'} outcome = 'reschedule'`, wCad.params),
            q(`SELECT COUNT(*)::integer as c FROM interactions_log ${wInt.where ? wInt.where + ' AND' : 'WHERE'} action_type = 'EMAIL_SENT'`, wInt.params),
            q(`SELECT COUNT(*)::integer as c FROM interactions_log ${wInt.where ? wInt.where + ' AND' : 'WHERE'} action_type = 'WHATSAPP_SENT'`, wInt.params),
            q(`SELECT COUNT(*)::integer as c FROM cadence_completions ${wComp.where ? wComp.where + ' AND' : 'WHERE'} final_outcome IN ('opportunity','won')`, wComp.params),
            q(`SELECT COUNT(*)::integer as c FROM lead_cadence ${wLeadsLC.where ? wLeadsLC.where + ' AND' : 'WHERE'} status = 'concluida'`, wLeadsLC.params),
            q(`SELECT COUNT(*)::integer as c FROM lead_cadence ${wLeadsLC.where ? wLeadsLC.where + ' AND' : 'WHERE'} status = 'ativo'`, wLeadsLC.params),
            q(`SELECT COUNT(*)::integer as c FROM leads ${wLeads.where}`, wLeads.params),
            q(`SELECT COUNT(DISTINCT id)::integer as c FROM lead_batches`, []),
        ]);

        const basicStats = {
            total_calls:       (parseInt(callsRes.rows[0].c) || 0) + (parseInt(reschedRes.rows[0].c) || 0),
            total_emails:      parseInt(emailsRes.rows[0].c) || 0,
            total_whatsapp:    parseInt(wppRes.rows[0].c) || 0,
            total_meetings:    parseInt(meetingsRes.rows[0].c) || 0,
            cadences_finished: parseInt(cadFin.rows[0].c) || 0,
            cadences_active:   parseInt(cadAct.rows[0].c) || 0,
            total_leads:       parseInt(leadsRes.rows[0].c) || 0,
            total_batches:     parseInt(batchRes.rows[0].c) || 0,
        };

        // Timeline: calls, meetings, emails, whatsapp per day
        // Use separate queries per type so params don't conflict
        const tlCalls   = await q(`SELECT DATE(created_at) as date, COUNT(*) as count, 'call' as type FROM call_logs ${wCalls.where} GROUP BY DATE(created_at)`, wCalls.params);
        const tlMeets   = await q(`SELECT DATE(completed_at) as date, COUNT(*) as count, 'meeting' as type FROM cadence_completions ${wComp.where ? wComp.where + ' AND' : 'WHERE'} final_outcome IN ('opportunity','won') GROUP BY DATE(completed_at)`, wComp.params);
        const tlEmails  = await q(`SELECT DATE(created_at) as date, COUNT(*) as count, 'email' as type FROM interactions_log ${wInt.where ? wInt.where + ' AND' : 'WHERE'} action_type = 'EMAIL_SENT' GROUP BY DATE(created_at)`, wInt.params);
        const tlWpp     = await q(`SELECT DATE(created_at) as date, COUNT(*) as count, 'whatsapp' as type FROM interactions_log ${wInt.where ? wInt.where + ' AND' : 'WHERE'} action_type = 'WHATSAPP_SENT' GROUP BY DATE(created_at)`, wInt.params);

        const timeline = [
            ...tlCalls.rows,
            ...tlMeets.rows,
            ...tlEmails.rows,
            ...tlWpp.rows,
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        // SDR performance with date filter applied
        const sdrPerfParams = [];
        const sdrDateClauses = [];
        if (startDate) { sdrDateClauses.push(`cc.completed_at >= $${sdrPerfParams.length + 1}`); sdrPerfParams.push(startDate + ' 00:00:00'); }
        if (endDate)   { sdrDateClauses.push(`cc.completed_at <= $${sdrPerfParams.length + 1}`); sdrPerfParams.push(endDate + ' 23:59:59'); }
        const sdrDateFilter = sdrDateClauses.length ? ' AND ' + sdrDateClauses.join(' AND ') : '';

        const sdrCallParams = [];
        const sdrCallClauses = [];
        if (startDate) { sdrCallClauses.push(`cl.created_at >= $2`); sdrCallParams.push(startDate + ' 00:00:00'); }
        if (endDate)   { sdrCallClauses.push(`cl.created_at <= $3`); sdrCallParams.push(endDate + ' 23:59:59'); }

        const sdrPerfRes = await q(`
            SELECT 
                s.full_name, s.id as sdr_id,
                (SELECT COUNT(*) FROM call_logs cl WHERE cl.sdr_id = s.id ${sdrCallClauses.length ? 'AND ' + sdrCallClauses.join(' AND ') : ''}) as calls,
                (SELECT COUNT(*) FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'EMAIL_SENT') as emails,
                (SELECT COUNT(*) FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'WHATSAPP_SENT') as whatsapp,
                (SELECT COUNT(*) FROM cadence_completions cc WHERE cc.sdr_id = s.id AND cc.final_outcome IN ('opportunity','won') ${sdrDateFilter}) as meetings,
                (SELECT COUNT(*) FROM lead_cadence lc2 WHERE lc2.sdr_id = s.id AND lc2.status = 'concluida') as cadences_done,
                (SELECT COUNT(*) FROM lead_cadence lc3 WHERE lc3.sdr_id = s.id AND lc3.status = 'ativa') as cadences_active
            FROM sdrs s WHERE s.is_active = true ORDER BY meetings DESC
        `, sdrPerfParams);

        // ── Operational Data ──

        // Critical leads (no interaction > 24h with active cadences)
        const criticalRes = await q(`
            SELECT l.id, l.full_name as lead_name, l.company_name, l.last_interaction_at,
                   lc.step_atual, s.full_name as sdr_name
            FROM leads l
            JOIN lead_cadence lc ON l.id = lc.lead_id
            JOIN sdrs s ON l.assigned_sdr_id = s.id
            WHERE lc.status = 'ativa' AND (l.last_interaction_at IS NULL OR l.last_interaction_at < NOW() - INTERVAL '24 hours')
            ORDER BY l.last_interaction_at ASC NULLS FIRST
            LIMIT 20
        `, []);

        // Cadence step distribution
        const stepsRes = await q(`
            SELECT step_atual as step, COUNT(*)::integer as lead_count
            FROM lead_cadence WHERE status = 'ativa'
            GROUP BY step_atual ORDER BY step_atual
        `, []);

        // Completion outcomes breakdown
        const outcomesRes = await q(`
            SELECT final_outcome, COUNT(*)::integer as count
            FROM cadence_completions GROUP BY final_outcome
        `, []);

        // Average progress of active cadences
        const avgProgressRes = await q(`
            SELECT COALESCE(ROUND(AVG(current_percentage), 1), 0) as avg_pct
            FROM lead_cadence WHERE status = 'ativa'
        `, []);

        // Average completion time
        const avgTimeRes = await q(`
            SELECT EXTRACT(EPOCH FROM AVG(updated_at - created_at))/3600 as avg_hours
            FROM lead_cadence WHERE status = 'concluida'
        `, []);

        // Conversion by batch
        const batchConvRes = await q(`
            SELECT lb.original_filename as name,
                   COUNT(DISTINCT l.id)::integer as leads,
                   COUNT(DISTINCT CASE WHEN lc.status = 'concluida' THEN l.id END)::integer as concluded,
                   COUNT(DISTINCT CASE WHEN cc.final_outcome IN ('opportunity','won') THEN l.id END)::integer as won
            FROM lead_batches lb
            LEFT JOIN leads l ON l.lead_batch_id = lb.id
            LEFT JOIN lead_cadence lc ON lc.lead_id = l.id
            LEFT JOIN cadence_completions cc ON cc.lead_id = l.id
            GROUP BY lb.id, lb.original_filename
            ORDER BY leads DESC LIMIT 10
        `, []);

        // Pipeline distribution
        const pipelineRes = await q(`
            SELECT pc.name, COUNT(l.id)::integer as count
            FROM pipeline_columns pc
            LEFT JOIN leads l ON l.current_column_id = pc.id
            GROUP BY pc.name, pc.position ORDER BY pc.position
        `, []);

        return {
            ...basicStats,
            timeline,
            sdr_performance: sdrPerfRes.rows,
            critical_leads: criticalRes.rows,
            steps_breakdown: stepsRes.rows,
            completion_outcomes: outcomesRes.rows,
            avg_progress: Number(avgProgressRes.rows[0]?.avg_pct) || 0,
            avg_completion_hours: Math.round(Number(avgTimeRes.rows[0]?.avg_hours) || 0),
            conversion_by_batch: batchConvRes.rows,
            pipeline_distribution: pipelineRes.rows,
        };
    }
}

module.exports = new StatsService();
