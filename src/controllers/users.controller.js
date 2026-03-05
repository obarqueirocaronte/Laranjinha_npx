const db = require('../config/db');
const voiceService = require('../services/voice.service');

exports.getUsers = async (req, res) => {
    try {
        const usersResult = await db.query(`
            SELECT id, email, name, role, status 
            FROM users 
            ORDER BY name ASC
        `);

        let users = usersResult.rows;

        // Fetch integrations for all users
        const integrationsResult = await db.query(`
            SELECT user_id, type, config, is_active
            FROM user_integrations
        `);

        // Group integrations by user
        const integrationsByUser = integrationsResult.rows.reduce((acc, row) => {
            if (!acc[row.user_id]) acc[row.user_id] = {};
            acc[row.user_id][row.type] = {
                enabled: row.is_active,
                ...row.config
            };
            return acc;
        }, {});

        // Combine user and integration
        const resultPayload = users.map(u => ({
            id: u.id,
            name: u.name || 'Sem Nome',
            email: u.email,
            role: u.role || 'sdr',
            status: u.status || 'active',
            integrations: integrationsByUser[u.id] || {
                email: { enabled: false, host: '', port: '587', user: '', pass: '' },
                voice: { enabled: false, sipServer: '', extension: '', password: '' },
                aurora: { enabled: false, auroraUserId: '', phoneNumber: '' }
            }
        }));

        res.json(resultPayload);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários do sistema.' });
    }
};

exports.saveUserIntegration = async (req, res) => {
    try {
        const { id } = req.params;
        const integrations = req.body;

        for (const [type, data] of Object.entries(integrations)) {
            const { enabled, ...config } = data;

            await db.query(`
                INSERT INTO user_integrations (user_id, type, config, is_active)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, type) DO UPDATE 
                SET config = EXCLUDED.config, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
            `, [id, type, config, enabled]);
        }

        res.json({ message: 'Integrações salvas com sucesso' });
    } catch (error) {
        console.error('Error saving user integration:', error);
        res.status(500).json({ error: 'Erro ao salvar integrações.' });
    }
};

exports.getUserVoiceConfig = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT config, is_active FROM user_integrations WHERE user_id = $1 AND type = 'voice'`,
            [id]
        );

        if (result.rows.length > 0 && result.rows[0].is_active) {
            const config = result.rows[0].config;
            const sipConfig = voiceService.getSipConfig(config.extension);
            res.json({
                success: true,
                data: {
                    sipDomain: config.sipServer || sipConfig.sipDomain,
                    extension: config.extension || sipConfig.extension,
                    enabled: true,
                }
            });
        } else {
            // Return default config
            const sipConfig = voiceService.getSipConfig();
            res.json({
                success: true,
                data: {
                    sipDomain: sipConfig.sipDomain,
                    extension: sipConfig.extension,
                    enabled: false,
                }
            });
        }
    } catch (error) {
        console.error('Error fetching voice config:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração de voz.' });
    }
};
