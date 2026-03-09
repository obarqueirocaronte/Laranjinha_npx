const Joi = require('joi');
const authService = require('../services/auth.service');

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string()
        .email()
        .pattern(/@npx\.com\.br$/)
        .required()
        .messages({
            'string.pattern.base': 'Email must be from @npx.com.br domain',
            'string.email': 'Invalid email format',
            'any.required': 'Email is required',
        }),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'Password is required',
        }),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        }),
});

const acceptInviteSchema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'Password is required',
        }),
});

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
async function register(req, res) {
    try {
        // Validate request body
        const { error, value } = registerSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message,
                },
            });
        }

        const { email, password } = value;

        // Register user
        const user = await authService.register(email, password);

        return res.status(201).json({
            success: true,
            data: {
                message: 'Registration successful! Please check your email to verify your account.',
                user: {
                    id: user.id,
                    email: user.email,
                },
            },
        });
    } catch (error) {
        console.error('Register error:', error);

        if (error.message === 'EMAIL_DOMAIN_INVALID') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'EMAIL_DOMAIN_INVALID',
                    message: 'Email must be from @npx.com.br domain',
                },
            });
        }

        if (error.message === 'EMAIL_ALREADY_EXISTS') {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'EMAIL_ALREADY_EXISTS',
                    message: 'An account with this email already exists',
                },
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Registration failed. Please try again later.',
            },
        });
    }
}

/**
 * Verify email with token
 * GET /api/v1/auth/verify-email/:token
 */
async function verifyEmail(req, res) {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Verification token is required',
                },
            });
        }

        const result = await authService.verifyEmail(token);

        return res.status(200).json({
            success: true,
            data: {
                message: 'Email verified successfully! You can now log in.',
                email: result.email,
            },
        });
    } catch (error) {
        console.error('Verify email error:', error);

        if (error.message === 'INVALID_TOKEN') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid verification token',
                },
            });
        }

        if (error.message === 'TOKEN_EXPIRED') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Verification token has expired. Please register again.',
                },
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Email verification failed',
            },
        });
    }
}

/**
 * Login user
 * POST /api/v1/auth/login
 */
async function login(req, res) {
    try {
        // Validate request body
        const { error, value } = loginSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message,
                },
            });
        }

        const { email, password } = value;

        // Login user
        const result = await authService.login(email, password);

        return res.status(200).json({
            success: true,
            data: {
                message: 'Login successful',
                token: result.token,
                user: result.user,
            },
        });
    } catch (error) {
        console.error('Login error:', error);

        if (error.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                },
            });
        }

        if (error.message === 'EMAIL_NOT_VERIFIED') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'EMAIL_NOT_VERIFIED',
                    message: 'Please verify your email before logging in',
                },
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Login failed. Please try again later.',
            },
        });
    }
}

/**
 * Request password reset
 * POST /api/v1/auth/request-password-reset
 */
async function requestPasswordReset(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Email is required',
                },
            });
        }

        await authService.requestPasswordReset(email);

        // Always return success to prevent email enumeration
        return res.status(200).json({
            success: true,
            data: {
                message: 'If an account exists with this email, a password reset link has been sent',
            },
        });
    } catch (error) {
        console.error('Request password reset error:', error);

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to process password reset request',
            },
        });
    }
}

/**
 * Reset password
 * POST /api/v1/auth/reset-password
 */
async function resetPassword(req, res) {
    try {
        // Validate request body
        const { error, value } = resetPasswordSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message,
                },
            });
        }

        const { token, newPassword } = value;

        await authService.resetPassword(token, newPassword);

        return res.status(200).json({
            success: true,
            data: {
                message: 'Password reset successful. You can now log in with your new password.',
            },
        });
    } catch (error) {
        console.error('Reset password error:', error);

        if (error.message === 'INVALID_TOKEN') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid reset token',
                },
            });
        }

        if (error.message === 'TOKEN_EXPIRED') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Reset token has expired. Please request a new one.',
                },
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Password reset failed',
            },
        });
    }
}

/**
 * Validate Invite Token
 * GET /api/v1/auth/invites/:token
 */
async function validateInvite(req, res) {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invite token is required' }
            });
        }

        const invite = await authService.validateInviteToken(token);

        return res.status(200).json({
            success: true,
            data: {
                email: invite.email,
                name: invite.name,
                role: invite.role,
            }
        });
    } catch (error) {
        console.error('Validate invite error:', error);
        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_INVITE',
                message: error.message === 'INVALID_OR_EXPIRED_INVITE' || error.message === 'INVITE_EXPIRED'
                    ? 'O convite é inválido ou já expirou.'
                    : 'Erro ao validar convite.',
            }
        });
    }
}

/**
 * Accept invite and register user
 * POST /api/v1/auth/accept-invite
 */
async function acceptInvite(req, res) {
    try {
        const { error, value } = acceptInviteSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
            });
        }

        const { token, password } = value;
        const result = await authService.acceptInviteRegistration(token, password);

        return res.status(200).json({
            success: true,
            data: {
                message: 'Registration and invite acceptance successful.',
                token: result.token,
                user: result.user,
            }
        });
    } catch (error) {
        console.error('Accept invite error:', error);

        if (error.message === 'USER_ALREADY_EXISTS') {
            return res.status(409).json({
                success: false,
                error: { code: 'USER_ALREADY_EXISTS', message: 'Este e-mail já está cadastrado no sistema.' }
            });
        }

        return res.status(400).json({
            success: false,
            error: {
                code: 'ACCEPT_INVITE_ERROR',
                message: 'Não foi possível aceitar o convite. Ele pode ser inválido ou já ter expirado.',
            }
        });
    }
}

/**
 * Get current user
 * GET /api/v1/auth/me
 * Requires authentication
 */
async function getCurrentUser(req, res) {
    try {
        // User is attached by auth middleware
        const user = await authService.getUserById(req.user.id);

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    isVerified: user.is_verified,
                    createdAt: user.created_at,
                },
            },
        });
    } catch (error) {
        console.error('Get current user error:', error);

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch user data',
            },
        });
    }
}

/**
 * Logout user
 * POST /api/v1/auth/logout
 * Requires authentication
 */
async function logout(req, res) {
    try {
        // In a JWT-based system, logout is primarily handled on the client side
        // Here we could invalidate the session if needed
        return res.status(200).json({
            success: true,
            data: {
                message: 'Logout successful',
            },
        });
    } catch (error) {
        console.error('Logout error:', error);

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Logout failed',
            },
        });
    }
}

module.exports = {
    register,
    verifyEmail,
    login,
    requestPasswordReset,
    resetPassword,
    getCurrentUser,
    logout,
    validateInvite,
    acceptInvite,
};
