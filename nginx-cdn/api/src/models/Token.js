const { query } = require('../config/database');
const crypto = require('crypto');
const logger = require('../utils/logger');

class Token {
    /**
     * Create a new access token for a file
     */
    static async create(data) {
        const { 
            fileId, 
            expiresInHours = parseInt(process.env.TOKEN_EXPIRY_HOURS) || 24,
            maxDownloads = 1,
            createdBy = null 
        } = data;
        
        // Generate secure random token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Calculate expiry time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresInHours);
        
        const sql = `
            INSERT INTO access_tokens (file_id, token, expires_at, max_downloads, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await query(sql, [fileId, token, expiresAt, maxDownloads, createdBy]);
        return result.rows[0];
    }

    /**
     * Find token by token string
     */
    static async findByToken(tokenString) {
        const sql = `
            SELECT t.*, f.original_name, f.stored_name, f.mime_type, f.size
            FROM access_tokens t
            JOIN files f ON t.file_id = f.id
            WHERE t.token = $1 
            AND f.is_deleted = FALSE
        `;
        
        const result = await query(sql, [tokenString]);
        return result.rows[0] || null;
    }

    /**
     * Find token by ID
     */
    static async findById(id) {
        const sql = `
            SELECT t.*, f.original_name, f.stored_name, f.mime_type, f.size
            FROM access_tokens t
            JOIN files f ON t.file_id = f.id
            WHERE t.id = $1
        `;
        
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Validate if a token is usable
     */
    static async validate(tokenString) {
        const token = await this.findByToken(tokenString);
        
        if (!token) {
            return { valid: false, error: 'Token not found' };
        }
        
        if (token.is_revoked) {
            return { valid: false, error: 'Token has been revoked' };
        }
        
        if (new Date(token.expires_at) < new Date()) {
            return { valid: false, error: 'Token has expired' };
        }
        
        if (token.download_count >= token.max_downloads) {
            return { valid: false, error: 'Maximum downloads reached' };
        }
        
        return { valid: true, token };
    }

    /**
     * Increment download count
     */
    static async incrementDownloadCount(tokenId) {
        const sql = `
            UPDATE access_tokens 
            SET download_count = download_count + 1
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await query(sql, [tokenId]);
        return result.rows[0];
    }

    /**
     * Get all tokens for a file
     */
    static async findByFileId(fileId, includeExpired = false) {
        let sql = `
            SELECT * FROM access_tokens 
            WHERE file_id = $1
        `;
        
        if (!includeExpired) {
            sql += ` AND expires_at > CURRENT_TIMESTAMP AND is_revoked = FALSE`;
        }
        
        sql += ` ORDER BY created_at DESC`;
        
        const result = await query(sql, [fileId]);
        return result.rows;
    }

    /**
     * Get all tokens with pagination
     */
    static async findAll(options = {}) {
        const { 
            page = 1, 
            limit = 20, 
            includeExpired = false,
            fileId = null 
        } = options;
        
        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 1;
        
        let sql = `
            SELECT t.*, f.original_name, f.stored_name
            FROM access_tokens t
            JOIN files f ON t.file_id = f.id
            WHERE f.is_deleted = FALSE
        `;
        
        if (!includeExpired) {
            sql += ` AND t.expires_at > CURRENT_TIMESTAMP AND t.is_revoked = FALSE`;
        }
        
        if (fileId) {
            sql += ` AND t.file_id = $${paramCount}`;
            params.push(fileId);
            paramCount++;
        }
        
        sql += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await query(sql, params);
        
        // Get total count
        let countSql = `
            SELECT COUNT(*) 
            FROM access_tokens t
            JOIN files f ON t.file_id = f.id
            WHERE f.is_deleted = FALSE
        `;
        const countParams = [];
        
        if (!includeExpired) {
            countSql += ` AND t.expires_at > CURRENT_TIMESTAMP AND t.is_revoked = FALSE`;
        }
        
        if (fileId) {
            countSql += ` AND t.file_id = $1`;
            countParams.push(fileId);
        }
        
        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        return {
            tokens: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Revoke a token
     */
    static async revoke(id) {
        const sql = `
            UPDATE access_tokens 
            SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND is_revoked = FALSE
            RETURNING *
        `;
        
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Revoke all tokens for a file
     */
    static async revokeByFileId(fileId) {
        const sql = `
            UPDATE access_tokens 
            SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
            WHERE file_id = $1 AND is_revoked = FALSE
            RETURNING *
        `;
        
        const result = await query(sql, [fileId]);
        return result.rows;
    }

    /**
     * Delete expired tokens
     */
    static async deleteExpired() {
        const sql = `
            DELETE FROM access_tokens 
            WHERE expires_at < CURRENT_TIMESTAMP
            RETURNING id
        `;
        
        const result = await query(sql);
        return result.rowCount;
    }

    /**
     * Get token statistics
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_tokens,
                COUNT(CASE WHEN is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_tokens,
                COUNT(CASE WHEN is_revoked = TRUE THEN 1 END) as revoked_tokens,
                COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_tokens,
                SUM(download_count) as total_downloads
            FROM access_tokens
        `;
        
        const result = await query(sql);
        return result.rows[0];
    }
}

module.exports = Token;
