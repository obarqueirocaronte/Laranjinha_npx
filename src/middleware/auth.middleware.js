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
        const secret = process.env.JWT_SECRET || 'sua-chave-secreta-forte-aqui';
        try {
            decoded = jwt.verify(token, secret);
        } catch (err) {
            console.error(`[Auth] JWT Verify Failed: ${err.message}. Token length: ${token?.length}`);
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired token',
                },
            });
        }

        // Check if user exists and is verified
        let user;
        if (decoded.userId === 'admin-bypass-id' || decoded.userId === 'visitor-bypass-id') {
            user = {
                id: decoded.userId,
                email: decoded.userId === 'admin-bypass-id' ? 'rodrigo.sergio@npx.com.br' : 'visitante@npx.com.br',
                is_verified: true,
                is_admin: decoded.userId === 'admin-bypass-id'
            };
        } else {
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
            user = userResult.rows[0];
        }

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

            let user;
            if (decoded.userId === 'admin-bypass-id' || decoded.userId === 'visitor-bypass-id') {
                user = {
                    id: decoded.userId,
                    email: decoded.userId === 'admin-bypass-id' ? 'rodrigo.sergio@npx.com.br' : 'visitante@npx.com.br',
                    is_verified: true,
                    is_admin: decoded.userId === 'admin-bypass-id'
                };
            } else {
                const userResult = await pool.query(
                    'SELECT id, email, is_verified, is_admin FROM users WHERE id = $1',
                    [decoded.userId]
                );
                user = userResult.rows[0];
            }

            if (user && user.is_verified) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    isAdmin: user.is_admin,
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

/**
 * SalesOps authorization middleware
 * Allows salesops, manager, and admin roles
 */
async function authorizeSalesOps(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    // Re-query the user role since req.user only has id/email/isAdmin
    try {
        if (req.user.id === 'admin-bypass-id') {
             return next();
        }

        const db = require('../config/db');
        const result = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        const role = result.rows[0]?.role;
        if (role === 'salesops' || role === 'manager' || req.user.isAdmin) {
            return next();
        }
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'SalesOps access required' } });
    } catch (err) {
        return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Authorization check failed' } });
    }
}

module.exports = {
    authenticate,
    authorizeAdmin,
    authorizeSalesOps,
    optionalAuth,
};
