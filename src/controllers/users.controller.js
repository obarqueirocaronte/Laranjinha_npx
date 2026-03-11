const db = require('../config/db');
const voiceService = require('../services/voice.service');
const inviteService = require('../services/invite.service');

exports.getUsers = async (req, res) => {
    try {
        const usersResult = await db.query(`
            SELECT id, email, name, role, status, NULL as profile_picture_url 
            FROM users 
            ORDER BY name ASC
        `);

        // Also fetch pending invites
        const invitesResult = await db.query(`
            SELECT id, email, name, role, status
            FROM invites
            WHERE status = 'pending'
            ORDER BY created_at DESC
        `);

        let users = usersResult.rows;
        let invites = invitesResult.rows.map(inv => ({
            id: inv.id,
            name: inv.name || 'Convidado',
            email: inv.email,
            role: inv.role || 'sdr',
            status: 'invited' // Standardize status for UI
        }));

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

        // Combine user/invites and integration
        const activeUsersPayload = users.map(u => ({
            id: u.id,
            name: u.name || 'Sem Nome',
            email: u.email,
            role: u.role || 'sdr',
            status: u.status || 'active',
            profile_picture_url: u.profile_picture_url,
            integrations: integrationsByUser[u.id] || {
                email: { enabled: false, host: '', port: '587', user: '', pass: '' },
                voice: { enabled: false, sipServer: '', extension: '', password: '' },
                aurora: { enabled: false, auroraUserId: '', phoneNumber: '' }
            }
        }));

        // Final merged list
        const resultPayload = [...activeUsersPayload, ...invites];

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

// ==========================================
// INVITE MANAGEMENT (Manager-only)
// ==========================================

exports.createInvite = async (req, res) => {
    try {
        const { email, name, role } = req.body;
        // invitedBy comes from auth middleware (req.userId)
        const invitedBy = req.userId || null;

        if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });
        if (!['sdr', 'manager'].includes(role)) return res.status(400).json({ error: 'Role deve ser sdr ou manager.' });

        const invite = await inviteService.createInvite({ email, name, role, invitedBy });
        res.json({ success: true, data: invite });
    } catch (error) {
        const messages = {
            INVITE_ALREADY_EXISTS: 'Já existe um convite pendente para este email.',
            USER_ALREADY_EXISTS: 'Já existe um usuário com este email.',
        };
        console.error('Create invite error:', error);
        res.status(400).json({ error: messages[error.message] || error.message });
    }
};

exports.listInvites = async (req, res) => {
    try {
        const invites = await inviteService.listInvites();
        res.json({ success: true, data: invites });
    } catch (error) {
        console.error('List invites error:', error);
        res.status(500).json({ error: 'Erro ao listar convites.' });
    }
};

exports.revokeInvite = async (req, res) => {
    try {
        const { id } = req.params;
        await inviteService.revokeInvite(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Revoke invite error:', error);
        res.status(500).json({ error: 'Erro ao revogar convite.' });
    }
};

exports.deleteAllInvites = async (req, res) => {
    try {
        await inviteService.deleteAllInvites();
        res.json({ success: true });
    } catch (error) {
        console.error('Delete all invites error:', error);
        res.status(500).json({ error: 'Erro ao limpar convites.' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM user_integrations WHERE user_id = $1', [id]);
        await db.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Erro ao remover usuário.' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const isAdmin = role === 'manager';

        await db.query('BEGIN');

        // 1. Update user role
        const userRes = await db.query(
            'UPDATE users SET role = $1, is_admin = $2 WHERE id = $3 RETURNING email, name, role',
            [role, isAdmin, id]
        );

        if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            // 2. If promoted to SDR, ensure record exists in sdrs table
            if (user.role === 'sdr') {
                await db.query(`
                    INSERT INTO sdrs (user_id, full_name, email, is_active)
                    VALUES ($1, $2, $3, true)
                    ON CONFLICT (email) DO UPDATE 
                    SET user_id = $1, full_name = $2, updated_at = CURRENT_TIMESTAMP
                `, [id, user.name, user.email]);
            }
        }

        await db.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Erro ao atualizar role.' });
    }
};
