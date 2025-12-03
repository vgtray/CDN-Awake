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
     * Get all files with pagination and advanced filters
     */
    static async findAll(options = {}) {
        const { 
            page = 1, 
            limit = 20, 
            sortBy = 'created_at', 
            sortOrder = 'DESC',
            search = null,
            // Advanced filters
            mimeType = null,
            mimeCategory = null, // 'image', 'video', 'audio', 'document', 'archive'
            minSize = null,
            maxSize = null,
            startDate = null,
            endDate = null,
            uploadedBy = null
        } = options;
        
        const offset = (page - 1) * limit;
        const validSortColumns = ['created_at', 'original_name', 'size', 'mime_type', 'updated_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        let sql = `SELECT * FROM files WHERE is_deleted = FALSE`;
        const params = [];
        let paramCount = 1;
        
        // Full-text search on original_name
        if (search) {
            sql += ` AND (
                original_name ILIKE $${paramCount} 
                OR stored_name ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
            paramCount++;
        }
        
        // MIME type exact match
        if (mimeType) {
            sql += ` AND mime_type = $${paramCount}`;
            params.push(mimeType);
            paramCount++;
        }
        
        // MIME category filter
        if (mimeCategory) {
            const mimePatterns = {
                image: 'image/%',
                video: 'video/%',
                audio: 'audio/%',
                document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats%', 'text/%'],
                archive: ['application/zip', 'application/x-rar%', 'application/x-tar', 'application/gzip', 'application/x-7z%']
            };
            
            const pattern = mimePatterns[mimeCategory];
            if (pattern) {
                if (Array.isArray(pattern)) {
                    const conditions = pattern.map((_, idx) => `mime_type LIKE $${paramCount + idx}`).join(' OR ');
                    sql += ` AND (${conditions})`;
                    params.push(...pattern);
                    paramCount += pattern.length;
                } else {
                    sql += ` AND mime_type LIKE $${paramCount}`;
                    params.push(pattern);
                    paramCount++;
                }
            }
        }
        
        // Size filters
        if (minSize !== null) {
            sql += ` AND size >= $${paramCount}`;
            params.push(parseInt(minSize));
            paramCount++;
        }
        
        if (maxSize !== null) {
            sql += ` AND size <= $${paramCount}`;
            params.push(parseInt(maxSize));
            paramCount++;
        }
        
        // Date filters
        if (startDate) {
            sql += ` AND created_at >= $${paramCount}`;
            params.push(new Date(startDate));
            paramCount++;
        }
        
        if (endDate) {
            sql += ` AND created_at <= $${paramCount}`;
            params.push(new Date(endDate));
            paramCount++;
        }
        
        // Uploaded by filter
        if (uploadedBy) {
            sql += ` AND uploaded_by = $${paramCount}`;
            params.push(uploadedBy);
            paramCount++;
        }
        
        sql += ` ORDER BY ${sortColumn} ${order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await query(sql, params);
        
        // Get total count with same filters
        let countSql = `SELECT COUNT(*) FROM files WHERE is_deleted = FALSE`;
        const countParams = [];
        let countParamIdx = 1;
        
        if (search) {
            countSql += ` AND (original_name ILIKE $${countParamIdx} OR stored_name ILIKE $${countParamIdx})`;
            countParams.push(`%${search}%`);
            countParamIdx++;
        }
        if (mimeType) {
            countSql += ` AND mime_type = $${countParamIdx}`;
            countParams.push(mimeType);
            countParamIdx++;
        }
        if (mimeCategory) {
            const mimePatterns = {
                image: 'image/%',
                video: 'video/%',
                audio: 'audio/%',
                document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats%', 'text/%'],
                archive: ['application/zip', 'application/x-rar%', 'application/x-tar', 'application/gzip', 'application/x-7z%']
            };
            const pattern = mimePatterns[mimeCategory];
            if (pattern) {
                if (Array.isArray(pattern)) {
                    const conditions = pattern.map((_, idx) => `mime_type LIKE $${countParamIdx + idx}`).join(' OR ');
                    countSql += ` AND (${conditions})`;
                    countParams.push(...pattern);
                    countParamIdx += pattern.length;
                } else {
                    countSql += ` AND mime_type LIKE $${countParamIdx}`;
                    countParams.push(pattern);
                    countParamIdx++;
                }
            }
        }
        if (minSize !== null) {
            countSql += ` AND size >= $${countParamIdx}`;
            countParams.push(parseInt(minSize));
            countParamIdx++;
        }
        if (maxSize !== null) {
            countSql += ` AND size <= $${countParamIdx}`;
            countParams.push(parseInt(maxSize));
            countParamIdx++;
        }
        if (startDate) {
            countSql += ` AND created_at >= $${countParamIdx}`;
            countParams.push(new Date(startDate));
            countParamIdx++;
        }
        if (endDate) {
            countSql += ` AND created_at <= $${countParamIdx}`;
            countParams.push(new Date(endDate));
            countParamIdx++;
        }
        if (uploadedBy) {
            countSql += ` AND uploaded_by = $${countParamIdx}`;
            countParams.push(uploadedBy);
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
            },
            filters: {
                search,
                mimeType,
                mimeCategory,
                minSize,
                maxSize,
                startDate,
                endDate,
                uploadedBy
            }
        };
    }

    /**
     * Get available MIME types for filter dropdown
     */
    static async getMimeTypes() {
        const sql = `
            SELECT DISTINCT mime_type, COUNT(*) as count
            FROM files 
            WHERE is_deleted = FALSE
            GROUP BY mime_type
            ORDER BY count DESC
        `;
        const result = await query(sql);
        return result.rows;
    }

    /**
     * Get file size statistics for filter ranges
     */
    static async getSizeStats() {
        const sql = `
            SELECT 
                MIN(size) as min_size,
                MAX(size) as max_size,
                AVG(size) as avg_size,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY size) as median_size
            FROM files 
            WHERE is_deleted = FALSE
        `;
        const result = await query(sql);
        return result.rows[0];
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
