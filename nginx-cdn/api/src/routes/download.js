const express = require('express');
const path = require('path');
const fs = require('fs');

const Token = require('../models/Token');
const AccessLog = require('../models/AccessLog');
const { downloadRateLimiter } = require('../middleware/rateLimit');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /download/:token - Download file using token
 * This route is public (no API key required)
 */
router.get('/:token', downloadRateLimiter, async (req, res) => {
    const startTime = Date.now();
    const tokenString = req.params.token;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    const userAgent = req.get('User-Agent');
    const referer = req.get('Referer');
    
    try {
        // Validate token
        const validation = await Token.validate(tokenString);
        
        if (!validation.valid) {
            // Log failed attempt
            const tokenData = await Token.findByToken(tokenString);
            await AccessLog.logDownload({
                fileId: tokenData?.file_id || null,
                tokenId: tokenData?.id || null,
                ipAddress: clientIp,
                userAgent,
                referer,
                statusCode: 403,
                responseTimeMs: Date.now() - startTime,
                errorMessage: validation.error
            });
            
            logger.warn('Download failed: invalid token', {
                token: tokenString.substring(0, 8) + '...',
                error: validation.error,
                ip: clientIp
            });
            
            return res.status(403).json({
                error: 'Forbidden',
                message: validation.error,
                timestamp: new Date().toISOString()
            });
        }
        
        const token = validation.token;
        const filePath = path.join(__dirname, '../../uploads', token.stored_name);
        
        // Check if file exists on disk
        if (!fs.existsSync(filePath)) {
            await AccessLog.logDownload({
                fileId: token.file_id,
                tokenId: token.id,
                ipAddress: clientIp,
                userAgent,
                referer,
                statusCode: 404,
                responseTimeMs: Date.now() - startTime,
                errorMessage: 'File not found on disk'
            });
            
            logger.error('Download failed: file not found on disk', {
                fileId: token.file_id,
                storedName: token.stored_name
            });
            
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // Increment download count
        await Token.incrementDownloadCount(token.id);
        
        // Log successful download
        await AccessLog.logDownload({
            fileId: token.file_id,
            tokenId: token.id,
            ipAddress: clientIp,
            userAgent,
            referer,
            statusCode: 200,
            responseTimeMs: Date.now() - startTime,
            metadata: {
                downloadNumber: token.download_count + 1,
                remainingDownloads: token.max_downloads - token.download_count - 1
            }
        });
        
        logger.info('File downloaded', {
            fileId: token.file_id,
            fileName: token.original_name,
            ip: clientIp,
            downloadCount: token.download_count + 1
        });
        
        // Set headers for download
        res.setHeader('Content-Type', token.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(token.original_name)}"`);
        res.setHeader('Content-Length', token.size);
        res.setHeader('X-Download-Count', token.download_count + 1);
        res.setHeader('X-Downloads-Remaining', token.max_downloads - token.download_count - 1);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (err) => {
            logger.error('Error streaming file:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Error streaming file',
                    timestamp: new Date().toISOString()
                });
            }
        });
        
    } catch (error) {
        logger.error('Download error:', error);
        
        await AccessLog.logDownload({
            ipAddress: clientIp,
            userAgent,
            referer,
            statusCode: 500,
            responseTimeMs: Date.now() - startTime,
            errorMessage: error.message
        });
        
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Download failed',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * HEAD /download/:token - Check if download is available without downloading
 */
router.head('/:token', async (req, res) => {
    const tokenString = req.params.token;
    
    try {
        const validation = await Token.validate(tokenString);
        
        if (!validation.valid) {
            return res.status(403).end();
        }
        
        const token = validation.token;
        const filePath = path.join(__dirname, '../../uploads', token.stored_name);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).end();
        }
        
        res.setHeader('Content-Type', token.mime_type);
        res.setHeader('Content-Length', token.size);
        res.setHeader('X-File-Name', encodeURIComponent(token.original_name));
        res.setHeader('X-Downloads-Remaining', token.max_downloads - token.download_count);
        res.setHeader('X-Token-Expires', token.expires_at);
        res.status(200).end();
        
    } catch (error) {
        logger.error('HEAD request error:', error);
        res.status(500).end();
    }
});

module.exports = router;
