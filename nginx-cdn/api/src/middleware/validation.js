const path = require('path');
const logger = require('../utils/logger');

/**
 * Allowed MIME types for upload
 */
const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/gzip',
    'application/x-tar',
    // Media
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'video/ogg',
    // Fonts
    'font/woff',
    'font/woff2',
    'font/ttf',
    'font/otf',
    'application/font-woff',
    'application/font-woff2'
];

/**
 * Dangerous file extensions that should be blocked
 */
const BLOCKED_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.vbe',
    '.js', '.jse', '.wsf', '.wsh', '.msc', '.msi', '.msp',
    '.com', '.pif', '.scr', '.hta', '.cpl', '.jar', '.gadget',
    '.inf', '.reg', '.dll', '.sys', '.drv'
];

/**
 * Get allowed extensions from environment or use defaults
 */
function getAllowedExtensions() {
    const envExtensions = process.env.ALLOWED_EXTENSIONS;
    if (envExtensions) {
        return envExtensions.split(',').map(ext => ext.trim().toLowerCase());
    }
    return [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
        '.pdf', '.txt', '.json', '.html', '.css',
        '.zip', '.gz', '.tar',
        '.mp3', '.wav', '.ogg',
        '.mp4', '.webm',
        '.woff', '.woff2', '.ttf', '.otf'
    ];
}

/**
 * Validate file name for security issues
 */
function validateFileName(filename) {
    if (!filename || typeof filename !== 'string') {
        return { valid: false, error: 'Invalid filename' };
    }

    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return { valid: false, error: 'Invalid characters in filename' };
    }

    // Check for null bytes
    if (filename.includes('\0')) {
        return { valid: false, error: 'Invalid filename format' };
    }

    // Check length
    if (filename.length > 255) {
        return { valid: false, error: 'Filename too long (max 255 characters)' };
    }

    // Check for hidden files
    if (filename.startsWith('.')) {
        return { valid: false, error: 'Hidden files are not allowed' };
    }

    // Check extension
    const ext = path.extname(filename).toLowerCase();
    
    if (BLOCKED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: `File extension ${ext} is not allowed for security reasons` };
    }

    const allowedExtensions = getAllowedExtensions();
    if (!allowedExtensions.includes(ext)) {
        return { 
            valid: false, 
            error: `File extension ${ext} is not allowed. Allowed: ${allowedExtensions.join(', ')}` 
        };
    }

    return { valid: true };
}

/**
 * Validate MIME type
 */
function validateMimeType(mimeType) {
    if (!mimeType || typeof mimeType !== 'string') {
        return { valid: false, error: 'Invalid MIME type' };
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return { 
            valid: false, 
            error: `MIME type ${mimeType} is not allowed` 
        };
    }

    return { valid: true };
}

/**
 * Validate file size
 */
function validateFileSize(size) {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 104857600; // 100MB default
    
    if (!size || size <= 0) {
        return { valid: false, error: 'Invalid file size' };
    }

    if (size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return { 
            valid: false, 
            error: `File size exceeds maximum allowed (${maxSizeMB}MB)` 
        };
    }

    return { valid: true };
}

/**
 * Middleware to validate file upload
 */
function validateUpload(req, res, next) {
    if (!req.file) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'No file uploaded',
            timestamp: new Date().toISOString()
        });
    }

    const file = req.file;

    // Validate filename
    const filenameValidation = validateFileName(file.originalname);
    if (!filenameValidation.valid) {
        logger.warn('File validation failed: invalid filename', {
            filename: file.originalname,
            error: filenameValidation.error
        });
        return res.status(400).json({
            error: 'Bad Request',
            message: filenameValidation.error,
            timestamp: new Date().toISOString()
        });
    }

    // Validate MIME type
    const mimeValidation = validateMimeType(file.mimetype);
    if (!mimeValidation.valid) {
        logger.warn('File validation failed: invalid MIME type', {
            filename: file.originalname,
            mimeType: file.mimetype,
            error: mimeValidation.error
        });
        return res.status(400).json({
            error: 'Bad Request',
            message: mimeValidation.error,
            timestamp: new Date().toISOString()
        });
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size);
    if (!sizeValidation.valid) {
        logger.warn('File validation failed: invalid size', {
            filename: file.originalname,
            size: file.size,
            error: sizeValidation.error
        });
        return res.status(400).json({
            error: 'Bad Request',
            message: sizeValidation.error,
            timestamp: new Date().toISOString()
        });
    }

    next();
}

/**
 * Sanitize filename for storage
 */
function sanitizeFileName(filename) {
    // Remove path components
    let sanitized = path.basename(filename);
    
    // Replace special characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Remove multiple consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Ensure it doesn't start with a dot or underscore
    sanitized = sanitized.replace(/^[._]+/, '');
    
    // Limit length
    if (sanitized.length > 200) {
        const ext = path.extname(sanitized);
        const name = path.basename(sanitized, ext);
        sanitized = name.substring(0, 200 - ext.length) + ext;
    }
    
    return sanitized || 'unnamed_file';
}

module.exports = {
    validateFileName,
    validateMimeType,
    validateFileSize,
    validateUpload,
    sanitizeFileName,
    ALLOWED_MIME_TYPES,
    BLOCKED_EXTENSIONS,
    getAllowedExtensions
};
