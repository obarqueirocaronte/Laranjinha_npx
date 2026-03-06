const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const pool = db;

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
async function authenticate(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'No token provided',
                },
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired token',
                },
            });
        }

        // Check if user exists and is verified
        const userResult = await pool.query(
            'SELECT id, email, is_verified, is_admin FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                },
            });
        }

        const user = userResult.rows[0];

        if (!user.is_verified) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'EMAIL_NOT_VERIFIED',
                    message: 'Please verify your email before accessing this resource',
                },
            });
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            isAdmin: user.is_admin,
        };

        next();
    } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Authentication failed',
            },
        });
    }
}

/**
 * Admin authorization middleware
 */
function authorizeAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Admin access required',
            },
        });
    }
    next();
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // No token, continue without user
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const userResult = await pool.query(
                'SELECT id, email, is_verified, is_admin FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length > 0 && userResult.rows[0].is_verified) {
                req.user = {
                    id: userResult.rows[0].id,
                    email: userResult.rows[0].email,
                    isAdmin: userResult.rows[0].is_admin,
                };
            }
        } catch (err) {
            // Invalid token, but that's okay for optional auth
        }

        next();
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        next();
    }
}

module.exports = {
    authenticate,
    authorizeAdmin,
    optionalAuth,
};
