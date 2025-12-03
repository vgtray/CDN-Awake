/**
 * Simple in-memory cache with TTL support
 * For production, consider using Redis
 */

const logger = require('../utils/logger');

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 5 minutes)
   */
  set(key, value, ttl = 300) {
    const entry = {
      value,
      expires: ttl > 0 ? Date.now() + (ttl * 1000) : null,
      createdAt: Date.now(),
    };
    
    this.cache.set(key, entry);
    this.stats.sets++;
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {boolean} Whether the key existed
   */
  delete(key) {
    const existed = this.cache.has(key);
    if (existed) {
      this.cache.delete(key);
      this.stats.deletes++;
    }
    return existed;
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   */
  deletePattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.stats.deletes += deleted;
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    logger.info(`Cache cleared: ${size} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: ${cleaned} expired entries removed`);
    }
  }
}

// Singleton instance
const cache = new MemoryCache();

/**
 * Cache middleware for Express routes
 * @param {number} ttl - Cache TTL in seconds
 * @param {function} keyGenerator - Function to generate cache key from request
 */
function cacheMiddleware(ttl = 60, keyGenerator = null) {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req) 
      : `route:${req.originalUrl}`;

    // Check cache
    const cached = cache.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, data, ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate cache for specific patterns
 */
function invalidateCache(patterns) {
  if (typeof patterns === 'string') {
    patterns = [patterns];
  }
  
  patterns.forEach(pattern => {
    cache.deletePattern(pattern);
  });
}

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
};
