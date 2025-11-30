const Token = require('../models/Token');
const logger = require('../utils/logger');

/**
 * Clean up expired tokens from the database
 * @returns {Promise<number>} Number of deleted tokens
 */
async function cleanupExpiredTokens() {
    try {
        const deletedCount = await Token.deleteExpired();
        if (deletedCount > 0) {
            logger.info(`Cleaned up ${deletedCount} expired tokens`);
        }
        return deletedCount;
    } catch (error) {
        logger.error('Error cleaning up expired tokens:', error);
        throw error;
    }
}

/**
 * Start the cleanup service with interval
 * @param {number} intervalMs - Cleanup interval in milliseconds
 */
function startCleanupService(intervalMs = 3600000) {
    logger.info(`Starting cleanup service with interval: ${intervalMs}ms`);
    
    // Run immediately on startup
    cleanupExpiredTokens().catch(err => {
        logger.error('Initial cleanup failed:', err);
    });
    
    // Set up recurring cleanup
    const intervalId = setInterval(async () => {
        try {
            await cleanupExpiredTokens();
        } catch (error) {
            logger.error('Scheduled cleanup failed:', error);
        }
    }, intervalMs);
    
    return intervalId;
}

module.exports = {
    cleanupExpiredTokens,
    startCleanupService
};
