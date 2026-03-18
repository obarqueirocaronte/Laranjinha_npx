const db = require('../config/db');

class StatsService {
    /**
     * Get stats for the current SDR.
     * For now, we'll return aggregate stats or per-SDR stats.
     */
    async getStats(sdrId) {
        // Query logs for accurate activity counts for this specific SDR
        const sql = `
            SELECT 
                (SELECT COUNT(*)::integer FROM call_logs WHERE sdr_id = $1) as calls,
                (SELECT COUNT(*)::integer FROM interactions_log WHERE sdr_id = $1 AND action_type = 'EMAIL_SENT') as emails,
                (SELECT COUNT(*)::integer FROM interactions_log WHERE sdr_id = $1 AND action_type = 'WHATSAPP_SENT') as whatsapp,
                (SELECT COUNT(*)::integer FROM cadence_completions WHERE sdr_id = $1) as completed_leads
        `;
        const res = await db.query(sql, [sdrId]);
        return res.rows[0];
    }

    /**
     * Increment an activity counter.
     */
    async updateActivity(sdrId, type) {
        const allowedTypes = ['calls', 'emails', 'whatsapp'];
        if (!allowedTypes.includes(type)) throw new Error('Invalid activity type');

        const sql = `
            INSERT INTO sdr_stats (sdr_id, ${type})
            VALUES ($1, 1)
            ON CONFLICT (sdr_id)
            DO UPDATE SET ${type} = sdr_stats.${type} + 1, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const res = await db.query(sql, [sdrId]);
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
        let sdrFilter = '';
        if (sdrIds && sdrIds.length > 0) {
            sdrFilter = `AND s.id IN (${sdrIds.map((_, i) => `$${i + 1}`).join(',')})`;
        }

        // 1. Get activity stats from logs
        const activitySql = `
            SELECT 
                (SELECT COUNT(*)::integer FROM call_logs ${dateFilterCall}) as total_calls,
                (SELECT COUNT(*)::integer FROM interactions_log WHERE action_type = 'EMAIL_SENT' ${andFilterInt}) as total_emails,
                (SELECT COUNT(*)::integer FROM interactions_log WHERE action_type = 'WHATSAPP_SENT' ${andFilterInt}) as total_whatsapp,
                (SELECT COUNT(*)::integer FROM cadence_completions ${dateFilterComp}) as total_completed
        `;
        
        console.log('[DEBUG] activitySql:', activitySql);
        const activityRes = await db.query(activitySql);

        // 2. Get lead counts per column from leads table
        const columnSql = `
            SELECT pc.name, COUNT(l.id)::integer as count
            FROM pipeline_columns pc
            LEFT JOIN leads l ON pc.id = l.current_column_id
            GROUP BY pc.id, pc.name, pc.position
            ORDER BY pc.position
        `;
        const columnRes = await db.query(columnSql);

        // 3. Get total active leads
        const activeLeadsSql = `SELECT COUNT(id)::integer as count FROM leads WHERE status = 'active'`;
        const activeLeadsRes = await db.query(activeLeadsSql);
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
            )
            SELECT 
                s.id,
                s.full_name,
                s.email,
                s.total_leads_assigned,
                COALESCE(ac.pending_leads, 0)::integer as pending_leads,
                COALESCE(mc.movements, 0)::integer as pipeline_movements,
                (SELECT COUNT(*)::integer FROM call_logs cl WHERE cl.sdr_id = s.id ${andFilterCall}) as calls,
                (SELECT COUNT(*)::integer FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'EMAIL_SENT' ${andFilterInt}) as emails,
                (SELECT COUNT(*)::integer FROM interactions_log il WHERE il.sdr_id = s.id AND il.action_type = 'WHATSAPP_SENT' ${andFilterInt}) as whatsapp,
                (SELECT COUNT(*)::integer FROM cadence_completions cc WHERE cc.sdr_id = s.id ${andFilterComp}) as completed,
                s.goal_calls,
                s.goal_emails,
                s.goal_whatsapp,
                s.goal_completed
            FROM sdrs s
            LEFT JOIN movement_counts mc ON s.id = mc.moved_by_sdr_id
            LEFT JOIN active_counts ac ON s.id = ac.assigned_sdr_id
            WHERE s.is_active = true ${sdrFilter}
            ORDER BY s.full_name ASC
        `;
        
        console.log('[DEBUG] sdrSql:', sdrSql);
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
