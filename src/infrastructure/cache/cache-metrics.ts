import { RedisClient } from './redis-client';

export interface CacheMetricsData {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
}

export interface RedisInfo {
    usedMemory: string;
    usedMemoryPeak: string;
    connectedClients: number;
    totalConnectionsReceived: number;
    totalCommandsProcessed: number;
    instantaneousOpsPerSec: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    evictedKeys: number;
    expiredKeys: number;
}

export class CacheMetrics {
    private hits = 0;
    private misses = 0;

    constructor(private redisClient: RedisClient) { }

    /**
     * Record cache hit
     */
    recordHit(): void {
        this.hits++;
    }

    /**
     * Record cache miss
     */
    recordMiss(): void {
        this.misses++;
    }

    /**
     * Get hit rate (0-1)
     */
    getHitRate(): number {
        const total = this.hits + this.misses;
        return total === 0 ? 0 : this.hits / total;
    }

    /**
     * Get metrics data
     */
    getMetrics(): CacheMetricsData {
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: this.getHitRate(),
            totalRequests: this.hits + this.misses,
        };
    }

    /**
     * Reset metrics
     */
    reset(): void {
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get Redis server info
     */
    async getRedisInfo(): Promise<RedisInfo | null> {
        try {
            const client = this.redisClient.getClient();
            const info = await client.info();
            return this.parseRedisInfo(info);
        } catch (error: unknown) {
            console.error('Failed to get Redis info:', error);
            return null;
        }
    }

    /**
     * Get Redis memory usage
     */
    async getMemoryUsage(): Promise<{ used: string; peak: string } | null> {
        try {
            const info = await this.getRedisInfo();
            if (!info) {return null;}

            return {
                used: info.usedMemory,
                peak: info.usedMemoryPeak,
            };
        } catch (error: unknown) {
            console.error('Failed to get memory usage:', error);
            return null;
        }
    }

    /**
     * Get Redis keyspace statistics
     */
    async getKeyspaceStats(): Promise<{
        hits: number;
        misses: number;
        hitRate: number;
    } | null> {
        try {
            const info = await this.getRedisInfo();
            if (!info) {return null;}

            const total = info.keyspaceHits + info.keyspaceMisses;
            const hitRate = total === 0 ? 0 : info.keyspaceHits / total;

            return {
                hits: info.keyspaceHits,
                misses: info.keyspaceMisses,
                hitRate,
            };
        } catch (error: unknown) {
            console.error('Failed to get keyspace stats:', error);
            return null;
        }
    }

    /**
     * Get comprehensive metrics for monitoring
     */
    async getComprehensiveMetrics(): Promise<{
        application: CacheMetricsData;
        redis: RedisInfo | null;
        keyspace: { hits: number; misses: number; hitRate: number } | null;
    }> {
        const [redisInfo, keyspaceStats] = await Promise.all([
            this.getRedisInfo(),
            this.getKeyspaceStats(),
        ]);

        return {
            application: this.getMetrics(),
            redis: redisInfo,
            keyspace: keyspaceStats,
        };
    }

    /**
     * Parse Redis INFO command output
     */
    private parseRedisInfo(info: string): RedisInfo {
        const lines = info.split('\r\n');
        const data: Record<string, unknown> = {};

        for (const line of lines) {
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split(':');
                if (key && value) {
                    data[key] = value;
                }
            }
        }

        return {
            usedMemory: (data.used_memory_human as string) ?? '0',
            usedMemoryPeak: (data.used_memory_peak_human as string) ?? '0',
            connectedClients: parseInt((data.connected_clients as string) ?? '0') ?? 0,
            totalConnectionsReceived: parseInt((data.total_connections_received as string) ?? '0') ?? 0,
            totalCommandsProcessed: parseInt((data.total_commands_processed as string) ?? '0') ?? 0,
            instantaneousOpsPerSec: parseInt((data.instantaneous_ops_per_sec as string) ?? '0') ?? 0,
            keyspaceHits: parseInt((data.keyspace_hits as string) ?? '0') ?? 0,
            keyspaceMisses: parseInt((data.keyspace_misses as string) ?? '0') ?? 0,
            evictedKeys: parseInt((data.evicted_keys as string) ?? '0') ?? 0,
            expiredKeys: parseInt((data.expired_keys as string) ?? '0') ?? 0,
        };
    }
}

// Singleton instance
let cacheMetricsInstance: CacheMetrics | null = null;

export function getCacheMetrics(redisClient: RedisClient): CacheMetrics {
    if (!cacheMetricsInstance) {
        cacheMetricsInstance = new CacheMetrics(redisClient);
    }
    return cacheMetricsInstance;
}
