const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const Token = require('../models/Token');
const File = require('../models/File');
const AccessLog = require('../models/AccessLog');
const { tokenRateLimiter } = require('../middleware/rateLimit');
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
 * GET /api/tokens - List all tokens
 */
router.get('/', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('includeExpired').optional().isBoolean(),
    query('fileId').optional().isUUID()
], handleValidationErrors, async (req, res) => {
    try {
        const { page = 1, limit = 20, includeExpired = false, fileId } = req.query;
        
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
                isRevoked: token.is_revoked,
                createdAt: token.created_at,
                downloadUrl: `/download/${token.token}`
            })),
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Error listing tokens:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to list tokens',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/tokens/:id - Get token details
 */
router.get('/:id', [
    param('id').isUUID()
], handleValidationErrors, async (req, res) => {
    try {
        const token = await Token.findById(req.params.id);
        
        if (!token) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Token not found',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: {
                id: token.id,
                token: token.token,
                fileId: token.file_id,
                fileName: token.original_name,
                fileMimeType: token.mime_type,
                fileSize: token.size,
                expiresAt: token.expires_at,
                maxDownloads: token.max_downloads,
                downloadCount: token.download_count,
                remainingDownloads: token.max_downloads - token.download_count,
                isRevoked: token.is_revoked,
                isExpired: new Date(token.expires_at) < new Date(),
                isValid: !token.is_revoked && 
                         new Date(token.expires_at) > new Date() && 
                         token.download_count < token.max_downloads,
                createdAt: token.created_at,
                downloadUrl: `/download/${token.token}`
            }
        });
    } catch (error) {
        logger.error('Error getting token:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get token',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/tokens - Create a new token
 */
router.post('/', tokenRateLimiter, [
    body('fileId').isUUID().withMessage('Valid file ID is required'),
    body('expiresInHours').optional().isInt({ min: 1, max: 720 }).withMessage('Expiry must be between 1 and 720 hours'),
    body('maxDownloads').optional().isInt({ min: 1, max: 1000 }).withMessage('Max downloads must be between 1 and 1000')
], handleValidationErrors, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { fileId, expiresInHours, maxDownloads } = req.body;
        
        // Check if file exists
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
            expiresInHours: expiresInHours || parseInt(process.env.TOKEN_EXPIRY_HOURS) || 24,
            maxDownloads: maxDownloads || 1,
            createdBy: req.headers['x-created-by'] || null
        });
        
        // Log token creation
        await AccessLog.logTokenCreate({
            fileId,
            tokenId: token.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: 201,
            responseTimeMs: Date.now() - startTime,
            metadata: { maxDownloads: token.max_downloads, expiresAt: token.expires_at }
        });
        
        logger.info(`Token created for file: ${file.original_name}`, {
            tokenId: token.id,
            fileId: file.id,
            expiresAt: token.expires_at
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
                createdAt: token.created_at,
                downloadUrl: `/download/${token.token}`
            }
        });
    } catch (error) {
        logger.error('Error creating token:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create token',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * DELETE /api/tokens/:id - Revoke a token
 */
router.delete('/:id', [
    param('id').isUUID()
], handleValidationErrors, async (req, res) => {
    try {
        const token = await Token.findById(req.params.id);
        
        if (!token) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Token not found',
                timestamp: new Date().toISOString()
            });
        }
        
        if (token.is_revoked) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Token is already revoked',
                timestamp: new Date().toISOString()
            });
        }
        
        await Token.revoke(req.params.id);
        
        logger.info(`Token revoked: ${token.id}`, {
            fileId: token.file_id,
            fileName: token.original_name
        });
        
        res.json({
            success: true,
            message: 'Token revoked successfully',
            data: {
                id: token.id,
                fileId: token.file_id,
                revokedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error revoking token:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to revoke token',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/tokens/validate - Validate a token
 */
router.post('/validate', [
    body('token').isString().isLength({ min: 64, max: 64 }).withMessage('Valid token string is required')
], handleValidationErrors, async (req, res) => {
    try {
        const { token: tokenString } = req.body;
        
        const validation = await Token.validate(tokenString);
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                valid: false,
                error: validation.error,
                timestamp: new Date().toISOString()
            });
        }
        
        const token = validation.token;
        
        res.json({
            success: true,
            valid: true,
            data: {
                id: token.id,
                fileId: token.file_id,
                fileName: token.original_name,
                expiresAt: token.expires_at,
                remainingDownloads: token.max_downloads - token.download_count
            }
        });
    } catch (error) {
        logger.error('Error validating token:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to validate token',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
