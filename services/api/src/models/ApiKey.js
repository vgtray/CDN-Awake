const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class ApiKey {
    /**
     * Generate a new API key
     */
    static generateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Hash an API key for storage
     */
    static hashKey(key) {
        return crypto.createHash('sha256').update(key).digest('hex');
    }

    /**
     * Create a new API key
     */
    static async create(data) {
        const { name, permissions = ['read', 'write'], rateLimit = 100, expiresInDays = null } = data;
        
        const key = this.generateKey();
        const keyHash = this.hashKey(key);
        
        let expiresAt = null;
        if (expiresInDays) {
            expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
        }
        
        const sql = `
            INSERT INTO api_keys (key_hash, name, permissions, rate_limit, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, permissions, rate_limit, is_active, created_at, expires_at
        `;
        
        const result = await query(sql, [
            keyHash,
            name,
            JSON.stringify(permissions),
            rateLimit,
            expiresAt
        ]);
        
        // Return the plain key only on creation (won't be stored)
        return {
            ...result.rows[0],
            key: key,
            keyPrefix: key.substring(0, 8) + '...'
        };
    }

    /**
     * Find all API keys
     */
    static async findAll(options = {}) {
        const { includeInactive = false } = options;
        
        let sql = `
            SELECT id, name, permissions, rate_limit, is_active, last_used_at, created_at, expires_at,
                   LEFT(key_hash, 8) as key_prefix
            FROM api_keys
        `;
        
        if (!includeInactive) {
            sql += ` WHERE is_active = TRUE`;
        }
        
        sql += ` ORDER BY created_at DESC`;
        
        const result = await query(sql);
        return result.rows.map(row => ({
            ...row,
            key_prefix: row.key_prefix + '...',
            isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false
        }));
    }

    /**
     * Find API key by ID
     */
    static async findById(id) {
        const sql = `
            SELECT id, name, permissions, rate_limit, is_active, last_used_at, created_at, expires_at,
                   LEFT(key_hash, 8) as key_prefix
            FROM api_keys
            WHERE id = $1
        `;
        
        const result = await query(sql, [id]);
        if (result.rows.length === 0) return null;
        
        return {
            ...result.rows[0],
            key_prefix: result.rows[0].key_prefix + '...'
        };
    }

    /**
     * Validate an API key
     */
    static async validate(key) {
        const keyHash = this.hashKey(key);
        
        const sql = `
            SELECT id, name, permissions, rate_limit, is_active, expires_at
            FROM api_keys
            WHERE key_hash = $1
        `;
        
        const result = await query(sql, [keyHash]);
        
        if (result.rows.length === 0) {
            return { valid: false, reason: 'Invalid API key' };
        }
        
        const apiKey = result.rows[0];
        
        if (!apiKey.is_active) {
            return { valid: false, reason: 'API key is revoked' };
        }
        
        if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
            return { valid: false, reason: 'API key has expired' };
        }
        
        // Update last used timestamp
        await query(`UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`, [apiKey.id]);
        
        return {
            valid: true,
            apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                permissions: apiKey.permissions,
                rateLimit: apiKey.rate_limit
            }
        };
    }

    /**
     * Revoke an API key
     */
    static async revoke(id) {
        const sql = `
            UPDATE api_keys
            SET is_active = FALSE
            WHERE id = $1
            RETURNING id, name
        `;
        
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Update API key
     */
    static async update(id, data) {
        const { name, permissions, rateLimit, isActive } = data;
        const updates = [];
        const params = [];
        let paramCount = 1;
        
        if (name !== undefined) {
            updates.push(`name = $${paramCount}`);
            params.push(name);
            paramCount++;
        }
        
        if (permissions !== undefined) {
            updates.push(`permissions = $${paramCount}`);
            params.push(JSON.stringify(permissions));
            paramCount++;
        }
        
        if (rateLimit !== undefined) {
            updates.push(`rate_limit = $${paramCount}`);
            params.push(rateLimit);
            paramCount++;
        }
        
        if (isActive !== undefined) {
            updates.push(`is_active = $${paramCount}`);
            params.push(isActive);
            paramCount++;
        }
        
        if (updates.length === 0) {
            return null;
        }
        
        params.push(id);
        
        const sql = `
            UPDATE api_keys
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, name, permissions, rate_limit, is_active, last_used_at, created_at, expires_at
        `;
        
        const result = await query(sql, params);
        return result.rows[0] || null;
    }

    /**
     * Delete an API key permanently
     */
    static async delete(id) {
        const sql = `DELETE FROM api_keys WHERE id = $1 RETURNING id, name`;
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Get API key statistics
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active,
                COUNT(CASE WHEN is_active = FALSE THEN 1 END) as revoked,
                COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired
            FROM api_keys
        `;
        
        const result = await query(sql);
        return result.rows[0];
    }
}

module.exports = ApiKey;
