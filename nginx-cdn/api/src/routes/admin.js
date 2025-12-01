const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const AdminUser = require('../models/AdminUser');
const File = require('../models/File');
const Token = require('../models/Token');
const AccessLog = require('../models/AccessLog');
const ApiKey = require('../models/ApiKey');
const { adminAuth, superadminOnly } = require('../middleware/adminAuth');
const { sanitizeFileName } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const storedName = File.generateStoredName(file.originalname);
        cb(null, storedName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB
        files: 1
    }
});

// All routes require admin auth
router.use(adminAuth);

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

// ============ DASHBOARD ============

/**
 * GET /api/admin/dashboard - Get dashboard overview
 */
router.get('/dashboard', async (req, res) => {
    try {
        const [fileStats, tokenStats, logStats, recentLogs, topFiles] = await Promise.all([
            File.getStats(),
            Token.getStats(),
            AccessLog.getStats(),
            AccessLog.findAll({ limit: 10 }),
            AccessLog.getTopFiles(5)
        ]);
        
        res.json({
            success: true,
            data: {
                files: {
                    total: parseInt(fileStats.total_files) || 0,
                    totalSize: parseInt(fileStats.total_size) || 0,
                    totalSizeMB: Math.round((parseInt(fileStats.total_size) || 0) / (1024 * 1024) * 100) / 100
                },
                tokens: {
                    total: parseInt(tokenStats.total_tokens) || 0,
                    active: parseInt(tokenStats.active_tokens) || 0,
                    totalDownloads: parseInt(tokenStats.total_downloads) || 0
                },
                access: {
                    totalRequests: parseInt(logStats.total_requests) || 0,
                    downloads: parseInt(logStats.downloads) || 0,
                    uploads: parseInt(logStats.uploads) || 0,
                    uniqueIPs: parseInt(logStats.unique_ips) || 0
                },
                recentActivity: recentLogs.logs.map(log => ({
                    id: log.id,
                    action: log.action,
                    fileName: log.file_name,
                    ipAddress: log.ip_address,
                    statusCode: log.status_code,
                    createdAt: log.created_at
                })),
                topFiles
            }
        });
    } catch (error) {
        logger.error('Dashboard error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to load dashboard',
            timestamp: new Date().toISOString()
        });
    }
});

// ============ FILES MANAGEMENT ============

/**
 * GET /api/admin/files - List all files with full details
 */
router.get('/files', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, sortBy, sortOrder } = req.query;
        
        const result = await File.findAll({
            page: parseInt(page),
            limit: Math.min(parseInt(limit) || 20, 100),
            search,
            sortBy,
            sortOrder
        });
        
        // Get token counts for each file
        const filesWithTokens = await Promise.all(result.files.map(async (file) => {
            const tokens = await Token.findByFileId(file.id);
            return {
                id: file.id,
                originalName: file.original_name,
                storedName: file.stored_name,
                mimeType: file.mime_type,
                size: file.size,
                checksum: file.checksum,
                uploadedBy: file.uploaded_by,
                createdAt: file.created_at,
                updatedAt: file.updated_at,
                activeTokens: tokens.length
            };
        }));
        
        res.json({
            success: true,
            data: filesWithTokens,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Admin list files error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to list files',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/admin/files/:id - Get file with all details and tokens
 */
router.get('/files/:id', [
    param('id').isUUID()
], handleValidationErrors, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found',
                timestamp: new Date().toISOString()
            });
        }
        
        const [tokens, logs] = await Promise.all([
            Token.findByFileId(file.id, true), // Include expired
            AccessLog.findByFileId(file.id, { limit: 20 })
        ]);
        
        res.json({
            success: true,
            data: {
                file: {
                    id: file.id,
                    originalName: file.original_name,
                    storedName: file.stored_name,
                    mimeType: file.mime_type,
                    size: file.size,
                    checksum: file.checksum,
                    uploadedBy: file.uploaded_by,
                    createdAt: file.created_at,
                    updatedAt: file.updated_at
                },
                tokens: tokens.map(t => ({
                    id: t.id,
                    token: t.token,
                    expiresAt: t.expires_at,
                    maxDownloads: t.max_downloads,
                    downloadCount: t.download_count,
                    isRevoked: t.is_revoked,
                    isExpired: new Date(t.expires_at) < new Date(),
                    createdAt: t.created_at,
                    downloadUrl: `/download/${t.token}`
                })),
                recentLogs: logs.logs
            }
        });
    } catch (error) {
        logger.error('Admin get file error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get file details',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * DELETE /api/admin/files/:id - Delete a file and all associated tokens
 */
router.delete('/files/:id', [
    param('id').isUUID()
], handleValidationErrors, async (req, res) => {
    try {
        const fileId = req.params.id;
        
        // Get file details before deletion for logging
        const file = await File.findById(fileId);
        
        if (!file) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Delete file (cascade will delete tokens and logs)
        const deleted = await File.delete(fileId);
        
        if (!deleted) {
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to delete file',
                timestamp: new Date().toISOString()
            });
        }
        
        // Log activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'delete_file',
            targetType: 'file',
            targetId: fileId,
            details: { 
                fileName: file.original_name,
                fileSize: file.size,
                mimeType: file.mime_type
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        logger.info(`File deleted by admin: ${file.original_name}`, {
            adminId: req.adminUser.id,
            adminUsername: req.adminUser.username,
            fileId: fileId
        });
        
        res.json({
            success: true,
            message: 'File deleted successfully',
            data: {
                id: fileId,
                fileName: file.original_name
            }
        });
    } catch (error) {
        logger.error('Admin delete file error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete file',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/admin/files/upload - Upload a new file (admin)
 */
router.post('/files/upload', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'No file provided',
                timestamp: new Date().toISOString()
            });
        }
        
        const file = req.file;
        
        // Read file to calculate checksum
        const fileBuffer = await fs.readFile(file.path);
        const checksum = File.calculateChecksum(fileBuffer);
        
        // Create file record in database
        const savedFile = await File.create({
            originalName: sanitizeFileName(file.originalname),
            storedName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            checksum,
            uploadedBy: req.adminUser.username
        });
        
        // Log the upload
        await AccessLog.logUpload({
            fileId: savedFile.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: 201,
            responseTimeMs: Date.now() - startTime,
            metadata: { originalName: file.originalname, uploadedBy: req.adminUser.username }
        });
        
        // Log admin activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'upload_file',
            targetType: 'file',
            targetId: savedFile.id,
            details: { 
                fileName: savedFile.original_name,
                fileSize: savedFile.size,
                mimeType: savedFile.mime_type
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        logger.info(`File uploaded by admin: ${savedFile.original_name}`, {
            adminId: req.adminUser.id,
            adminUsername: req.adminUser.username,
            fileId: savedFile.id,
            size: savedFile.size,
            mimeType: savedFile.mime_type
        });
        
        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                id: savedFile.id,
                originalName: savedFile.original_name,
                mimeType: savedFile.mime_type,
                size: savedFile.size,
                checksum: savedFile.checksum,
                createdAt: savedFile.created_at
            }
        });
    } catch (error) {
        logger.error('Admin upload file error:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                logger.error('Failed to clean up file:', unlinkError);
            }
        }
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to upload file',
            timestamp: new Date().toISOString()
        });
    }
});

// ============ TOKENS MANAGEMENT ============

/**
 * GET /api/admin/tokens - List all tokens with full details
 */
router.get('/tokens', async (req, res) => {
    try {
        const { page = 1, limit = 20, includeExpired = 'true', fileId } = req.query;
        
        const result = await Token.findAll({
            page: parseInt(page),
            limit: Math.min(parseInt(limit) || 20, 100),
            includeExpired: includeExpired === 'true',
            fileId
        });
        
        res.json({
            success: true,
            data: result.tokens.map(token => ({
                id: token.id,
                token: token.token,
                fileId: token.file_id,
                fileName: token.original_name,
                expiresAt: token.expires_at,
                maxDownloads: token.max_downloads,
                downloadCount: token.download_count,
                remainingDownloads: Math.max(0, token.max_downloads - token.download_count),
                isRevoked: token.is_revoked,
                isExpired: new Date(token.expires_at) < new Date(),
                isValid: !token.is_revoked && 
                         new Date(token.expires_at) > new Date() && 
                         token.download_count < token.max_downloads,
                createdAt: token.created_at,
                downloadUrl: `/download/${token.token}`
            })),
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Admin list tokens error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to list tokens',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/admin/tokens/create - Create a new token
 */
router.post('/tokens/create', [
    body('fileId').isUUID(),
    body('expiresInHours').isInt({ min: 1, max: 8760 }),
    body('maxDownloads').isInt({ min: 1, max: 10000 }).optional()
], handleValidationErrors, async (req, res) => {
    try {
        const { fileId, expiresInHours, maxDownloads = 1 } = req.body;
        
        // Verify file exists
        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Create token
        const token = await Token.create({
            fileId,
            expiresInHours,
            maxDownloads,
            createdBy: req.adminUser.username
        });
        
        // Log activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'create_token',
            targetType: 'token',
            targetId: token.id,
            details: { fileId, fileName: file.original_name, expiresInHours, maxDownloads },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.status(201).json({
            success: true,
            message: 'Token created successfully',
            data: {
                id: token.id,
                token: token.token,
                fileId: token.file_id,
                fileName: file.original_name,
                expiresAt: token.expires_at,
                maxDownloads: token.max_downloads,
                downloadUrl: `/download/${token.token}`,
                createdAt: token.created_at
            }
        });
    } catch (error) {
        logger.error('Create token error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create token',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * DELETE /api/admin/tokens/:id - Revoke a single token
 */
router.delete('/tokens/:id', [
    param('id').isUUID()
], handleValidationErrors, async (req, res) => {
    try {
        const tokenId = req.params.id;
        
        // Revoke the token
        const token = await Token.revoke(tokenId);
        
        if (!token) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Token not found or already revoked',
                timestamp: new Date().toISOString()
            });
        }
        
        // Log activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'revoke_token',
            targetType: 'token',
            targetId: tokenId,
            details: { token: token.token },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            success: true,
            message: 'Token revoked successfully',
            data: {
                id: tokenId,
                token: token.token
            }
        });
    } catch (error) {
        logger.error('Revoke token error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to revoke token',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/admin/tokens/bulk-revoke - Revoke multiple tokens
 */
router.post('/tokens/bulk-revoke', [
    body('tokenIds').isArray({ min: 1 })
], handleValidationErrors, async (req, res) => {
    try {
        const { tokenIds } = req.body;
        const results = [];
        
        for (const tokenId of tokenIds) {
            const token = await Token.revoke(tokenId);
            results.push({ id: tokenId, success: !!token });
        }
        
        // Log activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'bulk_revoke_tokens',
            details: { count: tokenIds.length },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            success: true,
            message: `Revoked ${results.filter(r => r.success).length} tokens`,
            data: results
        });
    } catch (error) {
        logger.error('Bulk revoke error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to revoke tokens',
            timestamp: new Date().toISOString()
        });
    }
});

// ============ LOGS ============

/**
 * GET /api/admin/logs - Get all access logs
 */
router.get('/logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, action, statusCode, ipAddress, startDate, endDate } = req.query;
        
        const result = await AccessLog.findAll({
            page: parseInt(page),
            limit: Math.min(parseInt(limit) || 50, 200),
            action,
            statusCode: statusCode ? parseInt(statusCode) : null,
            ipAddress,
            startDate,
            endDate
        });
        
        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Admin logs error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get logs',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/admin/logs/activity - Get admin activity logs
 */
router.get('/logs/activity', async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, action } = req.query;
        
        const result = await AdminUser.getActivityLogs({
            page: parseInt(page),
            limit: Math.min(parseInt(limit) || 50, 200),
            userId,
            action
        });
        
        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Admin activity logs error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get activity logs',
            timestamp: new Date().toISOString()
        });
    }
});

// ============ USER MANAGEMENT (Superadmin only) ============

/**
 * GET /api/admin/users - List all admin users
 */
router.get('/users', superadminOnly, async (req, res) => {
    try {
        const users = await AdminUser.findAll();
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        logger.error('List users error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to list users',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/admin/users - Create new admin user
 */
router.post('/users', superadminOnly, [
    body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').optional().isIn(['admin', 'superadmin'])
], handleValidationErrors, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        const user = await AdminUser.create({
            username,
            email,
            password,
            role: role || 'admin',
            createdBy: req.adminUser.id
        });
        
        // Log activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'create_user',
            targetType: 'admin_user',
            targetId: user.id,
            details: { username, email, role: role || 'admin' },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username or email already exists',
                timestamp: new Date().toISOString()
            });
        }
        logger.error('Create user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create user',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * PUT /api/admin/users/:id - Update admin user
 */
router.put('/users/:id', superadminOnly, [
    param('id').isUUID(),
    body('role').optional().isIn(['admin', 'superadmin']),
    body('isActive').optional().isBoolean()
], handleValidationErrors, async (req, res) => {
    try {
        const { role, isActive } = req.body;
        
        // Prevent self-deactivation
        if (req.params.id === req.adminUser.id && isActive === false) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot deactivate your own account',
                timestamp: new Date().toISOString()
            });
        }
        
        const user = await AdminUser.update(req.params.id, { role, is_active: isActive });
        
        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Log activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'update_user',
            targetType: 'admin_user',
            targetId: user.id,
            details: { role, isActive },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update user',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * DELETE /api/admin/users/:id - Delete admin user
 */
router.delete('/users/:id', superadminOnly, [
    param('id').isUUID()
], handleValidationErrors, async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.params.id === req.adminUser.id) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot delete your own account',
                timestamp: new Date().toISOString()
            });
        }
        
        const user = await AdminUser.delete(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Log activity
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'delete_user',
            targetType: 'admin_user',
            targetId: req.params.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete user',
            timestamp: new Date().toISOString()
        });
    }
});

// ============ CLEANUP ============

/**
 * POST /api/admin/cleanup/tokens - Clean up expired tokens
 */
router.post('/cleanup/tokens', async (req, res) => {
    try {
        const deletedCount = await Token.deleteExpired();
        
        await AdminUser.logActivity({
            userId: req.adminUser.id,
            action: 'cleanup_tokens',
            details: { deletedCount },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} expired tokens`,
            data: { deletedCount }
        });
    } catch (error) {
        logger.error('Token cleanup error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to cleanup tokens',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/admin/cleanup/sessions - Clean up expired admin sessions
 */
router.post('/cleanup/sessions', async (req, res) => {
    try {
        const deletedCount = await AdminUser.cleanExpiredSessions();
        
        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} expired sessions`,
            data: { deletedCount }
        });
    } catch (error) {
        logger.error('Session cleanup error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to cleanup sessions',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
