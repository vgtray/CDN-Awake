const express = require('express');
const { body, validationResult } = require('express-validator');

const AdminUser = require('../models/AdminUser');
const { generateAccessToken, adminAuth } = require('../middleware/adminAuth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Validation error handler
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid request parameters',
            details: errors.array(),
            timestamp: new Date().toISOString()
        });
    }
    next();
}

/**
 * POST /api/auth/setup - Initial admin setup (only if no admin exists)
 */
router.post('/setup', [
    body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('setupKey').notEmpty().withMessage('Setup key is required')
], handleValidationErrors, async (req, res) => {
    try {
        const { username, email, password, setupKey } = req.body;
        
        // Verify setup key matches API_KEY or a dedicated ADMIN_SETUP_KEY
        const validSetupKey = process.env.ADMIN_SETUP_KEY || process.env.API_KEY;
        if (setupKey !== validSetupKey) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Invalid setup key',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if any admin already exists
        const hasAdmin = await AdminUser.hasAnyAdmin();
        if (hasAdmin) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Admin already exists. Use login instead.',
                timestamp: new Date().toISOString()
            });
        }
        
        // Create first admin as superadmin
        const admin = await AdminUser.create({
            username,
            email,
            password,
            role: 'superadmin'
        });
        
        // Log activity
        await AdminUser.logActivity({
            userId: admin.id,
            action: 'setup',
            details: { username, email },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        logger.info(`Initial admin created: ${username}`);
        
        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            data: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username or email already exists',
                timestamp: new Date().toISOString()
            });
        }
        logger.error('Setup error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create admin account',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/auth/check-setup - Check if initial setup is needed
 */
router.get('/check-setup', async (req, res) => {
    try {
        const hasAdmin = await AdminUser.hasAnyAdmin();
        res.json({
            success: true,
            needsSetup: !hasAdmin
        });
    } catch (error) {
        logger.error('Check setup error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to check setup status',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/auth/login - Admin login
 */
router.post('/login', [
    body('username').notEmpty(),
    body('password').notEmpty()
], handleValidationErrors, async (req, res) => {
    try {
        const { username, password } = req.body;
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
        const userAgent = req.get('User-Agent');
        
        // Find user by username or email
        let user = await AdminUser.findByUsername(username);
        if (!user) {
            user = await AdminUser.findByEmail(username);
        }
        
        if (!user) {
            await AdminUser.logActivity({
                action: 'login_failed',
                details: { username, reason: 'User not found' },
                ipAddress,
                userAgent
            });
            
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid credentials',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Account is deactivated',
                timestamp: new Date().toISOString()
            });
        }
        
        // Verify password
        const validPassword = await AdminUser.verifyPassword(password, user.password_hash);
        if (!validPassword) {
            await AdminUser.logActivity({
                userId: user.id,
                action: 'login_failed',
                details: { reason: 'Invalid password' },
                ipAddress,
                userAgent
            });
            
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid credentials',
                timestamp: new Date().toISOString()
            });
        }
        
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const session = await AdminUser.createSession(user.id, ipAddress, userAgent);
        
        // Update last login
        await AdminUser.updateLastLogin(user.id);
        
        // Log activity
        await AdminUser.logActivity({
            userId: user.id,
            action: 'login',
            ipAddress,
            userAgent
        });
        
        logger.info(`Admin login: ${user.username} from ${ipAddress}`);
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken,
                refreshToken: session.refresh_token,
                expiresIn: '15m',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Login failed',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/auth/refresh - Refresh access token
 */
router.post('/refresh', [
    body('refreshToken').notEmpty()
], handleValidationErrors, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        const session = await AdminUser.findSessionByToken(refreshToken);
        
        if (!session) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired refresh token',
                timestamp: new Date().toISOString()
            });
        }
        
        if (!session.user_active) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User account is deactivated',
                timestamp: new Date().toISOString()
            });
        }
        
        // Generate new access token
        const accessToken = generateAccessToken({
            id: session.user_id,
            username: session.username,
            email: session.email,
            role: session.role
        });
        
        res.json({
            success: true,
            data: {
                accessToken,
                expiresIn: '15m'
            }
        });
    } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Token refresh failed',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/auth/logout - Logout (revoke refresh token)
 */
router.post('/logout', adminAuth, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
        
        if (refreshToken) {
            const session = await AdminUser.findSessionByToken(refreshToken);
            if (session) {
                await AdminUser.revokeSession(session.id);
            }
        }
        
        // Log activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'logout',
            ipAddress,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Logout failed',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/auth/me - Get current user info
 */
router.get('/me', adminAuth, async (req, res) => {
    try {
        const user = await AdminUser.findById(req.adminUser.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                lastLoginAt: user.last_login_at,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get user info',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * PUT /api/auth/password - Change password
 */
router.put('/password', adminAuth, [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 })
], handleValidationErrors, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await AdminUser.findById(req.adminUser.id);
        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Verify current password
        const validPassword = await AdminUser.verifyPassword(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Current password is incorrect',
                timestamp: new Date().toISOString()
            });
        }
        
        // Change password
        await AdminUser.changePassword(user.id, newPassword);
        
        // Revoke all sessions (force re-login)
        await AdminUser.revokeAllSessions(user.id);
        
        // Log activity
        await AdminUser.logActivity({
            userId: user.id,
            action: 'password_change',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        logger.info(`Password changed for: ${user.username}`);
        
        res.json({
            success: true,
            message: 'Password changed successfully. Please login again.'
        });
    } catch (error) {
        logger.error('Password change error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to change password',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
