const db = require('../config/db');

class StatsService {
    /**
     * Get stats for the current SDR.
     * For now, we'll return aggregate stats or per-SDR stats.
     */
    async getStats(sdrId) {
        // Find if stats already exist
        const sql = `
            SELECT calls, emails, whatsapp, completed_leads
            FROM sdr_stats
            WHERE sdr_id = $1
        `;
        const res = await db.query(sql, [sdrId]);

        if (res.rows.length === 0) {
            // Return defaults if no entry exists
            return { calls: 0, emails: 0, whatsapp: 0, completed_leads: 0 };
        }

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
    async getGlobalStats() {
        // 1. Get activity stats from sdr_stats
        const activitySql = `
            SELECT 
                COALESCE(SUM(calls), 0)::integer as total_calls,
                COALESCE(SUM(emails), 0)::integer as total_emails,
                COALESCE(SUM(whatsapp), 0)::integer as total_whatsapp,
                COALESCE(SUM(completed_leads), 0)::integer as total_completed
            FROM sdr_stats
        `;
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

        // 3. Get total active leads across the entire board
        const activeLeadsSql = `SELECT COUNT(id)::integer as count FROM leads WHERE status = 'active'`;
        const activeLeadsRes = await db.query(activeLeadsSql);
        const totalActiveLeads = activeLeadsRes.rows[0].count;

        // 4. Get individual SDR breakdown (stats + goals + leads + movement)
        const sdrSql = `
            WITH movement_counts AS (
                SELECT moved_by_sdr_id, COUNT(id) as movements
                FROM lead_pipeline_history
                GROUP BY moved_by_sdr_id
            ),
            active_counts AS (
                SELECT assigned_sdr_id, COUNT(id) as pending_leads
                FROM leads
                WHERE status = 'active'
                GROUP BY assigned_sdr_id
            )
            SELECT 
                s.full_name,
                s.total_leads_assigned,
                COALESCE(ac.pending_leads, 0)::integer as pending_leads,
                COALESCE(mc.movements, 0)::integer as pipeline_movements,
                COALESCE(ss.calls, 0)::integer as calls,
                COALESCE(ss.emails, 0)::integer as emails,
                COALESCE(ss.whatsapp, 0)::integer as whatsapp,
                COALESCE(ss.completed_leads, 0)::integer as completed,
                s.goal_calls,
                s.goal_emails,
                s.goal_whatsapp,
                s.goal_completed
            FROM sdrs s
            LEFT JOIN sdr_stats ss ON s.id = ss.sdr_id
            LEFT JOIN movement_counts mc ON s.id = mc.moved_by_sdr_id
            LEFT JOIN active_counts ac ON s.id = ac.assigned_sdr_id
            WHERE s.is_active = true
            ORDER BY s.full_name ASC
        `;
        const sdrRes = await db.query(sdrSql);

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
     */
    async getStatsHistory() {
        // Fetch interactions (calls, emails, whatsapp) - last 30 days
        const interactionsSql = `
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
