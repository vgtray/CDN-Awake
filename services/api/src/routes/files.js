const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const File = require('../models/File');
const AccessLog = require('../models/AccessLog');
const Token = require('../models/Token');
const { validateUpload, sanitizeFileName } = require('../middleware/validation');
const { uploadRateLimiter } = require('../middleware/rateLimit');
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

/**
 * GET /api/files - List all files
 */
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy, sortOrder, search } = req.query;
        
        const result = await File.findAll({
            page: parseInt(page),
            limit: Math.min(parseInt(limit) || 20, 100),
            sortBy,
            sortOrder,
            search
        });
        
        res.json({
            success: true,
            data: result.files.map(file => ({
                id: file.id,
                originalName: file.original_name,
                mimeType: file.mime_type,
                size: file.size,
                createdAt: file.created_at,
                updatedAt: file.updated_at
            })),
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Error listing files:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to list files',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/files/stats - Get file statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const [fileStats, tokenStats, logStats] = await Promise.all([
            File.getStats(),
            Token.getStats(),
            AccessLog.getStats()
        ]);
        
        res.json({
            success: true,
            data: {
                files: {
                    total: parseInt(fileStats.total_files) || 0,
                    totalSize: parseInt(fileStats.total_size) || 0,
                    totalSizeMB: Math.round((parseInt(fileStats.total_size) || 0) / (1024 * 1024) * 100) / 100,
                    uniqueMimeTypes: parseInt(fileStats.unique_mime_types) || 0,
                    avgFileSize: Math.round(parseFloat(fileStats.avg_file_size) || 0)
                },
                tokens: {
                    total: parseInt(tokenStats.total_tokens) || 0,
                    active: parseInt(tokenStats.active_tokens) || 0,
                    revoked: parseInt(tokenStats.revoked_tokens) || 0,
                    expired: parseInt(tokenStats.expired_tokens) || 0,
                    totalDownloads: parseInt(tokenStats.total_downloads) || 0
                },
                access: {
                    totalRequests: parseInt(logStats.total_requests) || 0,
                    downloads: parseInt(logStats.downloads) || 0,
                    uploads: parseInt(logStats.uploads) || 0,
                    successful: parseInt(logStats.successful) || 0,
                    failed: parseInt(logStats.failed) || 0,
                    uniqueIPs: parseInt(logStats.unique_ips) || 0,
                    avgResponseTime: Math.round(parseFloat(logStats.avg_response_time) || 0)
                }
            }
        });
    } catch (error) {
        logger.error('Error getting stats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get statistics',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/files/:id - Get file details
 */
router.get('/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Get active tokens for this file
        const tokens = await Token.findByFileId(file.id);
        
        res.json({
            success: true,
            data: {
                id: file.id,
                originalName: file.original_name,
                mimeType: file.mime_type,
                size: file.size,
                checksum: file.checksum,
                uploadedBy: file.uploaded_by,
                createdAt: file.created_at,
                updatedAt: file.updated_at,
                activeTokens: tokens.length
            }
        });
    } catch (error) {
        logger.error('Error getting file:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get file',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/files/:id/logs - Get access logs for a file
 */
router.get('/:id/logs', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found',
                timestamp: new Date().toISOString()
            });
        }
        
        const { page = 1, limit = 50 } = req.query;
        const result = await AccessLog.findByFileId(file.id, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit) || 50, 100)
        });
        
        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Error getting file logs:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get access logs',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/files/upload - Upload a new file
 */
router.post('/upload', uploadRateLimiter, upload.single('file'), validateUpload, async (req, res) => {
    const startTime = Date.now();
    
    try {
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
            uploadedBy: req.headers['x-uploaded-by'] || null
        });
        
        // Log the upload
        await AccessLog.logUpload({
            fileId: savedFile.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: 201,
            responseTimeMs: Date.now() - startTime,
            metadata: { originalName: file.originalname }
        });
        
        logger.info(`File uploaded: ${savedFile.original_name}`, {
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
        logger.error('Error uploading file:', error);
        
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

/**
 * DELETE /api/files/:id - Delete a file
 */
router.delete('/:id', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const file = await File.findById(req.params.id);
        
        if (!file) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Revoke all tokens for this file
        await Token.revokeByFileId(file.id);
        
        // Soft delete the file record
        await File.delete(file.id);
        
        // Optionally delete the physical file
        const filePath = path.join(__dirname, '../../uploads', file.stored_name);
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            logger.warn(`Could not delete physical file: ${filePath}`, unlinkError);
        }
        
        // Log the deletion
        await AccessLog.logDelete({
            fileId: file.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: 200,
            responseTimeMs: Date.now() - startTime
        });
        
        logger.info(`File deleted: ${file.original_name}`, { fileId: file.id });
        
        res.json({
            success: true,
            message: 'File deleted successfully',
            data: {
                id: file.id,
                originalName: file.original_name
            }
        });
    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete file',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
