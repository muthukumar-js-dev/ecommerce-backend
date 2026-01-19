import { RedisClient, getRedisClient, closeRedisClient } from '@infrastructure/cache/redis-client';
import { CacheService, getCacheService } from '@infrastructure/cache/cache.service';
import { SessionService, getSessionService, Session } from '@infrastructure/cache/session.service';

describe('Redis Cache Integration Tests', () => {
    let redisClient: RedisClient;
    let cacheService: CacheService;
    let sessionService: SessionService;

    beforeAll(async () => {
        redisClient = getRedisClient();
        cacheService = getCacheService(redisClient);
        sessionService = getSessionService(redisClient);

        // Wait for Redis connection
        await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
        await closeRedisClient();
    });

    beforeEach(async () => {
        // Clear test data before each test
        await redisClient.flushdb();
    });

    describe('RedisClient', () => {
        it('should connect to Redis successfully', async () => {
            const result = await redisClient.ping();
            expect(result).toBe('PONG');
        });

        it('should set and get value', async () => {
            await redisClient.set('test-key', { value: 'test-data' }, 60);
            const result = await redisClient.get('test-key');

            expect(result).toEqual({ value: 'test-data' });
        });

        it('should delete value', async () => {
            await redisClient.set('delete-key', 'value', 60);
            await redisClient.del('delete-key');
            const result = await redisClient.get('delete-key');

            expect(result).toBeNull();
        });

        it('should check if key exists', async () => {
            await redisClient.set('exists-key', 'value', 60);
            const exists = await redisClient.exists('exists-key');
            const notExists = await redisClient.exists('non-existent-key');

            expect(exists).toBe(true);
            expect(notExists).toBe(false);
        });

        it('should expire key after TTL', async () => {
            await redisClient.set('expire-key', 'value', 1);
            await new Promise((resolve) => setTimeout(resolve, 1100));

            const result = await redisClient.get('expire-key');
            expect(result).toBeNull();
        });

        it('should increment counter', async () => {
            const count1 = await redisClient.incr('counter');
            const count2 = await redisClient.incr('counter');
            const count3 = await redisClient.incr('counter');

            expect(count1).toBe(1);
            expect(count2).toBe(2);
            expect(count3).toBe(3);
        });

        it('should work with hash operations', async () => {
            await redisClient.hset('user:1', 'name', 'John Doe');
            await redisClient.hset('user:1', 'email', 'john@example.com');

            const name = await redisClient.hget('user:1', 'name');
            const all = await redisClient.hgetall('user:1');

            expect(name).toBe('John Doe');
            expect(all).toEqual({
                name: 'John Doe',
                email: 'john@example.com',
            });
        });
    });

    describe('CacheService', () => {
        it('should use cache-aside pattern', async () => {
            let dbCalls = 0;

            const fetchFn = async () => {
                dbCalls++;
                return { data: 'from-database' };
            };

            // First call - cache miss, should call fetchFn
            const result1 = await cacheService.getOrSet('cache-aside-key', fetchFn, 60);
            expect(dbCalls).toBe(1);
            expect(result1).toEqual({ data: 'from-database' });

            // Second call - cache hit, should NOT call fetchFn
            const result2 = await cacheService.getOrSet('cache-aside-key', fetchFn, 60);
            expect(dbCalls).toBe(1); // Should still be 1
            expect(result2).toEqual({ data: 'from-database' });
        });

        it('should invalidate pattern', async () => {
            await cacheService.set('product:1', { id: 1 }, 60);
            await cacheService.set('product:2', { id: 2 }, 60);
            await cacheService.set('user:1', { id: 1 }, 60);

            await cacheService.invalidatePattern('product:*');

            const product1 = await cacheService.get('product:1');
            const product2 = await cacheService.get('product:2');
            const user1 = await cacheService.get('user:1');

            expect(product1).toBeNull();
            expect(product2).toBeNull();
            expect(user1).toEqual({ id: 1 }); // Should still exist
        });

        it('should handle cache failures gracefully', async () => {
            // This should not throw even if cache fails
            await cacheService.set('test', 'value', 60);
            const result = await cacheService.get('test');

            expect(result).toBe('value');
        });
    });

    describe('SessionService', () => {
        const mockSession: Session = {
            userId: 'user-123',
            email: 'test@example.com',
            role: 'user',
            createdAt: new Date(),
            lastActivity: new Date(),
        };

        it('should create and retrieve session', async () => {
            await sessionService.createSession('session-1', mockSession);
            const session = await sessionService.getSession('session-1');

            expect(session).toBeDefined();
            expect(session?.userId).toBe('user-123');
            expect(session?.email).toBe('test@example.com');
        });

        it('should update session', async () => {
            await sessionService.createSession('session-2', mockSession);
            await sessionService.updateSession('session-2', { role: 'admin' });

            const session = await sessionService.getSession('session-2');
            expect(session?.role).toBe('admin');
        });

        it('should delete session', async () => {
            await sessionService.createSession('session-3', mockSession);
            await sessionService.deleteSession('session-3');

            const session = await sessionService.getSession('session-3');
            expect(session).toBeNull();
        });

        it('should refresh session TTL', async () => {
            await sessionService.createSession('session-4', mockSession);

            await new Promise((resolve) => setTimeout(resolve, 1100));
            const ttlBefore = await sessionService.getSessionTTL('session-4');

            await sessionService.refreshSession('session-4');
            const ttlAfter = await sessionService.getSessionTTL('session-4');

            expect(ttlAfter).toBeGreaterThan(ttlBefore || 0);
        });

        it('should track user sessions', async () => {
            await sessionService.createSession('session-5', mockSession);
            await sessionService.createSession('session-6', mockSession);

            const sessions = await sessionService.getUserSessions('user-123');
            expect(sessions).toHaveLength(2);
            expect(sessions).toContain('session-5');
            expect(sessions).toContain('session-6');
        });

        it('should delete all user sessions', async () => {
            await sessionService.createSession('session-7', mockSession);
            await sessionService.createSession('session-8', mockSession);

            await sessionService.deleteUserSessions('user-123');

            const session7 = await sessionService.getSession('session-7');
            const session8 = await sessionService.getSession('session-8');

            expect(session7).toBeNull();
            expect(session8).toBeNull();
        });

        it('should check session validity', async () => {
            await sessionService.createSession('session-9', mockSession);

            const valid = await sessionService.isSessionValid('session-9');
            const invalid = await sessionService.isSessionValid('non-existent');

            expect(valid).toBe(true);
            expect(invalid).toBe(false);
        });
    });

    describe('Performance', () => {
        it('should handle high throughput', async () => {
            const operations = 1000;
            const startTime = Date.now();

            const promises = [];
            for (let i = 0; i < operations; i++) {
                promises.push(cacheService.set(`perf-key-${i}`, { value: i }, 60));
            }

            await Promise.all(promises);

            const endTime = Date.now();
            const duration = endTime - startTime;
            const opsPerSecond = (operations / duration) * 1000;

            console.log(`Throughput: ${opsPerSecond.toFixed(0)} ops/sec`);
            expect(opsPerSecond).toBeGreaterThan(100); // Should handle at least 100 ops/sec
        });

        it('should have low latency', async () => {
            await cacheService.set('latency-test', { data: 'test' }, 60);

            const iterations = 100;
            const startTime = Date.now();

            for (let i = 0; i < iterations; i++) {
                await cacheService.get('latency-test');
            }

            const endTime = Date.now();
            const avgLatency = (endTime - startTime) / iterations;

            console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
            expect(avgLatency).toBeLessThan(10); // Should be < 10ms
        });
    });
});
