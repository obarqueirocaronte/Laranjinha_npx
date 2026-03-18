const db = require('../config/db');
const whatsappService = require('./whatsapp.service');
const voiceService = require('./voice.service');
const aiService = require('./ai.service');

/**
 * Leads Service
 * 
 * O "Service" é o coração da regra de negócios. Ele faz o trabalho pesado:
 * 1. Conversa com o Banco de Dados (inserir, atualizar, buscar).
 * 2. Valida regras vitais (como checar duplicidade de Leads).
 * 3. Chama serviços externos (como mandar ZAP e e-mail).
 * Tudo acontece aqui antes de ser devolvido de forma "limpa" para o Controller.
 */
class LeadsService {
    async getAllColumns() {
        const client = await db.getClient();
        try {
            const res = await client.query('SELECT * FROM pipeline_columns ORDER BY position');
            return res.rows;
        } finally {
            client.release();
        }
    }

    async ingestLead(data) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const {
                external_id, full_name, company_name, job_title,
                email, phone, linkedin_url, metadata, cadence_name
            } = data;

            // 1. Deduplication Check
            const checkSql = `
        SELECT id, full_name, email, current_column_id, assigned_sdr_id
        FROM leads 
        WHERE email = $1 OR (external_id = $2 AND external_id IS NOT NULL)
      `;
            const checkResult = await client.query(checkSql, [email, external_id]);

            if (checkResult.rows.length > 0) {
                // --- DUPLICATE FOUND: UPDATE ---
                const existingLead = checkResult.rows[0];

                // Merge metadata (simple shallow merge for now)
                const updateSql = `
          UPDATE leads 
          SET metadata = metadata || $1::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, updated_at
        `;
                const updated = await client.query(updateSql, [JSON.stringify(metadata || {}), existingLead.id]);

                // Fetch SDR details for response
                const sdrRes = await client.query('SELECT id, full_name, email FROM sdrs WHERE id = $1', [existingLead.assigned_sdr_id]);

                // Insert into separate custom fields table for DB normalization
                if (metadata && Object.keys(metadata).length > 0) {
                    for (const [key, val] of Object.entries(metadata)) {
                        await client.query(`
                            INSERT INTO lead_custom_fields (lead_id, field_key, field_value)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (lead_id, field_key) DO UPDATE SET field_value = EXCLUDED.field_value
                        `, [existingLead.id, key, val]);
                    }
                }

                await client.query('COMMIT');

                return {
                    lead_id: existingLead.id,
                    status: 'duplicate_updated',
                    message: 'Lead already exists. Metadata updated.',
                    assigned_to: sdrRes.rows[0] ? {
                        sdr_id: sdrRes.rows[0].id,
                        sdr_name: sdrRes.rows[0].full_name,
                        sdr_email: sdrRes.rows[0].email
                    } : null,
                    updated_at: updated.rows[0].updated_at
                };

            } else {
                // --- NEW LEAD: CREATE ---

                // A. Get First Column (Leads)
                const colRes = await client.query('SELECT id FROM pipeline_columns WHERE position = 1 LIMIT 1');
                const firstColumnId = colRes.rows[0]?.id;

                if (!firstColumnId) throw new Error('Pipeline columns not configured');

                // C. Insert Lead - set to pending so it flows to Admin Pending pool, NOT Kanban directly
                const insertSql = `
          INSERT INTO leads (
            external_id, full_name, company_name, job_title, 
            email, phone, linkedin_url, current_column_id, 
            qualification_status, cadence_name, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, created_at
        `;

                const insertParams = [
                    external_id, full_name, company_name, job_title,
                    email, phone, linkedin_url, firstColumnId,
                    'pending', cadence_name || null, JSON.stringify(metadata || {})
                ];

                const leadRes = await client.query(insertSql, insertParams);
                const newLeadId = leadRes.rows[0].id;

                // Insert into separate custom fields table for DB normalization
                if (metadata && Object.keys(metadata).length > 0) {
                    for (const [key, val] of Object.entries(metadata)) {
                        await client.query(`
                            INSERT INTO lead_custom_fields (lead_id, field_key, field_value)
                            VALUES ($1, $2, $3)
                        `, [newLeadId, key, val]);
                    }
                }

                await client.query('COMMIT');

                return {
                    lead_id: newLeadId,
                    status: 'created',
                    qualification_status: 'pending',
                    current_column: {
                        id: firstColumnId,
                        name: 'Leads'
                    },
                    created_at: leadRes.rows[0].created_at
                };
            }

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async moveLead(leadId, toColumnId, notes) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Check if lead exists
            const leadCheck = await client.query('SELECT id, current_column_id FROM leads WHERE id = $1', [leadId]);
            if (leadCheck.rows.length === 0) throw new Error('Lead not found');

            const fromColumnId = leadCheck.rows[0].current_column_id;

            // 2. Update Lead
            await client.query('UPDATE leads SET current_column_id = $1 WHERE id = $2', [toColumnId, leadId]);

            // 3. Find Workflows (Triggers)
            const workflows = await client.query(`
        SELECT wt.id, wt.action_type, t.name as template_name, wt.template_id
        FROM workflow_triggers wt
        LEFT JOIN templates t ON wt.template_id = t.id
        WHERE wt.from_column_id = $1 AND wt.to_column_id = $2 AND wt.is_active = true
      `, [fromColumnId, toColumnId]);

            await client.query('COMMIT');

            // (Note: Pipeline history logged by DB Trigger)

            const result = {
                lead_id: leadId,
                from_column_id: fromColumnId,
                to_column_id: toColumnId,
                triggered_workflows: workflows.rows
            };

            // 4. Execute Automations (Background)
            // Get full lead info for the automation
            const fullLead = await this.getLeadById(leadId);

            for (const wf of workflows.rows) {
                // If it's a WhatsApp trigger (type SEND_TEMPLATE or similar logic)
                if (wf.action_type === 'SEND_TEMPLATE' && wf.template_name && fullLead.phone) {
                    whatsappService.sendTemplateMessage(
                        fullLead.phone,
                        wf.template_name,
                        [
                            {
                                type: "body",
                                parameters: [
                                    { type: "text", text: fullLead.full_name || "Cliente" }
                                ]
                            }
                        ]
                    ).catch(err => console.error("Auto WhatsApp Error:", err));
                }

                // If column is 'Call' (or similar ID defined in your system), can trigger Click-to-call
                // Here we check by alias or ID. For now, if the action_type is logic for VOICE
                if (wf.action_type === 'INITIATE_CALL' && fullLead.phone && fullLead.assigned_sdr_id) {
                    // We'd need to fetch the SDR's extension from metadata or table
                    // Mocking extension 101 for now
                    voiceService.initiateCall('101', fullLead.phone)
                        .catch(err => console.error("Auto Voice Error:", err));
                }
            }

            return result;

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getLeadById(id) {
        try {
            const sql = `
          SELECT 
                 l.*, 
                 s.full_name as sdr_name, 
                 s.email as sdr_email,
                 pc.name as column_name,
                 pc.color as column_color,
                 u.profile_picture_url as sdr_profile_picture_url,
                 u.role as sdr_role,
                 (l.metadata->'tags') as tags,
                 LEAST(COALESCE((
                     SELECT (COUNT(*)::numeric * 100) / NULLIF(COALESCE((l.metadata->>'total_steps')::numeric, 4), 0)
                     FROM (
                         SELECT lead_id FROM call_logs WHERE lead_id = l.id
                         UNION ALL
                         SELECT lead_id FROM interactions_log WHERE lead_id = l.id
                     ) interactions
                 ), 0), 100) as cadence_progress
          FROM leads l
          LEFT JOIN sdrs s ON l.assigned_sdr_id = s.id
          LEFT JOIN users u ON s.user_id = u.id
          LEFT JOIN pipeline_columns pc ON l.current_column_id = pc.id
          WHERE l.id = $1
        `;
            const res = await db.query(sql, [id]);
            return res.rows[0];
        } catch (err) {
            console.error('[LeadsService] getLeadById ERROR:', { id, error: err.message });
            throw err;
        }
    }

    async createLeadsBatch(leadsData) {
        const results = {
            success: true,
            created: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        // Validação Inteligente do formato de telefones na importação via API Open AI
        const normalizedLeadsData = await aiService.normalizePhonesBatch(leadsData);

        for (const lead of normalizedLeadsData) {
            try {
                const result = await this.ingestLead(lead);
                if (result.status === 'created') {
                    results.created++;
                } else {
                    results.updated++;
                }
            } catch (err) {
                results.failed++;
                results.errors.push({
                    email: lead.email,
                    error: err.message
                });
            }
        }

        return results;
    }

    /**
     * Get Leads by Segment (Filter)
     * e.g. type='tag', value='Enterprise'
     */
    async getLeadsBySegment(type, value, userId) {
        // Safe parameter handling for dynamic queries
        let queryStr = `
            SELECT 
                l.*, 
                pc.name as current_column,
                u.profile_picture_url as sdr_profile_picture_url,
                u.role as sdr_role,
                (l.metadata->'tags') as tags,
                LEAST(COALESCE((
                    SELECT (COUNT(*)::numeric * 100) / NULLIF(COALESCE((l.metadata->>'total_steps')::numeric, 4), 0)
                    FROM (
                        SELECT lead_id FROM call_logs WHERE lead_id = l.id
                        UNION ALL
                        SELECT lead_id FROM interactions_log WHERE lead_id = l.id
                    ) interactions
                ), 0), 100) as cadence_progress
            FROM leads l
            LEFT JOIN pipeline_columns pc ON l.current_column_id = pc.id
            LEFT JOIN sdrs s ON l.assigned_sdr_id = s.id
            LEFT JOIN users u ON s.user_id = u.id
            WHERE (l.status = 'active' OR l.status IS NULL)
        `;
        const params = [];

        if (type === 'status') {
            params.push(value);
            queryStr += ` AND l.status = $${params.length}`;
        } else if (type === 'qualification_status') {
            params.push(value);
            queryStr += ` AND l.qualification_status = $${params.length}`;
        } else if (type === 'tier' || type === 'tag') {
            // For JSONB metadata queries: metadata->>'tier' or metadata->>'tags'
            // Assuming structure: metadata: { tier: 'Enterprise', tags: ['Tag1'] }
            if (type === 'tier') {
                params.push(value);
                queryStr += ` AND l.metadata->>'tier' = $${params.length}`;
            } else {
                params.push(`%${value}%`);
                queryStr += ` AND l.metadata::text ILIKE $${params.length}`;
            }
        } else if (type === 'company') {
            params.push(`%${value}%`);
            queryStr += ` AND l.company_name ILIKE $${params.length}`;
        }

        // Filter by the current user's SDR ID if provided
        if (userId) {
            // First check if userId is already an SDR ID
            const sdrById = await db.query('SELECT id FROM sdrs WHERE id = $1 LIMIT 1', [userId]);
            if (sdrById.rows.length > 0) {
                params.push(sdrById.rows[0].id);
                queryStr += ` AND l.assigned_sdr_id = $${params.length}`;
            } else {
                // Otherwise check if it's a User ID
                const sdrByUser = await db.query('SELECT id FROM sdrs WHERE user_id = $1 LIMIT 1', [userId]);
                if (sdrByUser.rows.length > 0) {
                    params.push(sdrByUser.rows[0].id);
                    queryStr += ` AND l.assigned_sdr_id = $${params.length}`;
                }
            }
        }

        queryStr += ` ORDER BY l.created_at DESC LIMIT 100`;

        try {
            const res = await db.query(queryStr, params);
            return res.rows;
        } catch (err) {
            console.error('[LeadsService] getLeadsBySegment ERROR:', { type, value, error: err.message, query: queryStr });
            throw err;
        }
    }
    /**
     * Assign a lead to an SDR and a Cadence
     */
    async assignLead(leadId, sdrId, cadenceName) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Update Lead
            const updateSql = `
                UPDATE leads 
                SET assigned_sdr_id = $1, 
                    cadence_name = $2, 
                    qualification_status = 'qualified',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING id
            `;
            const result = await client.query(updateSql, [sdrId, cadenceName, leadId]);

            if (result.rows.length === 0) throw new Error('Lead not found');

            // 2. Update SDR Stats
            await client.query(`
                UPDATE sdrs 
                SET total_leads_assigned = total_leads_assigned + 1,
                    last_lead_assigned_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [sdrId]);

            await client.query('COMMIT');
            return { success: true, lead_id: leadId };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Get count of leads without cadence (qualified but no cadence_name, or still pending)
     */
    async getUncadencedStats() {
        const sql = `
            SELECT 
                COUNT(*) FILTER (WHERE qualification_status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE qualification_status = 'qualified' AND (cadence_name IS NULL OR cadence_name = '')) as no_cadence_count,
                COUNT(*) FILTER (WHERE qualification_status = 'qualified') as qualified_count,
                COUNT(*) as total_count
            FROM leads
        `;
        const res = await db.query(sql);
        return res.rows[0];
    }

    /**
     * Reset all qualified leads (with no SDR) back to pending
     */
    async resetLeadsToPending() {
        const sql = `
            UPDATE leads 
            SET qualification_status = 'pending',
                updated_at = CURRENT_TIMESTAMP
            WHERE qualification_status = 'qualified' 
              AND assigned_sdr_id IS NULL
            RETURNING id
        `;
        const res = await db.query(sql);
        return { reset_count: res.rowCount };
    }

    /**
     * Apply cadence to leads by filter (tag, campaign, all pending, etc.)
     */
    async applyCadenceBulk(cadenceName, filterType, filterValue) {
        let whereClause = '';
        const params = [cadenceName];

        if (filterType === 'all_pending') {
            whereClause = `WHERE qualification_status = 'pending'`;
        } else if (filterType === 'tag') {
            params.push(`%${filterValue}%`);
            whereClause = `WHERE metadata::text ILIKE $${params.length}`;
        } else if (filterType === 'campaign') {
            params.push(filterValue);
            whereClause = `WHERE cadence_name = $${params.length} OR metadata->>'campaign' = $${params.length}`;
        } else if (filterType === 'no_cadence') {
            whereClause = `WHERE (cadence_name IS NULL OR cadence_name = '')`;
        }

        const sql = `
            UPDATE leads 
            SET cadence_name = $1,
                updated_at = CURRENT_TIMESTAMP
            ${whereClause}
            RETURNING id
        `;
        const res = await db.query(sql, params);
        return { updated_count: res.rowCount };
    }


    /**
     * Get all unique tags from lead metadata
     */
    async getTags() {
        const sql = `
            SELECT 
                t.name,
                COUNT(lt.lead_id) as count
            FROM tags t
            LEFT JOIN lead_tags lt ON lt.tag_id = t.id
            GROUP BY t.name
            ORDER BY count DESC
        `;
        let res;
        try {
            res = await db.query(sql);
        } catch (e) {
            // Fallback: try to extract tags from metadata JSONB
            const fallbackSql = `
                SELECT DISTINCT jsonb_array_elements_text(metadata->'tags') as name,
                       COUNT(*) OVER (PARTITION BY jsonb_array_elements_text(metadata->'tags')) as count
                FROM leads
                WHERE metadata->'tags' IS NOT NULL
                ORDER BY count DESC
                LIMIT 30
            `;
            res = await db.query(fallbackSql);
        }
        return res.rows;
    }

    /**
     * Preview leads that would be affected by a filter (for wizard)
     */
    async getLeadsPreview(filterType, filterValue, limit = 20) {
        let sql = `
            SELECT l.id, l.full_name, l.company_name, l.email, l.job_title,
                   l.qualification_status, l.cadence_name, l.created_at,
                   l.metadata,
                   s.full_name as assigned_sdr_name,
                   NULL as sdr_profile_picture_url
            FROM leads l
            LEFT JOIN sdrs s ON l.assigned_sdr_id = s.id
        `;
        const params = [];

        if (filterType === 'all_pending') {
            sql += ` WHERE l.qualification_status = 'pending'`;
        } else if (filterType === 'tag') {
            params.push(`%${filterValue}%`);
            sql += ` WHERE l.metadata::text ILIKE $1`;
        } else if (filterType === 'lead') {
            params.push(`%${filterValue}%`);
            sql += ` WHERE (l.full_name ILIKE $1 OR l.email ILIKE $1 OR l.company_name ILIKE $1)`;
        }

        params.push(limit);
        sql += ` ORDER BY l.created_at DESC LIMIT $${params.length}`;

        const res = await db.query(sql, params);
        return res.rows;
    }

    /**
     * Get all SDRs with their current lead counts
     */
    async getAllSDRs() {
        const sql = `
            SELECT s.id, s.full_name, s.email,
                   COUNT(l.id) as total_leads,
                   s.total_leads_assigned,
                   u.profile_picture_url
            FROM sdrs s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN leads l ON l.assigned_sdr_id = s.id AND l.qualification_status = 'qualified'
            GROUP BY s.id, s.full_name, s.email, s.total_leads_assigned, u.profile_picture_url
            ORDER BY s.full_name
        `;
        const res = await db.query(sql);
        return res.rows;
    }

    /**
     * Bulk assign leads (by filter) to SDRs with a cadence — final wizard step
     */
    async bulkAssignWithCadence(cadenceName, filterType, filterValue, sdrAssignments, schedulingRule, data = {}) {
        // sdrAssignments: [{ sdr_id, percentage }] to distribute among SDRs
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Get the leads to assign
            let selectSql = `SELECT id FROM leads WHERE 1=1`;
            const params = [];

            if (filterType === 'all_pending') {
                selectSql += ` AND qualification_status = 'pending'`;
            } else if (filterType === 'tag') {
                params.push(`%${filterValue}%`);
                selectSql += ` AND metadata::text ILIKE $${params.length}`;
            } else if (filterType === 'lead') {
                params.push(`%${filterValue}%`);
                selectSql += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
            }

            const leadsRes = await client.query(selectSql + ' FOR UPDATE', params);
            const leadIds = leadsRes.rows.map(r => r.id);

            if (leadIds.length === 0) {
                await client.query('COMMIT');
                return { assigned_count: 0, sdr_breakdown: [] };
            }

            // 2. Distribute leads among SDRs based on percentage (or round-robin if no %)
            let assigned = 0;
            const breakdown = [];

            if (!sdrAssignments || sdrAssignments.length === 0) {
                await client.query('ROLLBACK');
                throw new Error('At least one SDR must be selected');
            }

            let startIdx = 0;
            for (let i = 0; i < sdrAssignments.length; i++) {
                const { sdr_id, percentage } = sdrAssignments[i];
                let count;
                if (i === sdrAssignments.length - 1) {
                    // Last SDR gets the remainder
                    count = leadIds.length - startIdx;
                } else {
                    count = Math.round(leadIds.length * (percentage / 100));
                }

                const batch = leadIds.slice(startIdx, startIdx + count);
                startIdx += count;

                if (batch.length === 0) continue;

                await client.query(`
                    UPDATE leads
                    SET assigned_sdr_id = $1,
                        cadence_name = $2,
                        qualification_status = 'qualified',
                        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                            'scheduling_rule', $4::text,
                            'total_steps', $5::int
                        ),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ANY($3::uuid[])
                `, [sdr_id, cadenceName, batch, schedulingRule, data.total_steps || 4]);

                await client.query(`
                    UPDATE sdrs
                    SET total_leads_assigned = total_leads_assigned + $1,
                        last_lead_assigned_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `, [batch.length, sdr_id]);

                breakdown.push({ sdr_id, assigned: batch.length });
                assigned += batch.length;
            }

            await client.query('COMMIT');
            return { assigned_count: assigned, sdr_breakdown: breakdown };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async deleteLead(id) {
        // Handle foreign key constraints by deleting related records first
        await db.query('DELETE FROM interactions_log WHERE lead_id = $1', [id]);
        await db.query('DELETE FROM cadence_completions WHERE lead_id = $1', [id]);
        await db.query('DELETE FROM lead_pipeline_history WHERE lead_id = $1', [id]);
        await db.query('DELETE FROM scheduled_contacts WHERE lead_id = $1', [id]);
        const sql = 'DELETE FROM leads WHERE id = $1';
        return db.query(sql, [id]);
    }

    async deleteAllLeads() {
        const sql = 'DELETE FROM leads';
        // cascade deletes will handle lead_custom_fields if configured, or we can explicit delete
        await db.query('DELETE FROM lead_custom_fields');
        return db.query(sql);
    }

    async pullBackAllLeads() {
        // Return to column 1 and remove sdr_id
        const colRes = await db.query('SELECT id FROM pipeline_columns WHERE position = 1 LIMIT 1');
        const firstColumnId = colRes.rows[0]?.id;

        if (!firstColumnId) throw new Error('First column not found');

        const sql = `
            UPDATE leads 
            SET assigned_sdr_id = NULL,
                current_column_id = $1,
                status = 'active',
                qualification_status = 'pending'
            WHERE assigned_sdr_id IS NOT NULL 
               OR current_column_id != $1
        `;
        return db.query(sql, [firstColumnId]);
    }


    async updateLead(id, updates) {
        const { metadata, ...fields } = updates;
        const setClauses = [];
        const params = [id];

        // Normal fields
        Object.keys(fields).forEach((key, index) => {
            setClauses.push(`${key} = $${index + 2}`);
            params.push(fields[key]);
        });

        // Merge Metadata if present
        if (metadata) {
            setClauses.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${params.length + 1}::jsonb`);
            params.push(JSON.stringify(metadata));
        }

        if (setClauses.length === 0) return null;

        const sql = `
            UPDATE leads 
            SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const res = await db.query(sql, params);
        return res.rows[0];
    }

    async getActiveLeads(filters) {
        let queryStr = `
            SELECT 
                l.*, 
                pc.name as current_column, 
                u.profile_picture_url as sdr_profile_picture_url,
                u.role as sdr_role,
                (l.metadata->'tags') as tags,
                LEAST(COALESCE((
                    SELECT (COUNT(*)::numeric * 100) / NULLIF(COALESCE((l.metadata->>'total_steps')::numeric, 4), 0)
                    FROM (
                        SELECT lead_id FROM call_logs WHERE lead_id = l.id
                        UNION ALL
                        SELECT lead_id FROM interactions_log WHERE lead_id = l.id
                    ) interactions
                ), 0), 100) as cadence_progress
            FROM leads l
            LEFT JOIN pipeline_columns pc ON l.current_column_id = pc.id
            LEFT JOIN sdrs s ON l.assigned_sdr_id = s.id
            LEFT JOIN users u ON s.user_id = u.id
            WHERE l.status NOT IN ('qualified', 'archived', 'lost')
              AND l.assigned_sdr_id IS NOT NULL
              AND (
                (l.metadata->>'next_contact_at') IS NULL 
                OR (l.metadata->>'next_contact_at')::timestamp <= CURRENT_TIMESTAMP
              )
        `;
        const params = [];

        if (filters.sdr_id) {
            params.push(filters.sdr_id);
            queryStr += ` AND l.assigned_sdr_id = $${params.length}`;
        }

        if (filters.status === 'paused') {
            queryStr += ` AND (l.metadata->>'is_paused')::boolean = true`;
        } else if (filters.status === 'active') {
            queryStr += ` AND ((l.metadata->>'is_paused') IS NULL OR (l.metadata->>'is_paused')::boolean = false)`;
        }

        if (filters.tags) {
            params.push(`%${filters.tags}%`);
            queryStr += ` AND l.metadata::text ILIKE $${params.length}`;
        }

        queryStr += ` ORDER BY l.updated_at DESC LIMIT 500`;

        try {
            const res = await db.query(queryStr, params);
            return res.rows;
        } catch (err) {
            console.error('[LeadsService] getActiveLeads ERROR:', { error: err.message, query: queryStr });
            throw err;
        }
    }

    async bulkUpdateLeads(action, leadIds) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            let updateSql = '';
            if (action === 'pause') {
                updateSql = `
                    UPDATE leads 
                    SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_paused": true}'::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ANY($1::uuid[])
                `;
            } else if (action === 'resume') {
                updateSql = `
                    UPDATE leads 
                    SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_paused": false}'::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ANY($1::uuid[])
                `;
            } else if (action === 'unassign') {
                updateSql = `
                    UPDATE leads 
                    SET assigned_sdr_id = NULL,
                        cadence_name = NULL,
                        qualification_status = 'pending',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ANY($1::uuid[])
                `;
            } else {
                throw new Error('Invalid action');
            }

            const res = await client.query(updateSql, [leadIds]);

            await client.query('COMMIT');
            return { updated_count: res.rowCount };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async scheduleLead(leadId, data) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const { sdr_id, scheduled_at, type, notes } = data;

            // 1. Insert into schedules table
            const scheduleSql = `
                INSERT INTO schedules (lead_id, sdr_id, scheduled_at, type, notes)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const scheduleRes = await client.query(scheduleSql, [leadId, sdr_id, scheduled_at, type, notes]);

            // 2. Update lead metadata with next_contact_at and type
            // We use || to merge the existing metadata with the new info
            let updateProps = {
                'next_contact_at': scheduled_at,
                'next_contact_type': type || 'manual'
            };

            if (notes) {
                updateProps['last_schedule_notes'] = notes;
            }

            let updateSql;
            let params;

            if (data.return_to_queue) {
                // Find the first column (position 1)
                const colRes = await client.query('SELECT id FROM pipeline_columns ORDER BY position ASC LIMIT 1');
                const firstColId = colRes.rows[0]?.id;

                updateSql = `
                    UPDATE leads 
                    SET current_column_id = COALESCE($3, current_column_id),
                        metadata = metadata || $1::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                    RETURNING id, metadata
                `;
                params = [JSON.stringify(updateProps), leadId, firstColId];
            } else {
                updateSql = `
                    UPDATE leads 
                    SET metadata = metadata || $1::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                    RETURNING id, metadata
                `;
                params = [JSON.stringify(updateProps), leadId];
            }

            await client.query(updateSql, params);

            await client.query('COMMIT');

            return scheduleRes.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
    async logCallInteraction(leadId, data) {
        const { sdr_id, outcome, notes = '' } = data;
        
        // Resolve userId from sdr_id because call_logs FK points to users.id
        const sdrRes = await db.query('SELECT user_id FROM sdrs WHERE id = $1', [sdr_id]);
        const targetId = sdrRes.rows[0]?.user_id || sdr_id;

        const sql = `
            INSERT INTO call_logs (lead_id, sdr_id, outcome, notes)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        return db.query(sql, [leadId, targetId, outcome, notes]);
    }

    async getLeadInteractions(id) {
        const sql = `
            SELECT 'call' as type, outcome as result, notes, cl.created_at, s.full_name as author_name
            FROM call_logs cl
            LEFT JOIN sdrs s ON cl.sdr_id = s.user_id
            WHERE cl.lead_id = $1
            UNION ALL
            SELECT 'interaction' as type, action_type as result, content_snapshot as notes, il.created_at, s.full_name as author_name
            FROM interactions_log il
            LEFT JOIN sdrs s ON il.sdr_id = s.id
            WHERE il.lead_id = $1
            UNION ALL
            SELECT 'cadence_completion' as type, final_outcome as result, notes, completed_at as created_at, s.full_name as author_name
            FROM cadence_completions cc
            LEFT JOIN sdrs s ON cc.sdr_id = s.user_id
            WHERE cc.lead_id = $1
            UNION ALL
            SELECT 'schedule' as type, status as result, notes, sch.created_at, s.full_name as author_name
            FROM schedules sch
            LEFT JOIN sdrs s ON sch.sdr_id = s.id
            WHERE sch.lead_id = $1
            ORDER BY created_at DESC
        `;
        const res = await db.query(sql, [id]);
        return res.rows;
    }

    async completeCadence(leadId, data) {
        const { sdr_id, notes, final_outcome } = data;
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Resolve userId from sdr_id because cadence_completions FK points to users.id
            const sdrRes = await client.query('SELECT user_id FROM sdrs WHERE id = $1', [sdr_id]);
            const targetId = sdrRes.rows[0]?.user_id || sdr_id;

            // 1. Log completion
            const completionSql = `
                INSERT INTO cadence_completions (lead_id, sdr_id, notes, final_outcome)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const completionRes = await client.query(completionSql, [leadId, targetId, notes, final_outcome]);

            // 2. Update lead status if it's an opportunity or rejected
            let status = 'active';
            if (final_outcome === 'opportunity') status = 'qualified';
            if (final_outcome === 'rejected') status = 'lost';

            await client.query(`
                UPDATE leads 
                SET status = $1, 
                    updated_at = CURRENT_TIMESTAMP,
                    metadata = metadata || jsonb_build_object('cadence_completed_at', CURRENT_TIMESTAMP)
                WHERE id = $2
            `, [status, leadId]);

            await client.query('COMMIT');
            return completionRes.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getPipelineConfig(sdrId) {
        try {
            // Find team settings for this SDR
            const sql = `
                SELECT t.settings 
                FROM teams t
                JOIN sdrs s ON s.team_id = t.id
                WHERE s.id = $1
            `;
            const res = await db.query(sql, [sdrId]);
            
            // Default settings if none found
            const defaultSettings = { allow_return_to_queue: true };
            
            if (res.rows.length > 0 && res.rows[0].settings) {
                return { ...defaultSettings, ...res.rows[0].settings };
            }
            
            return defaultSettings;
        } catch (err) {
            console.error('Error fetching pipeline config:', err);
            return { allow_return_to_queue: true };
        }
    }
}

module.exports = new LeadsService();
