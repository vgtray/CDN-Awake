const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Global rate limiter for all API endpoints
 */
const globalRateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: 'See Retry-After header',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.originalUrl,
            limit: options.max,
            windowMs: options.windowMs
        });
        res.status(options.statusCode).json(options.message);
    },
    keyGenerator: (req) => {
        // Use X-Forwarded-For if behind proxy, otherwise use IP
        return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    }
});

/**
 * Stricter rate limiter for upload endpoints
 */
const uploadRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: {
        error: 'Too Many Uploads',
        message: 'Upload rate limit exceeded. Please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Upload rate limit exceeded', {
            ip: req.ip,
            limit: options.max
        });
        res.status(options.statusCode).json(options.message);
    }
});

/**
 * Rate limiter for download endpoints (more lenient)
 */
const downloadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 downloads per 15 minutes
    message: {
        error: 'Too Many Downloads',
        message: 'Download rate limit exceeded. Please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    }
});

/**
 * Rate limiter for token creation
 */
const tokenRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 token creations per hour
    message: {
        error: 'Too Many Token Requests',
        message: 'Token creation rate limit exceeded. Please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    globalRateLimiter,
    uploadRateLimiter,
    downloadRateLimiter,
    tokenRateLimiter
};
