const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const emailService = require('./email.service');
const inviteService = require('./invite.service');
require('dotenv').config();

const pool = {
    query: (text, params) => db.query(text, params),
};

/**
 * Register a new user
 * @param {string} email - User email (must be @npx.com.br)
 * @param {string} password - User password
 */
async function register(email, password) {
    // Validate email domain
    if (!email.endsWith('@npx.com.br')) {
        throw new Error('EMAIL_DOMAIN_INVALID');
    }

    // Check if user already exists
    const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );

    if (existingUser.rows.length > 0) {
        throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const result = await pool.query(
        `INSERT INTO users (email, password_hash, verification_token, verification_token_expires)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, created_at`,
        [email, passwordHash, verificationToken, verificationExpires]
    );

    const user = result.rows[0];

    // Send verification email
    try {
        await emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't throw - user is created, email sending is non-critical
    }

    return {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
    };
}

/**
 * Validates an invite token and returns its data
 */
async function validateInviteToken(token) {
    return await inviteService.validateInvite(token);
}

/**
 * Register a user via invite token
 */
async function acceptInviteRegistration(token, password) {
    // 1. Validate invite
    const invite = await inviteService.validateInvite(token);

    // 2. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const client = await pool.query('SELECT 1'); // Just to get a client to begin tx? No, we'll just rely on inviteService atomic logic for the invite side. Or run a local tx here.
    // Better: use direct pool.query since inviteService handles its own tx, but we need users + sdrs synced.

    const dbClient = await db.getClient();
    let user;
    try {
        await dbClient.query('BEGIN');

        // Check again if user exists
        const existingUser = await dbClient.query('SELECT id FROM users WHERE email = $1', [invite.email]);
        if (existingUser.rows.length > 0) {
            throw new Error('USER_ALREADY_EXISTS');
        }

        const isAdmin = invite.role === 'manager';

        // 3. Create user
        const result = await dbClient.query(
            `INSERT INTO users (email, password_hash, full_name, name, role, is_admin, is_verified, invited_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, email, role, is_admin, profile_picture_url`,
            [invite.email, passwordHash, invite.name, invite.name, invite.role, isAdmin, true, invite.invited_by]
        );

        user = result.rows[0];

        // 4. Accept invite (mark as accepted)
        await dbClient.query(
            "UPDATE invites SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = $1",
            [invite.id]
        );

        // 5. Create SDR record if needed
        if (invite.role === 'sdr') {
            await dbClient.query(
                `INSERT INTO sdrs (user_id, full_name, email) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (email) DO UPDATE SET user_id = $1, full_name = $2`,
                [user.id, invite.name, invite.email]
            );
        }

        await dbClient.query('COMMIT');
    } catch (err) {
        await dbClient.query('ROLLBACK');
        throw err;
    } finally {
        dbClient.release();
    }

    // 6. Generate token
    const authToken = jwt.sign(
        { userId: user.id, email: user.email, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
        token: authToken,
        user: {
            id: user.id,
            email: user.email,
            isAdmin: user.is_admin,
            role: user.role,
            profile_picture_url: user.profile_picture_url
        },
    };
}

/**
 * Verify user email with token
 * @param {string} token - Verification token
 */
async function verifyEmail(token) {
    const result = await pool.query(
        `SELECT id, email, verification_token_expires 
         FROM users 
         WHERE verification_token = $1`,
        [token]
    );

    if (result.rows.length === 0) {
        throw new Error('INVALID_TOKEN');
    }

    const user = result.rows[0];

    // Check if token is expired
    if (new Date() > new Date(user.verification_token_expires)) {
        throw new Error('TOKEN_EXPIRED');
    }

    // Update user as verified
    await pool.query(
        `UPDATE users 
         SET is_verified = true, 
             verification_token = NULL, 
             verification_token_expires = NULL
         WHERE id = $1`,
        [user.id]
    );

    return {
        email: user.email,
    };
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 */
async function login(email, password) {
    // --- TEMPORARY DEV BYPASSES ---
    // rodrigo.sergio@npx.com.br
    if (email === 'rodrigo.sergio@npx.com.br' && password === '505050') {
        const mockUser = {
            id: 'admin-bypass-id',
            email: 'rodrigo.sergio@npx.com.br',
            is_admin: true,
            is_verified: true
        };

        const token = jwt.sign(
            { userId: mockUser.id, email: mockUser.email, isAdmin: mockUser.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            token,
            user: {
                id: mockUser.id,
                email: mockUser.email,
                isAdmin: mockUser.is_admin,
            },
        };
    }

    // visitante@npx.com.br (for external demos)
    if (email === 'visitante@npx.com.br' && password === 'npx-visitante') {
        const mockUser = {
            id: 'visitor-bypass-id',
            email: 'visitante@npx.com.br',
            is_admin: false,
            is_verified: true
        };

        const token = jwt.sign(
            { userId: mockUser.id, email: mockUser.email, isAdmin: mockUser.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            token,
            user: {
                id: mockUser.id,
                email: mockUser.email,
                isAdmin: mockUser.is_admin,
            },
        };
    }
    // --- END BYPASSES ---

    // Find user
    const result = await pool.query(
        'SELECT id, email, password_hash, is_verified, is_admin, profile_picture_url FROM users WHERE email = $1',
        [email]
    );

    if (result.rows.length === 0) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const user = result.rows[0];

    // Check if email is verified
    if (!user.is_verified) {
        throw new Error('EMAIL_NOT_VERIFIED');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
        throw new Error('INVALID_CREDENTIALS');
    }

    // Generate JWT token
    const token = jwt.sign(
        { userId: user.id, email: user.email, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Create session (optional - for tracking)
    try {
        const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await pool.query(
            'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, sessionExpires]
        );
    } catch (err) {
        // Ignore session creation error if DB is flaky, main auth succeeded
        console.error('Failed to create session:', err.message);
    }

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            isAdmin: user.is_admin,
            profile_picture_url: user.profile_picture_url,
        },
    };
}

/**
 * Request password reset
 * @param {string} email - User email
 */
async function requestPasswordReset(email) {
    const result = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );

    if (result.rows.length === 0) {
        // Don't reveal if email exists
        return { success: true };
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token
    await pool.query(
        `UPDATE users 
         SET reset_password_token = $1, reset_password_expires = $2
         WHERE id = $3`,
        [resetToken, resetExpires, user.id]
    );

    // Send email
    try {
        await emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
        console.error('Failed to send password reset email:', error);
    }

    return { success: true };
}

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 */
async function resetPassword(token, newPassword) {
    const result = await pool.query(
        `SELECT id, reset_password_expires 
         FROM users 
         WHERE reset_password_token = $1`,
        [token]
    );

    if (result.rows.length === 0) {
        throw new Error('INVALID_TOKEN');
    }

    const user = result.rows[0];

    // Check if token is expired
    if (new Date() > new Date(user.reset_password_expires)) {
        throw new Error('TOKEN_EXPIRED');
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await pool.query(
        `UPDATE users 
         SET password_hash = $1,
             reset_password_token = NULL,
             reset_password_expires = NULL
         WHERE id = $2`,
        [passwordHash, user.id]
    );

    return { success: true };
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 */
async function getUserById(userId) {
    if (userId === 'admin-bypass-id' || userId === 'visitor-bypass-id') {
        const email = userId === 'admin-bypass-id' ? 'rodrigo.sergio@npx.com.br' : 'visitante@npx.com.br';
        const isAdmin = userId === 'admin-bypass-id';
        return {
            id: userId,
            email: email,
            is_verified: true,
            is_admin: isAdmin,
            created_at: new Date()
        };
    }

    const result = await pool.query(
        'SELECT id, email, is_verified, is_admin, profile_picture_url, created_at FROM users WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
    }

    return result.rows[0];
}

module.exports = {
    register,
    verifyEmail,
    login,
    requestPasswordReset,
    resetPassword,
    getUserById,
    validateInviteToken,
    acceptInviteRegistration,
};
