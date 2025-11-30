const { query } = require('../config/database');
const logger = require('../utils/logger');

class AccessLog {
    /**
     * Create a new access log entry
     */
    static async create(data) {
        const { 
            fileId = null, 
            tokenId = null, 
            action, 
            ipAddress, 
            userAgent = null, 
            referer = null,
            statusCode, 
            responseTimeMs = null,
            errorMessage = null,
            metadata = null 
        } = data;
        
        const sql = `
            INSERT INTO access_logs 
            (file_id, token_id, action, ip_address, user_agent, referer, status_code, response_time_ms, error_message, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        try {
            const result = await query(sql, [
                fileId, 
                tokenId, 
                action, 
                ipAddress, 
                userAgent, 
                referer,
                statusCode, 
                responseTimeMs,
                errorMessage,
                metadata ? JSON.stringify(metadata) : null
            ]);
            return result.rows[0];
        } catch (error) {
            // Log the error but don't throw - logging should not break the request
            logger.error('Failed to create access log:', error);
            return null;
        }
    }

    /**
     * Log a download attempt
     */
    static async logDownload(data) {
        return this.create({
            ...data,
            action: 'download'
        });
    }

    /**
     * Log an upload
     */
    static async logUpload(data) {
        return this.create({
            ...data,
            action: 'upload'
        });
    }

    /**
     * Log a token creation
     */
    static async logTokenCreate(data) {
        return this.create({
            ...data,
            action: 'token_create'
        });
    }

    /**
     * Log a file deletion
     */
    static async logDelete(data) {
        return this.create({
            ...data,
            action: 'delete'
        });
    }

    /**
     * Find logs by file ID
     */
    static async findByFileId(fileId, options = {}) {
        const { page = 1, limit = 50 } = options;
        const offset = (page - 1) * limit;
        
        const sql = `
            SELECT * FROM access_logs 
            WHERE file_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await query(sql, [fileId, limit, offset]);
        
        const countResult = await query(
            `SELECT COUNT(*) FROM access_logs WHERE file_id = $1`,
            [fileId]
        );
        const total = parseInt(countResult.rows[0].count);
        
        return {
            logs: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Find all logs with filters
     */
    static async findAll(options = {}) {
        const { 
            page = 1, 
            limit = 50, 
            action = null,
            statusCode = null,
            ipAddress = null,
            startDate = null,
            endDate = null
        } = options;
        
        const offset = (page - 1) * limit;
        const params = [];
        const conditions = [];
        let paramCount = 1;
        
        if (action) {
            conditions.push(`action = $${paramCount}`);
            params.push(action);
            paramCount++;
        }
        
        if (statusCode) {
            conditions.push(`status_code = $${paramCount}`);
            params.push(statusCode);
            paramCount++;
        }
        
        if (ipAddress) {
            conditions.push(`ip_address = $${paramCount}`);
            params.push(ipAddress);
            paramCount++;
        }
        
        if (startDate) {
            conditions.push(`created_at >= $${paramCount}`);
            params.push(startDate);
            paramCount++;
        }
        
        if (endDate) {
            conditions.push(`created_at <= $${paramCount}`);
            params.push(endDate);
            paramCount++;
        }
        
        let sql = `
            SELECT l.*, f.original_name as file_name
            FROM access_logs l
            LEFT JOIN files f ON l.file_id = f.id
        `;
        
        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        sql += ` ORDER BY l.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await query(sql, params);
        
        // Get total count
        let countSql = `SELECT COUNT(*) FROM access_logs l`;
        if (conditions.length > 0) {
            countSql += ` WHERE ${conditions.join(' AND ')}`;
        }
        const countParams = params.slice(0, -2); // Remove limit and offset
        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        return {
            logs: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get access statistics
     */
    static async getStats(options = {}) {
        const { startDate = null, endDate = null } = options;
        
        let dateFilter = '';
        const params = [];
        
        if (startDate) {
            dateFilter = ` WHERE created_at >= $1`;
            params.push(startDate);
            if (endDate) {
                dateFilter += ` AND created_at <= $2`;
                params.push(endDate);
            }
        } else if (endDate) {
            dateFilter = ` WHERE created_at <= $1`;
            params.push(endDate);
        }
        
        const sql = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN action = 'download' THEN 1 END) as downloads,
                COUNT(CASE WHEN action = 'upload' THEN 1 END) as uploads,
                COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed,
                COUNT(DISTINCT ip_address) as unique_ips,
                AVG(response_time_ms) as avg_response_time
            FROM access_logs
            ${dateFilter}
        `;
        
        const result = await query(sql, params);
        return result.rows[0];
    }

    /**
     * Get top accessed files
     */
    static async getTopFiles(limit = 10) {
        const sql = `
            SELECT 
                f.id,
                f.original_name,
                COUNT(l.id) as access_count,
                COUNT(DISTINCT l.ip_address) as unique_visitors
            FROM files f
            LEFT JOIN access_logs l ON f.id = l.file_id AND l.action = 'download'
            WHERE f.is_deleted = FALSE
            GROUP BY f.id, f.original_name
            ORDER BY access_count DESC
            LIMIT $1
        `;
        
        const result = await query(sql, [limit]);
        return result.rows;
    }

    /**
     * Get access by IP address
     */
    static async getByIpAddress(ipAddress, options = {}) {
        const { page = 1, limit = 50 } = options;
        const offset = (page - 1) * limit;
        
        const sql = `
            SELECT l.*, f.original_name as file_name
            FROM access_logs l
            LEFT JOIN files f ON l.file_id = f.id
            WHERE l.ip_address = $1
            ORDER BY l.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await query(sql, [ipAddress, limit, offset]);
        return result.rows;
    }

    /**
     * Delete old logs
     */
    static async deleteOlderThan(days = 90) {
        const sql = `
            DELETE FROM access_logs 
            WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${parseInt(days)} days'
            RETURNING id
        `;
        
        const result = await query(sql);
        return result.rowCount;
    }
}

module.exports = AccessLog;
