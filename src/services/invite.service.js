const db = require('../config/db');
const crypto = require('crypto');
const emailService = require('./email.service');

/**
 * Invite Service — Sistema de convites controlado pelo manager.
 * O manager envia convites com role (sdr/manager) e o convidado
 * pode criar conta via email/senha ou Google.
 */
class InviteService {

    /**
     * Cria um novo convite e envia email de onboarding.
     */
    async createInvite({ email, name, role, invitedBy }) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Verificar se já existe convite pendente para este email
            const existing = await client.query(
                "SELECT id FROM invites WHERE email = $1 AND status = 'pending'", [email]
            );
            if (existing.rows.length > 0) {
                throw new Error('INVITE_ALREADY_EXISTS');
            }

            // Verificar se já existe um usuário com este email
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1', [email]
            );
            if (existingUser.rows.length > 0) {
                throw new Error('USER_ALREADY_EXISTS');
            }

            // Gerar token de convite
            const inviteToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

            // Criar convite
            const result = await client.query(
                `INSERT INTO invites (email, name, role, invite_token, invited_by, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, email, name, role, invite_token, status, created_at`,
                [email, name, role, inviteToken, invitedBy, expiresAt]
            );

            await client.query('COMMIT');

            const invite = result.rows[0];

            // Enviar email de convite (não-crítico)
            try {
                await emailService.sendInviteEmail(email, name, role, inviteToken);
            } catch (err) {
                console.warn('Failed to send invite email:', err.message);
            }

            return invite;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Lista todos os convites pendentes.
     */
    async listInvites() {
        const result = await db.query(
            `SELECT i.*, u.email as inviter_email
             FROM invites i
             LEFT JOIN users u ON i.invited_by = u.id
             ORDER BY i.created_at DESC`
        );
        return result.rows;
    }

    /**
     * Valida um token de convite.
     */
    async validateInvite(token) {
        const result = await db.query(
            "SELECT * FROM invites WHERE invite_token = $1 AND status = 'pending'",
            [token]
        );

        if (result.rows.length === 0) {
            throw new Error('INVALID_OR_EXPIRED_INVITE');
        }

        const invite = result.rows[0];

        if (new Date() > new Date(invite.expires_at)) {
            await db.query("UPDATE invites SET status = 'expired' WHERE id = $1", [invite.id]);
            throw new Error('INVITE_EXPIRED');
        }

        return invite;
    }

    /**
     * Aceita um convite — marca como aceito e configura o role do usuário.
     */
    async acceptInvite(token, userId) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const invite = await this.validateInvite(token);

            // Marcar convite como aceito
            await client.query(
                "UPDATE invites SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = $1",
                [invite.id]
            );

            // Atualizar o role do usuário
            await client.query(
                'UPDATE users SET role = $1, name = $2, invited_by = $3 WHERE id = $4',
                [invite.role, invite.name, invite.invited_by, userId]
            );

            // Se role é 'manager', marcar como admin
            if (invite.role === 'manager') {
                await client.query('UPDATE users SET is_admin = true WHERE id = $1', [userId]);
            }

            await client.query('COMMIT');
            return invite;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Revoga/cancela um convite pendente.
     */
    async revokeInvite(inviteId) {
        await db.query(
            "UPDATE invites SET status = 'expired' WHERE id = $1 AND status = 'pending'",
            [inviteId]
        );
        return { success: true };
    }
}

module.exports = new InviteService();
