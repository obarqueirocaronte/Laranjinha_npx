const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

            // Buscar usuário existente
            let result = await pool.query(
                'SELECT id, email, is_admin, is_verified, google_id FROM users WHERE email = $1',
                [email]
            );

            let user;

            if (result.rows.length > 0) {
                user = result.rows[0];
                // Vincular google_id se ainda não vinculado
                if (!user.google_id) {
                    await pool.query(
                        'UPDATE users SET google_id = $1, full_name = $2, avatar_url = $3, is_verified = true WHERE id = $4',
                        [googleId, fullName, avatarUrl, user.id]
                    );
                }
            } else {
                // Criar novo usuário via Google
                const newUser = await pool.query(
                    `INSERT INTO users (email, google_id, full_name, avatar_url, is_verified)
                     VALUES ($1, $2, $3, $4, true)
                     RETURNING id, email, is_admin`,
                    [email, googleId, fullName, avatarUrl]
                );
                user = newUser.rows[0];
            }

            return done(null, user);
        } catch (error) {
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
