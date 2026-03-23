const db = require('../config/db');
const axios = require('axios');

exports.testConnections = async (req, res) => {
    const results = {
        backend: { status: 'loading', message: '' },
        database: { status: 'loading', message: '' },
        postgress: { status: 'loading', message: '' },
        mattermost: { status: 'loading', message: '' }
    };

    try {
        // 1. Test Backend (Self)
        results.backend = { status: 'success', message: 'Online e operante' };

        // 2. Test Database (Supabase/Local)
        try {
            const dbRes = await db.query('SELECT current_database(), now()');
            results.database = { 
                status: 'success', 
                message: `Conectado a: ${dbRes.rows[0].current_database}`,
                details: { time: dbRes.rows[0].now }
            };
        } catch (err) {
            results.database = { status: 'error', message: err.message };
        }

        // 3. Test Postgress (External if configured)
        // For now, we reuse database check or check specific env
        if (process.env.DB_SSL === 'true') {
             results.postgress = { status: 'success', message: 'Conexão SSL Ativa (Produção)' };
        } else {
             results.postgress = { status: 'warning', message: 'Rodando local sem SSL' };
        }

        // 4. Test Mattermost
        const mmUrl = process.env.MATTERMOST_WEBHOOK_URL;
        if (mmUrl) {
            results.mattermost = { status: 'success', message: 'Webhook configurado' };
            // Optional: minimal ping if possible without spamming
        } else {
            results.mattermost = { status: 'error', message: 'MATTERMOST_WEBHOOK_URL não definida' };
        }

        return res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('System test error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getSchemaValidation = async (req, res) => {
    try {
        // Essential tables and columns for the entire system
        const requiredElements = [
            { type: 'table', name: 'leads' },
            { type: 'table', name: 'users' },
            { type: 'table', name: 'sdrs' },
            { type: 'table', name: 'lead_cadence' },
            { type: 'table', name: 'cadence_configs' },
            { type: 'table', name: 'cadence_logs' },
            { type: 'table', name: 'sdr_stats' },
            { type: 'table', name: 'interactions_log' },
            { type: 'table', name: 'schedules' },
            
            // Critical columns for phased cadences
            { type: 'column', table: 'lead_cadence', column: 'current_percentage' },
            { type: 'column', table: 'lead_cadence', column: 'completed_cycles' },
            { type: 'column', table: 'lead_cadence', column: 'total_cycles' },
            { type: 'column', table: 'cadence_configs', column: 'cycles_config' },
            
            // Mattermost automation
            { type: 'column', table: 'management_report_config', column: 'sdr_ids' },
            { type: 'column', table: 'management_report_config', column: 'webhook_url' }
        ];

        const validation = [];

        for (const item of requiredElements) {
            let exists = false;
            
            if (item.type === 'table') {
                const check = await db.query(`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = $1
                `, [item.name]);
                exists = check.rowCount > 0;
            } else {
                const check = await db.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [item.table, item.column]);
                exists = check.rowCount > 0;
            }
            
            validation.push({
                ...item,
                exists
            });
        }

        return res.json({ success: true, data: validation });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

exports.sendManualReport = async (req, res, next) => {
    try {
        const { sdr_ids } = req.body;
        const statsService = require('../services/stats.service');
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
                error: 'Falha ao enviar relatório para o Mattermost.',
                details: error.message 
            });
        }
    } catch (err) {
        next(err);
    }
};
