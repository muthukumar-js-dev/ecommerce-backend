import { RedisClient } from './redis-client';

export class CacheService {
    constructor(private redisClient: RedisClient) { }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            return await this.redisClient.get<T>(key);
        } catch (error: unknown) {
            console.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set value in cache with optional TTL
     */
    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        try {
            await this.redisClient.set(key, value, ttl);
        } catch (error: unknown) {
            console.error(`Cache set error for key ${key}:`, error);
            // Don't throw - cache failures shouldn't break the application
        }
    }

    /**
     * Delete value from cache
     */
    async del(key: string): Promise<void> {
        try {
            await this.redisClient.del(key);
        } catch (error: unknown) {
            console.error(`Cache delete error for key ${key}:`, error);
        }
    }

    /**
     * Check if key exists in cache
     */
    async exists(key: string): Promise<boolean> {
        try {
            return await this.redisClient.exists(key);
        } catch (error: unknown) {
            console.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Cache-aside pattern: Get from cache or fetch from source
     */
    async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl: number = 300
    ): Promise<T> {
        // Try to get from cache
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Fetch from source
        const value = await fetchFn();

        // Store in cache (don't await to avoid blocking)
        this.set(key, value, ttl).catch((err) => {
            console.error(`Background cache set failed for key ${key}:`, err);
        });

        return value;
    }

    /**
     * Invalidate cache keys matching a pattern
     * WARNING: Use with caution in production - can be expensive
     */
    async invalidatePattern(pattern: string): Promise<void> {
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length > 0) {
                await Promise.all(keys.map((key) => this.del(key)));
                console.log(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
            }
        } catch (error: unknown) {
            console.error(`Cache invalidate pattern error for ${pattern}:`, error);
        }
    }

    /**
     * Invalidate multiple keys
     */
    async invalidateMany(keys: string[]): Promise<void> {
        try {
            await Promise.all(keys.map((key) => this.del(key)));
        } catch (error: unknown) {
            console.error('Cache invalidate many error:', error);
        }
    }

    /**
     * Get TTL for a key
     */
    async getTTL(key: string): Promise<number> {
        try {
            return await this.redisClient.ttl(key);
        } catch (error: unknown) {
            console.error(`Cache getTTL error for key ${key}:`, error);
            return -1;
        }
    }

    /**
     * Refresh TTL for a key
     */
    async refreshTTL(key: string, ttl: number): Promise<void> {
        try {
            await this.redisClient.expire(key, ttl);
        } catch (error: unknown) {
            console.error(`Cache refreshTTL error for key ${key}:`, error);
        }
    }

    /**
     * Increment counter
     */
    async increment(key: string): Promise<number> {
        try {
            return await this.redisClient.incr(key);
        } catch (error: unknown) {
            console.error(`Cache increment error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Decrement counter
     */
    async decrement(key: string): Promise<number> {
        try {
            return await this.redisClient.decr(key);
        } catch (error: unknown) {
            console.error(`Cache decrement error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Clear all cache (use with extreme caution!)
     */
    async clear(): Promise<void> {
        try {
            await this.redisClient.flushdb();
            console.warn('Cache cleared - all keys deleted');
        } catch (error: unknown) {
            console.error('Cache clear error:', error);
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.redisClient.ping();
            return result === 'PONG';
        } catch (error: unknown) {
            console.error('Cache health check failed:', error);
            return false;
        }
    }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(redisClient: RedisClient): CacheService {
    if (!cacheServiceInstance) {
        cacheServiceInstance = new CacheService(redisClient);
    }
    return cacheServiceInstance;
}
