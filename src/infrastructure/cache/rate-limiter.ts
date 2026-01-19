import { RedisClient } from './redis-client';

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

export class RateLimiter {
    constructor(private redisClient: RedisClient) { }

    /**
     * Check if request is within rate limit using sliding window algorithm
     */
    async checkLimit(
        key: string,
        maxRequests: number,
        windowSeconds: number
    ): Promise<RateLimitResult> {
        try {
            const now = Date.now();
            const windowStart = now - windowSeconds * 1000;
            const client = this.redisClient.getClient();

            // Remove old entries outside the window
            await client.zremrangebyscore(key, 0, windowStart);

            // Count requests in current window
            const count = await client.zcard(key);

            if (count >= maxRequests) {
                // Get the oldest request timestamp to calculate reset time
                const oldestRequests = await client.zrange(key, 0, 0, 'WITHSCORES');
                const oldestTimestamp = oldestRequests.length > 1
                    ? parseInt(oldestRequests[1] ?? String(now))
                    : now;

                const resetAt = new Date(oldestTimestamp + windowSeconds * 1000);

                return {
                    allowed: false,
                    remaining: 0,
                    resetAt,
                };
            }

            // Add current request
            await client.zadd(key, now, `${now}-${Math.random()}`);

            // Set expiration on the key
            await client.expire(key, windowSeconds);

            const resetAt = new Date(now + windowSeconds * 1000);

            return {
                allowed: true,
                remaining: maxRequests - count - 1,
                resetAt,
            };
        } catch (error: unknown) {
            console.error(`Rate limit check failed for key ${key}:`, error);
            // On error, allow the request (fail open)
            return {
                allowed: true,
                remaining: maxRequests,
                resetAt: new Date(Date.now() + windowSeconds * 1000),
            };
        }
    }

    /**
     * Check rate limit for IP address
     */
    async checkIPLimit(
        ipAddress: string,
        maxRequests: number = 100,
        windowSeconds: number = 60
    ): Promise<RateLimitResult> {
        const key = `ratelimit:ip:${ipAddress}`;
        return this.checkLimit(key, maxRequests, windowSeconds);
    }

    /**
     * Check rate limit for user
     */
    async checkUserLimit(
        userId: string,
        maxRequests: number = 1000,
        windowSeconds: number = 60
    ): Promise<RateLimitResult> {
        const key = `ratelimit:user:${userId}`;
        return this.checkLimit(key, maxRequests, windowSeconds);
    }

    /**
     * Check rate limit for API endpoint
     */
    async checkEndpointLimit(
        endpoint: string,
        identifier: string,
        maxRequests: number = 10,
        windowSeconds: number = 60
    ): Promise<RateLimitResult> {
        const key = `ratelimit:endpoint:${endpoint}:${identifier}`;
        return this.checkLimit(key, maxRequests, windowSeconds);
    }

    /**
     * Reset rate limit for a key
     */
    async resetLimit(key: string): Promise<void> {
        try {
            await this.redisClient.del(key);
        } catch (error: unknown) {
            console.error(`Failed to reset rate limit for key ${key}:`, error);
        }
    }

    /**
     * Get current request count for a key
     */
    async getRequestCount(key: string, windowSeconds: number): Promise<number> {
        try {
            const now = Date.now();
            const windowStart = now - windowSeconds * 1000;
            const client = this.redisClient.getClient();

            // Remove old entries
            await client.zremrangebyscore(key, 0, windowStart);

            // Count remaining entries
            return await client.zcard(key);
        } catch (error: unknown) {
            console.error(`Failed to get request count for key ${key}:`, error);
            return 0;
        }
    }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(redisClient: RedisClient): RateLimiter {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new RateLimiter(redisClient);
    }
    return rateLimiterInstance;
}
