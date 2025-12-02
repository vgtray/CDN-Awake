const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../utils/logger');

class File {
    /**
     * Create a new file record
     */
    static async create(data) {
        const { originalName, storedName, mimeType, size, checksum, uploadedBy } = data;
        
        const sql = `
            INSERT INTO files (original_name, stored_name, mime_type, size, checksum, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const result = await query(sql, [originalName, storedName, mimeType, size, checksum, uploadedBy]);
        return result.rows[0];
    }

    /**
     * Find file by ID
     */
    static async findById(id) {
        const sql = `
            SELECT * FROM files 
            WHERE id = $1 AND is_deleted = FALSE
        `;
        
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Find file by stored name
     */
    static async findByStoredName(storedName) {
        const sql = `
            SELECT * FROM files 
            WHERE stored_name = $1 AND is_deleted = FALSE
        `;
        
        const result = await query(sql, [storedName]);
        return result.rows[0] || null;
    }

    /**
     * Get all files with pagination
     */
    static async findAll(options = {}) {
        const { 
            page = 1, 
            limit = 20, 
            sortBy = 'created_at', 
            sortOrder = 'DESC',
            search = null 
        } = options;
        
        const offset = (page - 1) * limit;
        const validSortColumns = ['created_at', 'original_name', 'size', 'mime_type'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        let sql = `
            SELECT * FROM files 
            WHERE is_deleted = FALSE
        `;
        const params = [];
        
        if (search) {
            sql += ` AND original_name ILIKE $1`;
            params.push(`%${search}%`);
        }
        
        sql += ` ORDER BY ${sortColumn} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const result = await query(sql, params);
        
        // Get total count
        let countSql = `SELECT COUNT(*) FROM files WHERE is_deleted = FALSE`;
        const countParams = [];
        if (search) {
            countSql += ` AND original_name ILIKE $1`;
            countParams.push(`%${search}%`);
        }
        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        return {
            files: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Soft delete a file
     */
    static async delete(id) {
        const sql = `
            UPDATE files 
            SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND is_deleted = FALSE
            RETURNING *
        `;
        
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Hard delete a file (use with caution)
     */
    static async hardDelete(id) {
        const sql = `DELETE FROM files WHERE id = $1 RETURNING *`;
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Update file metadata
     */
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        const allowedFields = ['original_name'];
        
        for (const [key, value] of Object.entries(data)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(snakeKey)) {
                fields.push(`${snakeKey} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }
        
        if (fields.length === 0) {
            return null;
        }
        
        values.push(id);
        const sql = `
            UPDATE files 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount} AND is_deleted = FALSE
            RETURNING *
        `;
        
        const result = await query(sql, values);
        return result.rows[0] || null;
    }

    /**
     * Generate unique stored name
     */
    static generateStoredName(originalName) {
        const ext = originalName.substring(originalName.lastIndexOf('.'));
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `${timestamp}_${random}${ext}`;
    }

    /**
     * Calculate file checksum
     */
    static calculateChecksum(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Get file statistics
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_files,
                SUM(size) as total_size,
                COUNT(DISTINCT mime_type) as unique_mime_types,
                AVG(size) as avg_file_size
            FROM files 
            WHERE is_deleted = FALSE
        `;
        
        const result = await query(sql);
        return result.rows[0];
    }
}

module.exports = File;
