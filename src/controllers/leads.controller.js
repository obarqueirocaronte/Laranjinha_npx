/**
 * Leads Controller
 * 
 * O Controller atua como o "gerente de tráfego" da aplicação.
 * Toda vez que o frontend faz uma requisição (ex: POST /api/v1/leads), 
 * é o Controller que recebe os dados da requisição (req), passa para 
 * o Service processar a lógica de negócios, e envia a resposta (res) devolta.
 */
const leadsService = require('../services/leads.service');
const notificationsService = require('../services/notifications.service');
const db = require('../config/db');

/**
 * Retorna as colunas do funil de vendas (pipeline).
 */
exports.getColumns = async (req, res, next) => {
    try {
        const columns = await leadsService.getAllColumns();
        res.json({ success: true, data: columns });
    } catch (err) {
        next(err);
    }
};

exports.ingestLead = async (req, res, next) => {
    try {
        const leadData = req.body;

        // Basic validation
        if (!leadData.full_name || !leadData.email) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'full_name and email are required',
                },
            });
        }

        const result = await leadsService.ingestLead(leadData);

        // Status 201 for created, 200 for updated (duplicate)
        const status = result.status === 'created' ? 201 : 200;

        res.status(status).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

exports.moveLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { to_column_id, notes } = req.body;

        if (!to_column_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'to_column_id is required' }
            });
        }

        const result = await leadsService.moveLead(id, to_column_id, notes);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.getLeadDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lead = await leadsService.getLeadById(id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: { code: 'LEAD_NOT_FOUND', message: 'Lead not found' }
            });
        }

        res.json({ success: true, data: lead });
    } catch (err) {
        next(err);
    }
};
exports.batchExport = async (req, res, next) => {
    try {
        const { leads } = req.body;

        if (!Array.isArray(leads)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'leads must be an array' }
            });
        }

        const result = await leadsService.createLeadsBatch(leads);

        // Notify managers if leads were created
        if (result.created > 0) {
            try {
                await notificationsService.notifyManagers(
                    'Novos Leads Pendentes',
                    `${result.created} novos leads foram importados e aguardam qualificação e atribuição.`,
                    'LEAD_ASSIGNMENT_PENDING',
                    '/admin?zone=lead-zone&tab=pending'
                );
            } catch (notifyErr) {
                console.error('Failed to notify managers:', notifyErr.message);
            }
        }

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.getSegments = async (req, res, next) => {
    try {
        const { type, value, user_id } = req.query;
        // Example: /api/v1/leads/segments?type=status&value=Novo&user_id=abc

        if (!type || !value) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'type and value are required query params' }
            });
        }

        const leads = await leadsService.getLeadsBySegment(type, value, user_id);
        res.json({ success: true, count: leads.length, data: leads });
    } catch (err) {
        next(err);
    }
};
exports.deleteLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await leadsService.deleteLead(id);
        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (err) {
        next(err);
    }
};

exports.deleteAllLeads = async (req, res, next) => {
    try {
        await leadsService.deleteAllLeads();
        res.json({ success: true, message: 'All leads deleted successfully' });
    } catch (err) {
        next(err);
    }
};

exports.pullBackAllLeads = async (req, res, next) => {
    try {
        await leadsService.pullBackAllLeads();
        res.json({ success: true, message: 'All leads pulled back to pending status' });
    } catch (err) {
        next(err);
    }
};

exports.assignLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sdr_id, cadence_name } = req.body;

        if (!sdr_id || !cadence_name) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'sdr_id and cadence_name are required' }
            });
        }

        const result = await leadsService.assignLead(id, sdr_id, cadence_name);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.getUncadencedStats = async (req, res, next) => {
    try {
        const stats = await leadsService.getUncadencedStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

exports.resetLeadsToPending = async (req, res, next) => {
    try {
        const result = await leadsService.resetLeadsToPending();
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.applyCadenceBulk = async (req, res, next) => {
    try {
        const { cadence_name, filter_type, filter_value } = req.body;
        if (!cadence_name || !filter_type) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'cadence_name and filter_type are required' }
            });
        }
        const result = await leadsService.applyCadenceBulk(cadence_name, filter_type, filter_value);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.getTags = async (req, res, next) => {
    try {
        const tags = await leadsService.getTags();
        res.json({ success: true, data: tags });
    } catch (err) {
        next(err);
    }
};

exports.getLeadsPreview = async (req, res, next) => {
    try {
        const { filter_type, filter_value, limit } = req.query;
        const leads = await leadsService.getLeadsPreview(filter_type, filter_value, Number(limit) || 20);
        res.json({ success: true, count: leads.length, data: leads });
    } catch (err) {
        next(err);
    }
};

exports.getAllSDRs = async (req, res, next) => {
    try {
        const sdrs = await leadsService.getAllSDRs();
        res.json({ success: true, data: sdrs });
    } catch (err) {
        next(err);
    }
};

exports.bulkAssignWithCadence = async (req, res, next) => {
    try {
        const { cadence_name, filter_type, filter_value, sdr_assignments, scheduling_rule, total_steps } = req.body;
        if (!cadence_name || !filter_type || !sdr_assignments?.length) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'cadence_name, filter_type, and sdr_assignments are required' }
            });
        }
        const result = await leadsService.bulkAssignWithCadence(cadence_name, filter_type, filter_value, sdr_assignments, scheduling_rule, { total_steps });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.updateLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user?.id;

        const result = await leadsService.updateLead(id, updates);

        // If this update contains a call outcome, log it to call_logs too
        if (updates.last_call_outcome) {
            try {
                // Find SDR ID from user ID
                const sdrRes = await db.query('SELECT id FROM sdrs WHERE user_id = $1 LIMIT 1', [userId]);
                const sdrId = sdrRes.rows[0]?.id;

                await leadsService.logCallInteraction(id, {
                    sdr_id: sdrId,
                    outcome: updates.last_call_outcome,
                    notes: updates.metadata?.last_call_notes
                });
            } catch (logErr) {
                console.error('Failed to log call interaction:', logErr.message);
            }
        }

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.completeCadence = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { notes, final_outcome } = req.body;
        const userId = req.user?.id;

        // Find SDR ID from user ID
        const sdrRes = await db.query('SELECT id FROM sdrs WHERE user_id = $1 LIMIT 1', [userId]);
        const sdrId = sdrRes.rows[0]?.id;

        const result = await leadsService.completeCadence(id, {
            sdr_id: sdrId,
            notes,
            final_outcome
        });

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.getActiveLeads = async (req, res, next) => {
    try {
        const { sdr_id, tags, status } = req.query;
        const leads = await leadsService.getActiveLeads({ sdr_id, tags, status });
        res.json({ success: true, count: leads.length, data: leads });
    } catch (err) {
        next(err);
    }
};

exports.bulkUpdateLeads = async (req, res, next) => {
    try {
        const { action, lead_ids } = req.body;
        if (!action || !lead_ids || !Array.isArray(lead_ids)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'action and lead_ids (array) are required' }
            });
        }
        const result = await leadsService.bulkUpdateLeads(action, lead_ids);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.scheduleNextContact = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { scheduled_at, type, notes, sdr_id } = req.body;

        if (!scheduled_at) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'scheduled_at is required' }
            });
        }

        const result = await leadsService.scheduleLead(id, {
            sdr_id,
            scheduled_at,
            type: type || 'manual',
            notes
        });

        // Automação para enviar email padrão
        try {
            const emailService = require('../services/email.service');
            const leadDetails = await leadsService.getLeadById(id);
            const dateStr = new Date(scheduled_at).toLocaleString('pt-BR');
            await emailService.sendEmail(
                'rodrigo.sergio@npx.com.br',
                `Novo Agendamento: ${leadDetails?.full_name || 'Lead'}`,
                `<p>O lead <b>${leadDetails?.full_name || 'Lead'}</b> foi agendado para <b>${dateStr}</b>.</p><p><b>Notas do SDR:</b> ${notes || 'Nenhuma nota'}</p>`
            );
        } catch (emailErr) {
            console.error('Falha ao enviar email de agendamento:', emailErr);
        }

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.getPipelineConfig = async (req, res, next) => {
    try {
        const sdrId = req.query.sdr_id;
        if (!sdrId) {
            return res.status(400).json({ success: false, error: 'sdr_id is required' });
        }
        const config = await leadsService.getPipelineConfig(sdrId);
        res.json({ success: true, data: config });
    } catch (err) {
        next(err);
    }
};

/**
 * Dispara a chamada via API do Discador para um Lead específico.
 * Puxa o ramal do usuário logado do banco de dados.
 */
exports.initiateLeadCall = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id; // Definido pelo auth middleware

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
        }

        // 1. Buscar ramal (Prioritário: SDR dono do lead -> Secundário: Usuário logado)
        const sdrExtensionRes = await db.query(`
            SELECT ui.config->>'extension' as extension, ui.is_active
            FROM leads l
            JOIN sdrs s ON l.assigned_sdr_id = s.id
            JOIN user_integrations ui ON s.user_id = ui.user_id
            WHERE l.id = $1 AND ui.type = 'voice' AND ui.is_active = true
        `, [id]);

        let extension = sdrExtensionRes.rows[0]?.extension;

        const isTestCall = id === '00000000-0000-0000-0000-000000000000' || req.body?.isTest;
        let targetExtension = req.body?.extension;

        // Se não houver ramal via body e não for teste, buscar ramal do dono do lead ou do usuário logado
        if (!targetExtension && !isTestCall) {
            // Se já buscaram o ramal do dono (SDR)
            if (extension) {
                targetExtension = extension;
            } else {
                const userId = req.user.id;
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
                
                if (isUuid) {
                    const userInteg = await db.query(
                        `SELECT config->>'extension' as extension FROM user_integrations WHERE user_id = $1 AND type = 'voice' AND is_active = true`,
                        [userId]
                    );
                    targetExtension = userInteg.rows[0]?.extension;
                }
            }
        }
        
        // 2. Buscar telefone do lead
        let lead = null;
        if (!isTestCall) {
            lead = await leadsService.getLeadById(id);
            if (!lead) {
                return res.status(404).json({ success: false, error: 'Lead não encontrado' });
            }
        }

        const phoneNumber = req.body?.phoneNumber || (lead ? lead.phone : null);
        if (!phoneNumber) {
            return res.status(404).json({ success: false, error: 'Lead sem telefone cadastrado' });
        }

        // 3. Chamar serviço de voz
        const voiceService = require('../services/voice.service');
        const result = await voiceService.initiateCall(targetExtension, phoneNumber);
        
        if (result.success) {
            return res.json({ 
                success: true, 
                message: 'Chamada disparada com sucesso', 
                url: result.url,
                dialerResponse: result.data 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                error: result.error || 'Erro ao comunicar com o discador' 
            });
        }
    } catch (err) {
        next(err);
    }
};


exports.getInteractions = async (req, res, next) => {
    try {
        const { id } = req.params;
        const interactions = await leadsService.getLeadInteractions(id);
        res.json({ success: true, data: interactions });
    } catch (err) {
        next(err);
    }
};
