# Caching Strategies Guide

## Overview

This guide covers various caching strategies, their use cases, and implementation patterns for the e-commerce backend.

## Cache-Aside (Lazy Loading)

### Pattern

```typescript
async function getProduct(productId: string) {
  // 1. Check cache
  const cached = await cache.get(`product:${productId}`);
  if (cached) return cached;

  // 2. Cache miss - fetch from database
  const product = await db.products.findById(productId);

  // 3. Store in cache
  await cache.set(`product:${productId}`, product, 300);

  return product;
}
```

### Pros
- Only cache what's requested
- Cache failures don't break application
- Simple to implement

### Cons
- First request is slow (cache miss)
- Cache stampede possible
- Stale data risk

### Use Cases
- Product details
- User profiles
- Infrequently accessed data

## Write-Through Caching

### Pattern

```typescript
async function updateProduct(productId: string, updates: any) {
  // 1. Update database
  const product = await db.products.update(productId, updates);

  // 2. Update cache immediately
  await cache.set(`product:${productId}`, product, 300);

  return product;
}
```

### Pros
- Cache always up-to-date
- No stale data
- Read performance consistent

### Cons
- Write latency increased
- Unnecessary cache writes
- Cache churn

### Use Cases
- Frequently read data
- Critical data freshness
- User sessions

## Write-Behind (Write-Back) Caching

### Pattern

```typescript
async function updateProduct(productId: string, updates: any) {
  // 1. Update cache immediately
  await cache.set(`product:${productId}`, updates, 300);

  // 2. Queue database write (async)
  await queue.add('product-update', { productId, updates });

  return updates;
}
```

### Pros
- Fast writes
- Reduced database load
- Better performance

### Cons
- Data loss risk
- Complex implementation
- Eventual consistency

### Use Cases
- High write volume
- Analytics data
- Temporary data

## Read-Through Caching

### Pattern

```typescript
class CachedProductRepository {
  async findById(productId: string) {
    return cache.getOrSet(
      `product:${productId}`,
      () => db.products.findById(productId),
      300
    );
  }
}
```

### Pros
- Transparent caching
- Automatic cache population
- Clean abstraction

### Cons
- Tight coupling
- Cache stampede risk
- Complex error handling

### Use Cases
- Repository pattern
- Service layer caching
- ORM integration

## Cache Invalidation Strategies

### Time-Based (TTL)

```typescript
// Set TTL on cache entry
await cache.set('product:123', product, 300); // 5 minutes

// Pros: Simple, automatic cleanup
// Cons: Stale data possible, cache misses
```

### Event-Driven

```typescript
eventBus.on('ProductUpdated', async (event) => {
  await cache.del(`product:${event.productId}`);
});

// Pros: Always fresh, precise invalidation
// Cons: Complex, requires event infrastructure
```

### Pattern-Based

```typescript
// Invalidate all product caches
await cache.invalidatePattern('product:*');

// Pros: Bulk invalidation, flexible
// Cons: Expensive, can miss keys
```

### Version-Based

```typescript
const version = await cache.incr('product:version');
const key = `product:${productId}:v${version}`;

// Pros: No invalidation needed, simple
// Cons: Memory usage, orphaned keys
```

## Advanced Patterns

### Cache Stampede Prevention

```typescript
const locks = new Map();

async function getProduct(productId: string) {
  const key = `product:${productId}`;
  
  // Check cache
  const cached = await cache.get(key);
  if (cached) return cached;

  // Acquire lock
  if (locks.has(key)) {
    // Wait for existing request
    return locks.get(key);
  }

  // Fetch and cache
  const promise = (async () => {
    const product = await db.products.findById(productId);
    await cache.set(key, product, 300);
    locks.delete(key);
    return product;
  })();

  locks.set(key, promise);
  return promise;
}
```

### Probabilistic Early Expiration

```typescript
async function getWithProbabilisticRefresh(key: string, fetchFn: Function, ttl: number) {
  const cached = await cache.get(key);
  if (!cached) {
    const value = await fetchFn();
    await cache.set(key, value, ttl);
    return value;
  }

  // Get remaining TTL
  const remainingTTL = await cache.getTTL(key);
  
  // Refresh probability increases as TTL decreases
  const refreshProbability = 1 - (remainingTTL / ttl);
  
  if (Math.random() < refreshProbability) {
    // Refresh in background
    fetchFn().then(value => cache.set(key, value, ttl));
  }

  return cached;
}
```

### Multi-Level Caching

```typescript
class MultiLevelCache {
  constructor(
    private l1Cache: Map<string, any>, // In-memory
    private l2Cache: RedisClient        // Redis
  ) {}

  async get(key: string) {
    // Check L1 (memory)
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // Check L2 (Redis)
    const value = await this.l2Cache.get(key);
    if (value) {
      this.l1Cache.set(key, value);
      return value;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number) {
    this.l1Cache.set(key, value);
    await this.l2Cache.set(key, value, ttl);
  }
}
```

## TTL Recommendations

### By Data Type

| Data Type | TTL | Reasoning |
|-----------|-----|-----------|
| Product Details | 5 min | Balance freshness & performance |
| Product Lists | 2 min | Changes frequently |
| User Profile | 10 min | Rarely changes |
| Shopping Cart | 1 hour | Active session data |
| Search Results | 5 min | Dynamic content |
| Static Assets | 1 day | Rarely changes |
| Session Data | 7 days | Long-lived |
| Rate Limits | 1 min | Short window |

### By Access Pattern

| Pattern | TTL | Reasoning |
|---------|-----|-----------|
| Hot Data (>100 req/min) | 10-30 min | Maximize cache hits |
| Warm Data (10-100 req/min) | 5-10 min | Balance resources |
| Cold Data (<10 req/min) | 1-5 min | Minimize memory |

## Cache Key Design

### Naming Conventions

```typescript
// Good
`product:${productId}`
`user:${userId}:profile`
`cart:${userId}:items`
`search:${query}:page:${page}`

// Bad
`prod_${productId}`  // Inconsistent prefix
`${userId}`          // No namespace
`cache_key_123`      // Not descriptive
```

### Hierarchical Keys

```typescript
// Enable pattern-based invalidation
`product:${productId}:details`
`product:${productId}:reviews`
`product:${productId}:related`

// Invalidate all product data
await cache.invalidatePattern(`product:${productId}:*`);
```

## Performance Optimization

### Batch Operations

```typescript
// Bad - Multiple round trips
for (const id of productIds) {
  await cache.get(`product:${id}`);
}

// Good - Single round trip
const keys = productIds.map(id => `product:${id}`);
const values = await cache.mget(keys);
```

### Compression

```typescript
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

async function setCompressed(key: string, value: any, ttl: number) {
  const json = JSON.stringify(value);
  const compressed = await gzipAsync(json);
  await cache.set(key, compressed.toString('base64'), ttl);
}

async function getCompressed(key: string) {
  const compressed = await cache.get(key);
  if (!compressed) return null;
  
  const buffer = Buffer.from(compressed, 'base64');
  const decompressed = await gunzipAsync(buffer);
  return JSON.parse(decompressed.toString());
}
```

## Monitoring

### Key Metrics

1. **Hit Rate** - Target: >80%
2. **Miss Rate** - Target: <20%
3. **Eviction Rate** - Target: <5%
4. **Memory Usage** - Target: <80%
5. **Latency** - Target: <5ms P95

### Alerts

```typescript
// Alert on low hit rate
if (hitRate < 0.8) {
  alert('Cache hit rate below 80%');
}

// Alert on high memory
if (memoryUsage > 0.9) {
  alert('Redis memory usage above 90%');
}
```

## Best Practices

1. **Always set TTL** - Prevent memory leaks
2. **Use consistent naming** - Enable pattern matching
3. **Handle cache failures** - Degrade gracefully
4. **Monitor metrics** - Track performance
5. **Invalidate on writes** - Keep data fresh
6. **Compress large values** - Save memory
7. **Batch operations** - Reduce latency
8. **Use appropriate strategy** - Match use case

## Anti-Patterns

### ❌ No TTL

```typescript
// Bad - Memory leak
await cache.set('product:123', product);

// Good
await cache.set('product:123', product, 300);
```

### ❌ Caching Everything

```typescript
// Bad - Wastes memory
await cache.set('rarely-accessed-data', data, 3600);

// Good - Cache hot data only
if (accessCount > threshold) {
  await cache.set('hot-data', data, 300);
}
```

### ❌ Ignoring Cache Failures

```typescript
// Bad - Breaks application
const product = await cache.get('product:123');
return product; // null if cache fails

// Good - Fallback to database
const product = await cache.get('product:123') 
  || await db.products.findById('123');
```

## Additional Resources

- [Caching Best Practices](https://aws.amazon.com/caching/best-practices/)
- [Redis Patterns](https://redis.io/docs/manual/patterns/)
- [Cache Stampede Solutions](https://en.wikipedia.org/wiki/Cache_stampede)
