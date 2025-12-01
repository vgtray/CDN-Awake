const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AdminUser {
    /**
     * Create a new admin user
     */
    static async create(data) {
        const { username, email, password, role = 'admin', createdBy = null } = data;
        
        // Hash password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const sql = `
            INSERT INTO admin_users (username, email, password_hash, role, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, role, is_active, created_at
        `;
        
        const result = await query(sql, [username, email, passwordHash, role, createdBy]);
        return result.rows[0];
    }

    /**
     * Find admin by ID
     */
    static async findById(id) {
        const sql = `
            SELECT id, username, email, role, is_active, last_login_at, created_at, updated_at
            FROM admin_users 
            WHERE id = $1
        `;
        
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Find admin by username
     */
    static async findByUsername(username) {
        const sql = `SELECT * FROM admin_users WHERE username = $1`;
        const result = await query(sql, [username]);
        return result.rows[0] || null;
    }

    /**
     * Find admin by email
     */
    static async findByEmail(email) {
        const sql = `SELECT * FROM admin_users WHERE email = $1`;
        const result = await query(sql, [email]);
        return result.rows[0] || null;
    }

    /**
     * Verify password
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Update last login
     */
    static async updateLastLogin(id) {
        const sql = `
            UPDATE admin_users 
            SET last_login_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    /**
     * Get all admin users
     */
    static async findAll() {
        const sql = `
            SELECT id, username, email, role, is_active, last_login_at, created_at
            FROM admin_users
            ORDER BY created_at DESC
        `;
        const result = await query(sql);
        return result.rows;
    }

    /**
     * Update admin user
     */
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        const allowedFields = ['username', 'email', 'role', 'is_active'];
        
        for (const [key, value] of Object.entries(data)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(snakeKey)) {
                fields.push(`${snakeKey} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }
        
        if (fields.length === 0) return null;
        
        values.push(id);
        const sql = `
            UPDATE admin_users 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, username, email, role, is_active, created_at
        `;
        
        const result = await query(sql, values);
        return result.rows[0] || null;
    }

    /**
     * Change password
     */
    static async changePassword(id, newPassword) {
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        
        const sql = `
            UPDATE admin_users 
            SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `;
        
        const result = await query(sql, [passwordHash, id]);
        return result.rows[0] || null;
    }

    /**
     * Delete admin user
     */
    static async delete(id) {
        const sql = `DELETE FROM admin_users WHERE id = $1 RETURNING id`;
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Count admin users
     */
    static async count() {
        const sql = `SELECT COUNT(*) FROM admin_users`;
        const result = await query(sql);
        return parseInt(result.rows[0].count);
    }

    /**
     * Check if any admin exists (for initial setup)
     */
    static async hasAnyAdmin() {
        const count = await this.count();
        return count > 0;
    }

    // ============ Session Management ============

    /**
     * Create refresh token session
     */
    static async createSession(userId, ipAddress, userAgent) {
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
        
        const sql = `
            INSERT INTO admin_sessions (user_id, refresh_token, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await query(sql, [userId, refreshToken, ipAddress, userAgent, expiresAt]);
        return result.rows[0];
    }

    /**
     * Find session by refresh token
     */
    static async findSessionByToken(refreshToken) {
        const sql = `
            SELECT s.*, u.username, u.email, u.role, u.is_active as user_active
            FROM admin_sessions s
            JOIN admin_users u ON s.user_id = u.id
            WHERE s.refresh_token = $1 
            AND s.is_revoked = FALSE 
            AND s.expires_at > CURRENT_TIMESTAMP
        `;
        
        const result = await query(sql, [refreshToken]);
        return result.rows[0] || null;
    }

    /**
     * Revoke session
     */
    static async revokeSession(sessionId) {
        const sql = `
            UPDATE admin_sessions 
            SET is_revoked = TRUE
            WHERE id = $1
        `;
        await query(sql, [sessionId]);
    }

    /**
     * Revoke all sessions for user
     */
    static async revokeAllSessions(userId) {
        const sql = `
            UPDATE admin_sessions 
            SET is_revoked = TRUE
            WHERE user_id = $1
        `;
        await query(sql, [userId]);
    }

    /**
     * Clean expired sessions
     */
    static async cleanExpiredSessions() {
        const sql = `
            DELETE FROM admin_sessions 
            WHERE expires_at < CURRENT_TIMESTAMP OR is_revoked = TRUE
            RETURNING id
        `;
        const result = await query(sql);
        return result.rowCount;
    }

    // ============ Activity Logging ============

    /**
     * Log admin activity
     */
    static async logActivity(data) {
        const { userId, action, targetType = null, targetId = null, details = null, ipAddress, userAgent } = data;
        
        const sql = `
            INSERT INTO admin_activity_logs 
            (user_id, action, target_type, target_id, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        try {
            const result = await query(sql, [
                userId, action, targetType, targetId, 
                details ? JSON.stringify(details) : null,
                ipAddress, userAgent
            ]);
            return result.rows[0];
        } catch (error) {
            logger.error('Failed to log admin activity:', error);
            return null;
        }
    }

    /**
     * Get activity logs
     */
    static async getActivityLogs(options = {}) {
        const { page = 1, limit = 50, userId = null, action = null } = options;
        const offset = (page - 1) * limit;
        const params = [];
        const conditions = [];
        let paramCount = 1;
        
        if (userId) {
            conditions.push(`l.user_id = $${paramCount}`);
            params.push(userId);
            paramCount++;
        }
        
        if (action) {
            conditions.push(`l.action = $${paramCount}`);
            params.push(action);
            paramCount++;
        }
        
        let sql = `
            SELECT l.*, u.username
            FROM admin_activity_logs l
            LEFT JOIN admin_users u ON l.user_id = u.id
        `;
        
        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        sql += ` ORDER BY l.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await query(sql, params);
        
        // Get total count
        let countSql = `SELECT COUNT(*) FROM admin_activity_logs l`;
        if (conditions.length > 0) {
            countSql += ` WHERE ${conditions.join(' AND ')}`;
        }
        const countParams = params.slice(0, -2);
        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        return {
            logs: result.rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }
}

module.exports = AdminUser;
