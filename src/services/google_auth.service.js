const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const pool = db;
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'npx.com.br';

/**
 * Configura a estratégia de autenticação Google via OAuth 2.0.
 * Permite apenas emails do domínio @npx.com.br.
 */
function configureGoogleStrategy() {
    // Só configura se as credenciais estiverem definidas
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your-google-client-id') {
        console.warn('⚠️  Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env');
        return;
    }

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;

            if (!email) {
                return done(null, false, { message: 'EMAIL_NOT_PROVIDED' });
            }

            // Validar domínio
            if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
                return done(null, false, { message: 'EMAIL_DOMAIN_INVALID' });
            }

            const googleId = profile.id;
            const fullName = profile.displayName;
            const avatarUrl = profile.photos?.[0]?.value;

            // 1. Check for a pending invite with this email
            const inviteRes = await pool.query(
                "SELECT id, role, name, invited_by FROM invites WHERE email = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP",
                [email]
            );
            const invite = inviteRes.rows[0];

            // 2. Start transaction for atomic user/invite sync
            const client = await pool.connect();
            let user;

            try {
                await client.query('BEGIN');

                // Search for existing user
                const result = await client.query(
                    'SELECT id, email, is_admin, is_verified, google_id, role FROM users WHERE email = $1',
                    [email]
                );

                if (result.rows.length > 0) {
                    user = result.rows[0];

                    // Update user info, merging with invite data if present
                    const finalRole = user.role || (invite ? invite.role : 'sdr');
                    const finalName = user.full_name || (invite ? invite.name : fullName);
                    const invitedBy = invite ? invite.invited_by : null;
                    const becomeAdmin = (invite && invite.role === 'manager') || user.is_admin;

                    await client.query(
                        `UPDATE users 
                         SET google_id = $1, full_name = $2, avatar_url = $3, is_verified = true, 
                             role = $4, name = $5, invited_by = COALESCE(invited_by, $6),
                             is_admin = $7
                         WHERE id = $8`,
                        [googleId, fullName, avatarUrl, finalRole, finalName, invitedBy, becomeAdmin, user.id]
                    );

                    // Refresh user data for the final object
                    user.is_admin = becomeAdmin;
                } else {
                    // Create new user, inheriting from invite if available
                    const initialRole = invite ? invite.role : 'sdr';
                    const initialName = invite ? invite.name : fullName;
                    const invitedBy = invite ? invite.invited_by : null;
                    const isAdmin = (invite && invite.role === 'manager');

                    const newUser = await client.query(
                        `INSERT INTO users (email, google_id, full_name, name, avatar_url, is_verified, role, invited_by, is_admin)
                         VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8)
                         RETURNING id, email, is_admin, role`,
                        [email, googleId, fullName, initialName, avatarUrl, initialRole, invitedBy, isAdmin]
                    );
                    user = newUser.rows[0];
                }

                // 3. Mark invite as accepted if one was found
                if (invite) {
                    await client.query(
                        "UPDATE invites SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = $1",
                        [invite.id]
                    );
                }

                // 4. If user is an SDR (either previously or newly assigned), ensure record exists in sdrs table
                const currentRole = user.role || (invite ? invite.role : 'sdr');
                if (currentRole === 'sdr') {
                    await client.query(
                        `INSERT INTO sdrs (user_id, full_name, email) 
                         VALUES ($1, $2, $3) 
                         ON CONFLICT (email) DO UPDATE SET user_id = $1, full_name = $2`,
                        [user.id, invite ? invite.name : fullName, email]
                    );
                }

                await client.query('COMMIT');
                return done(null, user);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Google Auth Sync Error:', error.message);
            return done(error);
        }
    }));

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const result = await pool.query('SELECT id, email, is_admin FROM users WHERE id = $1', [id]);
            done(null, result.rows[0] || null);
        } catch (err) {
            done(err);
        }
    });
}

/**
 * Gera um JWT para o usuário autenticado via Google.
 */
function generateTokenForUser(user) {
    return jwt.sign(
        { userId: user.id, email: user.email, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

module.exports = { configureGoogleStrategy, generateTokenForUser };
