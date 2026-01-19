import Redis, { Cluster, RedisOptions, ClusterOptions } from 'ioredis';

export class RedisClient {
    private client: Redis | Cluster;
    private isCluster: boolean;

    constructor() {
        this.isCluster = process.env.REDIS_CLUSTER === 'true';

        if (this.isCluster) {
            this.client = this.createClusterClient();
        } else {
            this.client = this.createStandaloneClient();
        }

        this.setupEventHandlers();
    }

    private createClusterClient(): Cluster {
        const clusterNodes = [
            { host: process.env.REDIS_HOST_0 ?? 'redis-0.redis-headless', port: 6379 },
            { host: process.env.REDIS_HOST_1 ?? 'redis-1.redis-headless', port: 6379 },
            { host: process.env.REDIS_HOST_2 ?? 'redis-2.redis-headless', port: 6379 },
        ];

        const clusterOptions: ClusterOptions = {
            redisOptions: {
                password: process.env.REDIS_PASSWORD,
                connectTimeout: 10000,
                maxRetriesPerRequest: 3,
            },
            clusterRetryStrategy: (times: number) => {
                const delay = Math.min(times * 100, 2000);
                console.log(`Redis cluster retry attempt ${times}, waiting ${delay}ms`);
                return delay;
            },
            enableReadyCheck: true,
            enableOfflineQueue: true,
        };

        return new Redis.Cluster(clusterNodes, clusterOptions);
    }

    private createStandaloneClient(): Redis {
        const options: RedisOptions = {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379'),
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
                return delay;
            },
            maxRetriesPerRequest: 3,
            connectTimeout: 10000,
            enableReadyCheck: true,
            enableOfflineQueue: true,
        };

        return new Redis(options);
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            console.log('Redis connected successfully');
        });

        this.client.on('ready', () => {
            console.log('Redis ready to accept commands');
        });

        this.client.on('error', (err: Error) => {
            console.error('Redis error:', err.message);
        });

        this.client.on('close', () => {
            console.log('Redis connection closed');
        });

        this.client.on('reconnecting', () => {
            console.log('Redis reconnecting...');
        });

        if (this.isCluster) {
            (this.client as Cluster).on('node error', (err: Error, node: any) => {
                console.error(`Redis cluster node error (${node}):`, err.message);
            });
        }
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error: unknown) {
            console.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, serialized);
            } else {
                await this.client.set(key, serialized);
            }
        } catch (error: unknown) {
            console.error(`Redis SET error for key ${key}:`, error);
            throw error;
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error: unknown) {
            console.error(`Redis DEL error for key ${key}:`, error);
            throw error;
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error: unknown) {
            console.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }

    async expire(key: string, seconds: number): Promise<void> {
        try {
            await this.client.expire(key, seconds);
        } catch (error: unknown) {
            console.error(`Redis EXPIRE error for key ${key}:`, error);
            throw error;
        }
    }

    async ttl(key: string): Promise<number> {
        try {
            return await this.client.ttl(key);
        } catch (error: unknown) {
            console.error(`Redis TTL error for key ${key}:`, error);
            return -1;
        }
    }

    async incr(key: string): Promise<number> {
        try {
            return await this.client.incr(key);
        } catch (error: unknown) {
            console.error(`Redis INCR error for key ${key}:`, error);
            throw error;
        }
    }

    async decr(key: string): Promise<number> {
        try {
            return await this.client.decr(key);
        } catch (error: unknown) {
            console.error(`Redis DECR error for key ${key}:`, error);
            throw error;
        }
    }

    async hget(key: string, field: string): Promise<string | null> {
        try {
            return await this.client.hget(key, field);
        } catch (error: unknown) {
            console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
            return null;
        }
    }

    async hset(key: string, field: string, value: string): Promise<void> {
        try {
            await this.client.hset(key, field, value);
        } catch (error: unknown) {
            console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
            throw error;
        }
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        try {
            return await this.client.hgetall(key);
        } catch (error: unknown) {
            console.error(`Redis HGETALL error for key ${key}:`, error);
            return {};
        }
    }

    async hdel(key: string, ...fields: string[]): Promise<void> {
        try {
            await this.client.hdel(key, ...fields);
        } catch (error: unknown) {
            console.error(`Redis HDEL error for key ${key}:`, error);
            throw error;
        }
    }

    async keys(pattern: string): Promise<string[]> {
        try {
            return await this.client.keys(pattern);
        } catch (error: unknown) {
            console.error(`Redis KEYS error for pattern ${pattern}:`, error);
            return [];
        }
    }

    async flushdb(): Promise<void> {
        try {
            await this.client.flushdb();
        } catch (error: unknown) {
            console.error('Redis FLUSHDB error:', error);
            throw error;
        }
    }

    async ping(): Promise<string> {
        try {
            return await this.client.ping();
        } catch (error: unknown) {
            console.error('Redis PING error:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.quit();
            console.log('Redis disconnected gracefully');
        } catch (error: unknown) {
            console.error('Redis disconnect error:', error);
            this.client.disconnect();
        }
    }

    getClient(): Redis | Cluster {
        return this.client;
    }
}

// Singleton instance
let redisClientInstance: RedisClient | null = null;

export function getRedisClient(): RedisClient {
    if (!redisClientInstance) {
        redisClientInstance = new RedisClient();
    }
    return redisClientInstance;
}

export async function closeRedisClient(): Promise<void> {
    if (redisClientInstance) {
        await redisClientInstance.disconnect();
        redisClientInstance = null;
    }
}
