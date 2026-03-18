const statsService = require('../services/stats.service');

exports.getStats = async (req, res, next) => {
    try {
        let sdrId = req.query.sdr_id;

        // Prevent 'default-sdr' which is not a valid UUID from causing DB errors
        if (!sdrId || sdrId === 'default-sdr') {
            const sdrsResult = await require('../config/db').query('SELECT id FROM sdrs LIMIT 1');
            if (sdrsResult.rows.length > 0) {
                sdrId = sdrsResult.rows[0].id;
            } else {
                return res.json({ success: true, data: { calls: 0, emails: 0, whatsapp: 0, completed_leads: 0 } });
            }
        }

        const stats = await statsService.getStats(sdrId);
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
        const stats = await statsService.getGlobalStats();
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
