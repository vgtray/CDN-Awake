require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const { connectDB, pool } = require('./config/database');
const logger = require('./utils/logger');
const { apiKeyAuth } = require('./middleware/auth');
const { globalRateLimiter } = require('./middleware/rateLimit');
const { cleanupExpiredTokens } = require('./services/cleanup');

// Import routes
const filesRoutes = require('./routes/files');
const tokensRoutes = require('./routes/tokens');
const downloadRoutes = require('./routes/download');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());

// Compression middleware - compress all responses
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses larger than 1KB
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiting
app.use(globalRateLimiter);

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });
    next();
});

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected'
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// API info endpoint (no auth required)
app.get('/api', (req, res) => {
    res.json({
        name: 'CDN API',
        version: '1.0.0',
        description: 'Secure CDN API with file management and temporary access tokens',
        endpoints: {
            health: 'GET /health',
            files: {
                list: 'GET /api/files',
                upload: 'POST /api/files/upload',
                get: 'GET /api/files/:id',
                delete: 'DELETE /api/files/:id'
            },
            tokens: {
                create: 'POST /api/tokens',
                list: 'GET /api/tokens',
                revoke: 'DELETE /api/tokens/:id'
            },
            download: {
                withToken: 'GET /download/:token'
            }
        }
    });
});

// Public download route (token-based, no API key required)
app.use('/download', downloadRoutes);

// Admin authentication routes (public for login/setup)
app.use('/api/auth', authRoutes);

// Admin panel routes (require admin JWT)
app.use('/api/admin', adminRoutes);

// Protected API routes (require API key)
app.use('/api/files', apiKeyAuth, filesRoutes);
app.use('/api/tokens', apiKeyAuth, tokensRoutes);

// Static files served through nginx, but fallback for direct access
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    });

    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred' 
            : err.message,
        timestamp: new Date().toISOString()
    });
});

// Start server
async function startServer() {
    try {
        // Connect to database
        await connectDB();
        logger.info('Database connected successfully');

        // Start cleanup service
        const cleanupInterval = parseInt(process.env.CLEANUP_INTERVAL_MS) || 3600000;
        setInterval(async () => {
            try {
                const count = await cleanupExpiredTokens();
                if (count > 0) {
                    logger.info(`Cleaned up ${count} expired tokens`);
                }
            } catch (error) {
                logger.error('Token cleanup failed:', error);
            }
        }, cleanupInterval);

        // Initial cleanup on startup (optional, won't crash if tables don't exist)
        try {
            const initialCleanup = await cleanupExpiredTokens();
            logger.info(`Initial cleanup: removed ${initialCleanup} expired tokens`);
        } catch (error) {
            logger.warn('Initial cleanup skipped (tables may not exist yet):', error.message);
        }

        // Start listening
        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`CDN API server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

startServer();

module.exports = app;
