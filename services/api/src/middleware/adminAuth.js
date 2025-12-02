const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            email: user.email,
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Admin authentication middleware
 */
async function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Access token required',
            timestamp: new Date().toISOString()
        });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired access token',
            timestamp: new Date().toISOString()
        });
    }
    
    // Verify user still exists and is active
    const user = await AdminUser.findById(decoded.id);
    
    if (!user || !user.is_active) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'User account is inactive or deleted',
            timestamp: new Date().toISOString()
        });
    }
    
    // Attach user to request
    req.adminUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    };
    
    next();
}

/**
 * Superadmin only middleware
 */
function superadminOnly(req, res, next) {
    if (req.adminUser.role !== 'superadmin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Superadmin access required',
            timestamp: new Date().toISOString()
        });
    }
    next();
}

/**
 * Optional admin auth - doesn't fail if no token
 */
async function optionalAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.adminUser = null;
        return next();
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (decoded) {
        const user = await AdminUser.findById(decoded.id);
        if (user && user.is_active) {
            req.adminUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };
        }
    }
    
    next();
}

module.exports = {
    generateAccessToken,
    verifyToken,
    adminAuth,
    superadminOnly,
    optionalAdminAuth,
    JWT_SECRET
};
