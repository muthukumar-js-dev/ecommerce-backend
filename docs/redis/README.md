# Redis Caching Setup Guide

## Overview

This guide covers the Redis caching implementation for the e-commerce backend, including cluster deployment, cache strategies, session management, and performance optimization.

## Prerequisites

- Kubernetes cluster running
- kubectl configured
- Helm (optional, for alternative deployment)
- Node.js with ioredis installed

## Quick Start

### 1. Install Dependencies

```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

### 2. Deploy Redis to Kubernetes

```bash
# Apply Redis configuration
kubectl apply -f k8s/redis/redis-statefulset.yaml

# Verify deployment
kubectl get pods -n ecommerce-prod -l app=redis
kubectl get svc -n ecommerce-prod -l app=redis
```

### 3. Configure Environment Variables

```env
# Standalone mode (local development)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_CLUSTER=false

# Cluster mode (production)
REDIS_CLUSTER=true
REDIS_HOST_0=redis-0.redis-headless
REDIS_HOST_1=redis-1.redis-headless
REDIS_HOST_2=redis-2.redis-headless
REDIS_PASSWORD=your-password
```

### 4. Use in Application

```typescript
import { getRedisClient } from '@infrastructure/cache/redis-client';
import { getCacheService } from '@infrastructure/cache/cache.service';

// Get singleton instances
const redisClient = getRedisClient();
const cacheService = getCacheService(redisClient);

// Use cache
const product = await cacheService.getOrSet(
  'product:123',
  async () => await productRepository.findById('123'),
  300 // 5 minutes TTL
);
```

## Architecture

### Redis Cluster

- **3 StatefulSet replicas** for high availability
- **Persistent storage** (10Gi per pod)
- **Resource limits**: 500m-1000m CPU, 2-4Gi RAM
- **Health checks**: Liveness and readiness probes

### Cache Layers

1. **Application Cache** - Product, User data
2. **Session Store** - User sessions (7-day TTL)
3. **Rate Limiting** - API rate limits
4. **Metrics** - Cache performance tracking

## Caching Strategies

### Cache-Aside Pattern (Lazy Loading)

```typescript
const product = await cacheService.getOrSet(
  `product:${productId}`,
  async () => await productRepository.findById(productId),
  300 // TTL in seconds
);
```

**Pros:**
- Only cache what's needed
- Cache misses don't break application
- Simple to implement

**Cons:**
- First request is slow (cache miss)
- Stale data possible

### Event-Driven Invalidation

```typescript
// Automatically invalidate cache on domain events
eventBus.on('ProductUpdated', async (event) => {
  await productCacheService.invalidateProduct(event.productId);
});
```

**Pros:**
- Always fresh data
- No stale cache issues

**Cons:**
- More complex
- Requires event infrastructure

### Cache Warm-Up

```typescript
// Pre-populate cache with popular items
await productCacheService.warmUpCache(
  popularProductIds,
  (id) => productRepository.findById(id)
);
```

**Use Cases:**
- Application startup
- After cache clear
- Popular items

## Session Management

### Create Session

```typescript
import { getSessionService } from '@infrastructure/cache/session.service';

const sessionService = getSessionService(redisClient);

await sessionService.createSession('session-id', {
  userId: 'user-123',
  email: 'user@example.com',
  role: 'user',
  createdAt: new Date(),
  lastActivity: new Date(),
});
```

### Multi-Device Support

```typescript
// Get all sessions for a user
const sessions = await sessionService.getUserSessions('user-123');

// Logout from all devices
await sessionService.deleteUserSessions('user-123');
```

## Rate Limiting

### IP-Based Rate Limiting

```typescript
import { getRateLimiter } from '@infrastructure/cache/rate-limiter';

const rateLimiter = getRateLimiter(redisClient);

const result = await rateLimiter.checkIPLimit(
  ipAddress,
  100, // max requests
  60   // window in seconds
);

if (!result.allowed) {
  throw new Error('Rate limit exceeded');
}
```

### User-Based Rate Limiting

```typescript
const result = await rateLimiter.checkUserLimit(
  userId,
  1000, // max requests
  60    // window in seconds
);
```

## Monitoring

### Cache Metrics

```typescript
import { getCacheMetrics } from '@infrastructure/cache/cache-metrics';

const metrics = getCacheMetrics(redisClient);

// Get application metrics
const appMetrics = metrics.getMetrics();
console.log(`Hit rate: ${(appMetrics.hitRate * 100).toFixed(2)}%`);

// Get Redis server metrics
const redisInfo = await metrics.getRedisInfo();
console.log(`Memory used: ${redisInfo?.usedMemory}`);

// Get comprehensive metrics
const comprehensive = await metrics.getComprehensiveMetrics();
```

### Metrics Endpoint

```typescript
// Add to your Express app
app.get('/metrics/cache', async (req, res) => {
  const metrics = await getCacheMetrics(redisClient).getComprehensiveMetrics();
  res.json(metrics);
});
```

## Performance Tuning

### TTL Recommendations

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Product Details | 5 min | Frequently updated |
| Product Lists | 2 min | Changes often |
| User Profile | 10 min | Rarely changes |
| Session | 7 days | Long-lived |
| Rate Limit | 1 min | Short window |

### Memory Configuration

```yaml
# In redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru  # Evict least recently used
```

### Connection Pooling

ioredis automatically manages connection pooling. Configure via:

```typescript
const client = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
});
```

## Best Practices

1. **Always set TTL** - Prevent memory leaks
2. **Use prefixes** - Organize keys (`product:`, `user:`)
3. **Handle cache failures gracefully** - Don't break on cache miss
4. **Monitor hit rates** - Target >80%
5. **Invalidate on updates** - Keep data fresh
6. **Use compression** - For large objects
7. **Avoid KEYS command** - Use SCAN in production
8. **Set memory limits** - Prevent OOM

## Troubleshooting

### Connection Issues

```bash
# Check Redis pods
kubectl get pods -n ecommerce-prod -l app=redis

# Check Redis logs
kubectl logs -n ecommerce-prod redis-0

# Test connection
kubectl exec -it redis-0 -n ecommerce-prod -- redis-cli ping
```

### Performance Issues

```bash
# Check slow queries
kubectl exec -it redis-0 -n ecommerce-prod -- redis-cli SLOWLOG GET 10

# Monitor operations
kubectl exec -it redis-0 -n ecommerce-prod -- redis-cli MONITOR
```

### Memory Issues

```bash
# Check memory usage
kubectl exec -it redis-0 -n ecommerce-prod -- redis-cli INFO memory

# Check key count
kubectl exec -it redis-0 -n ecommerce-prod -- redis-cli DBSIZE
```

## Testing

### Run Integration Tests

```bash
# Start Redis locally
docker run -d -p 6379:6379 redis:7-alpine

# Run tests
npm test tests/integration/cache/redis.test.ts
```

### Load Testing

```bash
# Use redis-benchmark
redis-benchmark -h localhost -p 6379 -t set,get -n 100000 -q
```

## Next Steps

1. Deploy Redis to production Kubernetes
2. Configure monitoring dashboards
3. Set up alerts for cache hit rate
4. Implement cache warm-up on deployment
5. Optimize TTLs based on usage patterns

## Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
