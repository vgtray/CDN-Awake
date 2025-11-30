const logger = require('../utils/logger');

/**
 * API Key authentication middleware
 * Validates Bearer token in Authorization header
 */
function apiKeyAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    
    let providedKey = null;

    // Check Authorization header (Bearer token)
    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
            providedKey = parts[1];
        }
    }

    // Fallback to X-API-Key header
    if (!providedKey && apiKeyHeader) {
        providedKey = apiKeyHeader;
    }

    // Check if API key is provided
    if (!providedKey) {
        logger.warn('Authentication failed: No API key provided', {
            ip: req.ip,
            path: req.originalUrl
        });
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key is required. Provide it via Authorization: Bearer <key> or X-API-Key header',
            timestamp: new Date().toISOString()
        });
    }

    // Validate API key
    const validApiKey = process.env.API_KEY;
    
    if (!validApiKey) {
        logger.error('API_KEY environment variable not set');
        return res.status(500).json({
            error: 'Configuration Error',
            message: 'Server is not properly configured',
            timestamp: new Date().toISOString()
        });
    }

    // Constant-time comparison to prevent timing attacks
    if (!secureCompare(providedKey, validApiKey)) {
        logger.warn('Authentication failed: Invalid API key', {
            ip: req.ip,
            path: req.originalUrl,
            providedKeyPrefix: providedKey.substring(0, 4) + '...'
        });
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key',
            timestamp: new Date().toISOString()
        });
    }

    // Authentication successful
    req.authenticated = true;
    next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }
    
    const crypto = require('crypto');
    
    // Use scryptSync for constant-time comparison
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    
    if (bufA.length !== bufB.length) {
        // Still do comparison to maintain constant time
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Optional authentication - doesn't fail if no key provided
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    
    if (!authHeader && !apiKeyHeader) {
        req.authenticated = false;
        return next();
    }
    
    return apiKeyAuth(req, res, next);
}

module.exports = {
    apiKeyAuth,
    optionalAuth,
    secureCompare
};
