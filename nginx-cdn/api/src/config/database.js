const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || 'cdn_db',
    user: process.env.POSTGRES_USER || 'cdn_user',
    password: process.env.POSTGRES_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Connection event handlers
pool.on('connect', () => {
    logger.debug('New client connected to PostgreSQL');
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Test database connection
 */
async function connectDB() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        logger.info(`PostgreSQL connected at: ${result.rows[0].now}`);
        client.release();
        return true;
    } catch (error) {
        logger.error('Failed to connect to PostgreSQL:', error);
        throw error;
    }
}

/**
 * Execute a query with error handling
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug(`Query executed in ${duration}ms`, { 
            query: text.substring(0, 100),
            rows: result.rowCount 
        });
        return result;
    } catch (error) {
        logger.error('Query error:', { 
            query: text.substring(0, 100), 
            error: error.message 
        });
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);
    
    // Track query timing
    client.query = async (...args) => {
        const start = Date.now();
        try {
            const result = await originalQuery(...args);
            const duration = Date.now() - start;
            logger.debug(`Transaction query: ${duration}ms`);
            return result;
        } catch (error) {
            logger.error('Transaction query error:', error);
            throw error;
        }
    };
    
    // Ensure release is called properly
    client.release = () => {
        client.query = originalQuery;
        client.release = originalRelease;
        return originalRelease();
    };
    
    return client;
}

module.exports = {
    pool,
    query,
    getClient,
    connectDB
};
