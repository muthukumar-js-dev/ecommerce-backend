import { CacheService } from '@infrastructure/cache/cache.service';

export class UserCacheService {
    private readonly CACHE_PREFIX = 'user:';
    private readonly PROFILE_PREFIX = 'user:profile:';
    private readonly CACHE_TTL = 600; // 10 minutes

    constructor(private cacheService: CacheService) { }

    /**
     * Get user by ID with caching
     */
    async getUser(
        userId: string,
        fetchFn: () => Promise<any>
    ): Promise<any> {
        const cacheKey = `${this.CACHE_PREFIX}${userId}`;

        return this.cacheService.getOrSet(
            cacheKey,
            fetchFn,
            this.CACHE_TTL
        );
    }

    /**
     * Get user by email with caching
     */
    async getUserByEmail(
        email: string,
        fetchFn: () => Promise<any>
    ): Promise<any> {
        const cacheKey = `${this.CACHE_PREFIX}email:${email}`;

        return this.cacheService.getOrSet(
            cacheKey,
            fetchFn,
            this.CACHE_TTL
        );
    }

    /**
     * Get user profile with caching
     */
    async getUserProfile(
        userId: string,
        fetchFn: () => Promise<any>
    ): Promise<any> {
        const cacheKey = `${this.PROFILE_PREFIX}${userId}`;

        return this.cacheService.getOrSet(
            cacheKey,
            fetchFn,
            this.CACHE_TTL
        );
    }

    /**
     * Invalidate user cache
     */
    async invalidateUser(userId: string): Promise<void> {
        const keys = [
            `${this.CACHE_PREFIX}${userId}`,
            `${this.PROFILE_PREFIX}${userId}`,
        ];

        await this.cacheService.invalidateMany(keys);
    }

    /**
     * Invalidate user by email
     */
    async invalidateUserByEmail(email: string): Promise<void> {
        const cacheKey = `${this.CACHE_PREFIX}email:${email}`;
        await this.cacheService.del(cacheKey);
    }

    /**
     * Cache user preferences
     */
    async cacheUserPreferences(
        userId: string,
        preferences: any,
        ttl: number = this.CACHE_TTL
    ): Promise<void> {
        const cacheKey = `user:preferences:${userId}`;
        await this.cacheService.set(cacheKey, preferences, ttl);
    }

    /**
     * Get user preferences from cache
     */
    async getUserPreferences(userId: string): Promise<any> {
        const cacheKey = `user:preferences:${userId}`;
        return this.cacheService.get(cacheKey);
    }
}
