# Phase 4 - Task 3: Implement Redis Caching

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Tasks 1-2 (Kubernetes + Containers)

---

## Objective

Setup Redis cluster for high-performance caching, session management, and reducing database load to support 10 million concurrent users.

---

## Context

Redis provides:
- **In-Memory Storage:** Sub-millisecond latency
- **Session Management:** Distributed session storage
- **Data Caching:** Reduce database queries by 80%+
- **Pub/Sub:** Real-time messaging
- **High Availability:** Redis Cluster with replication

---

## Implementation Steps

### Step 1: Redis Cluster Deployment on Kubernetes

**Create `k8s/redis/redis-statefulset.yaml`:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: ecommerce-prod
data:
  redis.conf: |
    maxmemory 2gb
    maxmemory-policy allkeys-lru
    save ""
    appendonly yes
    appendfsync everysec
---
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
  namespace: ecommerce-prod
spec:
  clusterIP: None
  ports:
    - port: 6379
      name: redis
  selector:
    app: redis
---
apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: ecommerce-prod
spec:
  type: ClusterIP
  ports:
    - port: 6379
      targetPort: 6379
  selector:
    app: redis
    role: master
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: ecommerce-prod
spec:
  serviceName: redis-headless
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
              name: redis
          command:
            - redis-server
            - /etc/redis/redis.conf
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /etc/redis
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 1000m
              memory: 4Gi
          livenessProbe:
            tcpSocket:
              port: 6379
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

**Deploy Redis:**

```bash
kubectl apply -f k8s/redis/redis-statefulset.yaml
```

### Step 2: Redis Client Implementation

**Install dependencies:**

```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

**Create `src/infrastructure/cache/redis-client.ts`:**

```typescript
import Redis, { Cluster } from 'ioredis';

export class RedisClient {
  private client: Redis | Cluster;

  constructor() {
    const isCluster = process.env.REDIS_CLUSTER === 'true';

    if (isCluster) {
      this.client = new Redis.Cluster(
        [
          { host: 'redis-0.redis-headless', port: 6379 },
          { host: 'redis-1.redis-headless', port: 6379 },
          { host: 'redis-2.redis-headless', port: 6379 },
        ],
        {
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
          },
          clusterRetryStrategy: (times) => {
            return Math.min(times * 100, 2000);
          },
        }
      );
    } else {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
      });
    }

    this.client.on('connect', () => {
      console.log('Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
```

### Step 3: Cache Service Implementation

**Create `src/infrastructure/cache/cache.service.ts`:**

```typescript
import { RedisClient } from './redis-client';

export class CacheService {
  constructor(private redisClient: RedisClient) {}

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redisClient.get<T>(key);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.redisClient.set(key, value, ttl);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  // Cache-aside pattern
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

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  // Invalidate pattern
  async invalidatePattern(pattern: string): Promise<void> {
    // Note: Use with caution in production
    const keys = await this.redisClient['client'].keys(pattern);
    if (keys.length > 0) {
      await this.redisClient['client'].del(...keys);
    }
  }
}
```

### Step 4: Session Management

**Create `src/infrastructure/cache/session.service.ts`:**

```typescript
import { RedisClient } from './redis-client';

export interface Session {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  lastActivity: Date;
}

export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

  constructor(private redisClient: RedisClient) {}

  async createSession(sessionId: string, session: Session): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redisClient.set(key, session, this.SESSION_TTL);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const key = this.getSessionKey(sessionId);
    return this.redisClient.get<Session>(key);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const session = await this.getSession(sessionId);
    
    if (session) {
      const updated = { ...session, ...updates, lastActivity: new Date() };
      await this.redisClient.set(key, updated, this.SESSION_TTL);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redisClient.del(key);
  }

  async refreshSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    await this.redisClient.expire(key, this.SESSION_TTL);
  }

  private getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }
}
```

### Step 5: Caching Strategies

**Create `src/application/cache/product-cache.service.ts`:**

```typescript
import { CacheService } from '@infrastructure/cache/cache.service';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';

export class ProductCacheService {
  private readonly CACHE_PREFIX = 'product:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private cacheService: CacheService,
    private productRepository: IProductRepository
  ) {}

  async getProduct(productId: string) {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const product = await this.productRepository.findById(productId);
        return product;
      },
      this.CACHE_TTL
    );
  }

  async getProducts(page: number, limit: number) {
    const cacheKey = `${this.CACHE_PREFIX}list:${page}:${limit}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const products = await this.productRepository.findAll(page, limit);
        return products;
      },
      this.CACHE_TTL
    );
  }

  async invalidateProduct(productId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;
    await this.cacheService.del(cacheKey);
    
    // Invalidate list caches
    await this.cacheService.invalidatePattern(`${this.CACHE_PREFIX}list:*`);
  }
}
```

**Create `src/application/cache/user-cache.service.ts`:**

```typescript
export class UserCacheService {
  private readonly CACHE_PREFIX = 'user:';
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    private cacheService: CacheService,
    private userRepository: IUserRepository
  ) {}

  async getUser(userId: string) {
    const cacheKey = `${this.CACHE_PREFIX}${userId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const user = await this.userRepository.findById(userId);
        return user;
      },
      this.CACHE_TTL
    );
  }

  async invalidateUser(userId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${userId}`;
    await this.cacheService.del(cacheKey);
  }
}
```

### Step 6: Event-Driven Cache Invalidation

**Create `src/infrastructure/cache/cache-invalidation.handler.ts`:**

```typescript
import { EventHandler } from '@infrastructure/events/event-handler';
import { ProductCacheService } from '@application/cache/product-cache.service';
import { UserCacheService } from '@application/cache/user-cache.service';

export class CacheInvalidationHandler implements EventHandler {
  constructor(
    private productCacheService: ProductCacheService,
    private userCacheService: UserCacheService
  ) {}

  async handle(event: any): Promise<void> {
    switch (event.eventName) {
      case 'ProductUpdated':
        await this.productCacheService.invalidateProduct(event.payload.productId);
        break;

      case 'ProductDeleted':
        await this.productCacheService.invalidateProduct(event.payload.productId);
        break;

      case 'UserUpdated':
        await this.userCacheService.invalidateUser(event.payload.userId);
        break;

      case 'UserDeleted':
        await this.userCacheService.invalidateUser(event.payload.userId);
        break;
    }
  }
}
```

### Step 7: Rate Limiting with Redis

**Create `src/infrastructure/cache/rate-limiter.ts`:**

```typescript
import { RedisClient } from './redis-client';

export class RateLimiter {
  constructor(private redisClient: RedisClient) {}

  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Remove old entries
    await this.redisClient['client'].zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    const count = await this.redisClient['client'].zcard(key);

    if (count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Add current request
    await this.redisClient['client'].zadd(key, now, `${now}`);
    await this.redisClient.expire(key, windowSeconds);

    return { allowed: true, remaining: maxRequests - count - 1 };
  }
}
```

### Step 8: Cache Monitoring

**Create `src/infrastructure/cache/cache-metrics.ts`:**

```typescript
import { RedisClient } from './redis-client';

export class CacheMetrics {
  private hits = 0;
  private misses = 0;

  constructor(private redisClient: RedisClient) {}

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  async getRedisInfo(): Promise<any> {
    const info = await this.redisClient['client'].info();
    return this.parseRedisInfo(info);
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const result: Record<string, any> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }

    return result;
  }

  getMetrics() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
    };
  }
}
```

---

## Testing

**Create `tests/integration/cache/redis.test.ts`:**

```typescript
import { RedisClient } from '@infrastructure/cache/redis-client';
import { CacheService } from '@infrastructure/cache/cache.service';

describe('Redis Cache', () => {
  let redisClient: RedisClient;
  let cacheService: CacheService;

  beforeAll(() => {
    redisClient = new RedisClient();
    cacheService = new CacheService(redisClient);
  });

  afterAll(async () => {
    await redisClient.disconnect();
  });

  it('should set and get value', async () => {
    await cacheService.set('test-key', { value: 'test' }, 60);
    const result = await cacheService.get('test-key');
    
    expect(result).toEqual({ value: 'test' });
  });

  it('should expire after TTL', async () => {
    await cacheService.set('expire-key', 'value', 1);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    
    const result = await cacheService.get('expire-key');
    expect(result).toBeNull();
  });

  it('should use cache-aside pattern', async () => {
    let dbCalls = 0;
    
    const fetchFn = async () => {
      dbCalls++;
      return { data: 'from-db' };
    };

    // First call - cache miss
    await cacheService.getOrSet('cache-aside-key', fetchFn, 60);
    expect(dbCalls).toBe(1);

    // Second call - cache hit
    await cacheService.getOrSet('cache-aside-key', fetchFn, 60);
    expect(dbCalls).toBe(1); // Should not increment
  });
});
```

---

## Deliverables

- [ ] Redis cluster deployed on Kubernetes
- [ ] Redis client implementation
- [ ] Cache service with strategies
- [ ] Session management
- [ ] Event-driven cache invalidation
- [ ] Rate limiting
- [ ] Cache monitoring and metrics
- [ ] Tests
- [ ] Documentation

---

## Performance Targets

- **Cache Hit Rate:** > 80%
- **Cache Response Time:** < 5ms (P95)
- **Session Lookup:** < 2ms
- **Memory Usage:** < 80% of allocated

---

## Next Steps

After completing this task:
1. Proceed to **Task 4: Database Optimization & Sharding**
2. Monitor cache hit rates
3. Optimize cache TTLs

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
