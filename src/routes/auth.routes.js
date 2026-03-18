const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { generateTokenForUser } = require('../services/google_auth.service');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ==========================================
// EMAIL/PASSWORD ROUTES
// ==========================================
router.post('/register', authController.register);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Invite routes
router.get('/invites/:token', authController.validateInvite);
router.post('/accept-invite', authController.acceptInvite);

// Protected routes (require authentication)
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);

// ==========================================
// GOOGLE OAUTH ROUTES
// ==========================================

// Step 1: Redirect to Google consent screen
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Step 2: Google callback — validate domain, issue JWT, redirect to frontend
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=domain_invalid` }),
    (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
            }

            const token = generateTokenForUser(user);

            // Redirect to frontend root with token in query params (handled by AuthContext)
            res.redirect(`${FRONTEND_URL}/?token=${token}&email=${encodeURIComponent(user.email)}&isAdmin=${user.is_admin || false}&role=${user.role || ''}&userId=${user.id}`);
        } catch (err) {
            console.error('Google callback error:', err);
            res.redirect(`${FRONTEND_URL}/login?error=server_error`);
        }
    }
);

module.exports = router;
