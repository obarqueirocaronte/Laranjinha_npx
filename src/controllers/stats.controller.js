const statsService = require('../services/stats.service');

exports.getStats = async (req, res, next) => {
    try {
        let sdrId = req.query.sdr_id;

        // Default to authenticated user if no sdr_id provided
        if (!sdrId || sdrId === 'default-sdr') {
            if (req.user && req.user.id) {
                // We need to check if this user ID exists in the sdrs table
                const sdrCheck = await require('../config/db').query('SELECT id FROM sdrs WHERE user_id = $1', [req.user.id]);
                if (sdrCheck.rows.length > 0) {
                    sdrId = sdrCheck.rows[0].id;
                } else {
                    // Fallback to first SDR (legacy or manager viewing global)
                    const sdrsResult = await require('../config/db').query('SELECT id FROM sdrs LIMIT 1');
                    if (sdrsResult.rows.length > 0) {
                        sdrId = sdrsResult.rows[0].id;
                    } else {
                        return res.json({ success: true, data: { calls: 0, emails: 0, whatsapp: 0, completed_leads: 0 } });
                    }
                }
            } else {
                const sdrsResult = await require('../config/db').query('SELECT id FROM sdrs LIMIT 1');
                if (sdrsResult.rows.length > 0) {
                    sdrId = sdrsResult.rows[0].id;
                } else {
                    return res.json({ success: true, data: { calls: 0, emails: 0, whatsapp: 0, completed_leads: 0 } });
                }
            }
        }

        const period = req.query.period || 'all';
        const stats = await statsService.getStats(sdrId, period.toLowerCase());
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

exports.updateActivity = async (req, res, next) => {
    try {
        const { type, sdr_id } = req.body;
        const sdrId = sdr_id || (req.user ? req.user.id : null);

        if (!sdrId) {
            return res.status(400).json({ success: false, error: 'sdr_id is required' });
        }

        // Map frontend type to backend column
        const columnMap = {
            'call': 'calls',
            'email': 'emails',
            'whatsapp': 'whatsapp'
        };

        const backendType = columnMap[type];
        if (!backendType) {
            return res.status(400).json({ success: false, error: 'Invalid activity type' });
        }

        const stats = await statsService.updateActivity(sdrId, backendType);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

exports.resetStats = async (req, res, next) => {
    try {
        const sdrId = req.body.sdr_id || 'default-sdr';
        const stats = await statsService.resetStats(sdrId);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

exports.incrementCompleted = async (req, res, next) => {
    try {
        const sdrId = req.body?.sdr_id || 'default-sdr';
        const stats = await statsService.incrementCompletedLeads(sdrId);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

exports.getReportConfig = async (req, res, next) => {
    try {
        const config = await statsService.getReportConfig();
        res.json({ success: true, data: config });
    } catch (err) {
        next(err);
    }
};

exports.updateReportConfig = async (req, res, next) => {
    try {
        const config = await statsService.updateReportConfig(req.body);
        res.json({ success: true, data: config });
    } catch (err) {
        next(err);
    }
};

exports.getGlobalStats = async (req, res, next) => {
    try {
        const { period } = req.query;
        const stats = await statsService.getGlobalStats(period);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

exports.getStatsHistory = async (req, res, next) => {
    try {
        const history = await statsService.getStatsHistory();
        res.json({ success: true, data: history });
    } catch (err) {
        next(err);
    }
};

exports.sendManualReport = async (req, res, next) => {
    try {
        const { sdr_ids } = req.body;
        const config = await statsService.getReportConfig();
        
        if (!config || !config.webhook_url) {
            return res.status(400).json({ success: false, error: 'Mattermost Webhook not configured' });
        }

        const notificationScheduler = require('../services/notification_scheduler.service');
        try {
            await notificationScheduler.sendManagementReport(config.webhook_url, sdr_ids);
            res.json({ success: true, message: 'Report triggered successfully' });
        } catch (error) {
            console.error('Error triggering manual report:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Falha ao enviar relatório para o Mattermost. Verifique a configuração do Webhook.',
                details: error.message 
            });
        }
    } catch (err) {
        next(err);
    }
};
exports.getBIFullStats = async (req, res, next) => {
    try {
        const { sdr_id, start_date, end_date } = req.query;
        const stats = await statsService.getBIFullStats(sdr_id, start_date, end_date);
        res.json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};
