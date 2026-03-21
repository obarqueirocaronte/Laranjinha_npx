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

        // dateFilterCl for cadence_logs (uses 'timestamp' instead of 'created_at')
        const clWhere = intWhere.map(w => w.replace('created_at', 'timestamp'));
        const dateFilterCl = clWhere.length > 0 ? `WHERE ${clWhere.join(' AND ')}` : '';

        // Query logs for accurate activity counts for this specific SDR
        const sql = `
            SELECT 
                ((SELECT COUNT(*)::integer FROM call_logs ${dateFilterCall}) + 
                 (SELECT COUNT(*)::integer FROM cadence_logs ${dateFilterCl} AND canal = 'call' AND acao = 'tentativa')) as calls,
                ((SELECT COUNT(*)::integer FROM interactions_log ${dateFilterInt} AND action_type = 'EMAIL_SENT') +
                 (SELECT COUNT(*)::integer FROM cadence_logs ${dateFilterCl} AND canal = 'email' AND acao = 'tentativa')) as emails,
                ((SELECT COUNT(*)::integer FROM interactions_log ${dateFilterInt} AND action_type = 'WHATSAPP_SENT') + 
                 (SELECT COUNT(*)::integer FROM cadence_logs ${dateFilterCl} AND canal = 'whatsapp' AND acao = 'tentativa')) as whatsapp,
                ((SELECT COUNT(*)::integer FROM cadence_completions ${dateFilterComp}) +
                 (SELECT COUNT(*)::integer FROM lead_cadence ${dateFilterComp.replace('completed_at', 'updated_at')} AND status = 'concluida')) as completed_leads
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
    async getGlobalStats(period = 'all', sdrIds = []) {
        let callWhere = [];
        let intWhere = [];
        let compWhere = [];
        let moveWhere = [];

        if (period === 'hoje') {
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

        // Add SDR filtering if provided
        let sdrFilterLog = ''; // For interactions_log (uses sdrs.id)
        let sdrFilterLeads = ''; // For leads (uses assigned_sdr_id)
        let userFilterLog = ''; // For call_logs and cadence_completions (uses users.id)
        
        const params = sdrIds && sdrIds.length > 0 ? [...sdrIds] : [];
        
        if (sdrIds && sdrIds.length > 0) {
            const placeholders = sdrIds.map((_, i) => `$${i + 1}`).join(',');
            sdrFilterLog = `AND sdr_id IN (${placeholders})`;
            sdrFilterLeads = `AND assigned_sdr_id IN (${placeholders})`;
            
            // Resolve User IDs for SDRs
            const userRes = await db.query(`SELECT user_id FROM sdrs WHERE id IN (${placeholders})`, sdrIds);
            const userIds = userRes.rows.map(r => r.user_id).filter(Boolean);
            
            if (userIds.length > 0) {
                // Add userIds to params for next queries
                const startIdx = params.length + 1;
                const userPlaceholders = userIds.map((_, i) => `$${startIdx + i}`).join(',');
                userFilterLog = `AND sdr_id IN (${userPlaceholders})`;
                userIds.forEach(uid => params.push(uid));
            } else {
                // If no user IDs found, ensure the filter returns nothing if it was intended to filter
                userFilterLog = `AND sdr_id IS NULL`; 
            }
        }

        // dateFilterCl (uses 'timestamp' instead of 'created_at')
        const clWhere = callWhere.map(w => w.replace('created_at', 'timestamp'));
        const dateFilterCl = clWhere.length > 0 ? `WHERE ${clWhere.join(' AND ')}` : '';
        const andFilterCl = clWhere.length > 0 ? `AND ${clWhere.join(' AND ')}` : '';

        // 1. Get activity stats from logs (unified)
        const activitySql = `
            SELECT 
                ((SELECT COUNT(*)::integer FROM call_logs ${dateFilterCall} ${dateFilterCall ? userFilterLog : (userFilterLog ? 'WHERE ' + userFilterLog.slice(4) : '')}) + 
                 (SELECT COUNT(*)::integer FROM cadence_logs ${dateFilterCl} ${andFilterCl} ${userFilterLog} AND canal = 'call' AND acao = 'tentativa')) as total_calls,
                ((SELECT COUNT(*)::integer FROM interactions_log WHERE action_type = 'EMAIL_SENT' ${andFilterInt} ${sdrFilterLog}) + 
                 (SELECT COUNT(*)::integer FROM cadence_logs WHERE canal = 'email' AND acao = 'tentativa' ${andFilterCl} ${sdrFilterLog})) as total_emails,
                ((SELECT COUNT(*)::integer FROM interactions_log WHERE action_type = 'WHATSAPP_SENT' ${andFilterInt} ${sdrFilterLog}) +
                 (SELECT COUNT(*)::integer FROM cadence_logs WHERE canal = 'whatsapp' AND acao = 'tentativa' ${andFilterCl} ${sdrFilterLog})) as total_whatsapp,
                ((SELECT COUNT(*)::integer FROM cadence_completions ${dateFilterComp} ${dateFilterComp ? userFilterLog : (userFilterLog ? 'WHERE ' + userFilterLog.slice(4) : '')}) +
                 (SELECT COUNT(*)::integer FROM lead_cadence ${dateFilterComp.replace('completed_at', 'updated_at')} ${userFilterLog.replace('sdr_id', 'sdr_id')} AND status = 'concluida')) as total_completed
        `;
        
        const activityRes = await db.query(activitySql, params);

        // 2. Get lead counts per column from leads table
        const columnSql = `
            SELECT pc.name, COUNT(l.id)::integer as count
            FROM pipeline_columns pc
            LEFT JOIN leads l ON pc.id = l.current_column_id ${sdrFilterLeads}
            GROUP BY pc.id, pc.name, pc.position
            ORDER BY pc.position
        `;
        const columnRes = await db.query(columnSql, sdrIds && sdrIds.length > 0 ? sdrIds : []);

        // 3. Get total active leads
        const activeLeadsSql = `SELECT COUNT(id)::integer as count FROM leads WHERE status = 'active' ${sdrFilterLeads}`;
        const activeLeadsRes = await db.query(activeLeadsSql, sdrIds && sdrIds.length > 0 ? sdrIds : []);
        const totalActiveLeads = activeLeadsRes.rows[0].count;

        // 4. Get individual SDR breakdown
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
                (SELECT COUNT(*)::integer FROM call_logs cl WHERE cl.sdr_id = s.user_id ${andFilterCall}) as calls,
                (SELECT COUNT(*)::integer FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'EMAIL_SENT' ${andFilterInt}) as emails,
                (SELECT COUNT(*)::integer FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'WHATSAPP_SENT' ${andFilterInt}) as whatsapp,
                (SELECT COUNT(*)::integer FROM cadence_completions cc WHERE cc.sdr_id = s.user_id ${andFilterComp}) as completed,
                COALESCE(cdc.total_in_cadence, 0)::integer as total_in_cadence,
                COALESCE(cdc.total_finished, 0)::integer as total_finished,
                CASE WHEN COALESCE(s.total_leads_assigned, 0) > 0
                    THEN ROUND(
                        (COALESCE((SELECT COUNT(DISTINCT lead_id) FROM call_logs WHERE sdr_id = s.user_id), 0)
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
            WHERE s.is_active = true ${sdrIds && sdrIds.length > 0 ? `AND s.id IN (${sdrIds.map((_, i) => `$${i + 1}`).join(',')})` : ''}
            ORDER BY s.full_name ASC
        `;
        
        const sdrRes = await db.query(sdrSql, sdrIds && sdrIds.length > 0 ? sdrIds : []);

        return {
            summary: {
                ...activityRes.rows[0],
                total_pending: totalActiveLeads
            },
            columns: columnRes.rows,
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
        const { webhook_url, schedule_times, is_active, last_sent_at } = config;
        
        // Since there's only one row, we can just update all
        const sql = `
            UPDATE management_report_config
            SET webhook_url = $1, 
                schedule_times = $2, 
                is_active = $3, 
                last_sent_at = $4,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const res = await db.query(sql, [webhook_url, schedule_times, is_active, last_sent_at]);
        
        if (res.rows.length === 0) {
            // If somehow deleted, re-insert
            const insertSql = `
                INSERT INTO management_report_config (webhook_url, schedule_times, is_active)
                VALUES ($1, $2, $3)
                RETURNING *
            `;
            const insertRes = await db.query(insertSql, [webhook_url, schedule_times, is_active]);
            return insertRes.rows[0];
        }

        return res.rows[0];
    }
}

module.exports = new StatsService();
