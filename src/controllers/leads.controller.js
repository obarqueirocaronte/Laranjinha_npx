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
        const { type, value } = req.query;
        // Example: /api/v1/leads/segments?type=status&value=Novo

        if (!type || !value) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'type and value are required query params' }
            });
        }

        const leads = await leadsService.getLeadsBySegment(type, value);
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
        const { cadence_name, filter_type, filter_value, sdr_assignments, scheduling_rule } = req.body;
        if (!cadence_name || !filter_type || !sdr_assignments?.length) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'cadence_name, filter_type, and sdr_assignments are required' }
            });
        }
        const result = await leadsService.bulkAssignWithCadence(cadence_name, filter_type, filter_value, sdr_assignments, scheduling_rule);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

exports.updateLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const result = await leadsService.updateLead(id, updates);
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
