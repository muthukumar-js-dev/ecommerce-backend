# MongoDB Sharding Setup Guide

## Overview

This guide covers the complete setup of a MongoDB sharded cluster for the e-commerce backend, including deployment, configuration, monitoring, and optimization.

## Architecture

### Sharded Cluster Components

```
┌─────────────────────────────────────────────┐
│         Mongos Routers (3 instances)        │
│  (Query routing and load balancing)         │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┴──────────┬──────────────┐
    │                     │              │
┌───▼────┐          ┌────▼───┐     ┌────▼───┐
│Config  │          │Shard 1 │     │Shard 2 │
│Servers │          │(3 nodes)     │(3 nodes)
│(3 nodes)          └────────┘     └────────┘
└────────┘               │              │
                    ┌────▼───┐     
                    │Shard 3 │     
                    │(3 nodes)     
                    └────────┘     
```

**Total Pods:** 15
- 3 config servers
- 9 shard servers (3 shards × 3 replicas)
- 3 mongos routers

## Quick Start

### 1. Deploy Cluster

```bash
# Deploy config servers
kubectl apply -f k8s/mongodb/config-servers.yaml

# Deploy shards
kubectl apply -f k8s/mongodb/shard-1.yaml
kubectl apply -f k8s/mongodb/shard-2.yaml
kubectl apply -f k8s/mongodb/shard-3.yaml

# Deploy mongos routers
kubectl apply -f k8s/mongodb/mongos.yaml

# Verify all pods are running
kubectl get pods -n ecommerce-prod -l 'app in (mongo-config,mongo-shard1,mongo-shard2,mongo-shard3,mongos)'
```

### 2. Initialize Cluster

```bash
# Run initialization script
bash scripts/mongodb/init-cluster.sh
```

### 3. Verify Sharding

```bash
# Connect to mongos
kubectl exec -it $(kubectl get pods -n ecommerce-prod -l app=mongos -o jsonpath='{.items[0].metadata.name}') -n ecommerce-prod -- mongosh

# Check sharding status
use admin
sh.status()

# Check shard distribution
use ecommerce
db.users.getShardDistribution()
db.products.getShardDistribution()
db.orders.getShardDistribution()
```

## Connection Configuration

### Connection String

```typescript
// Production (sharded cluster)
const uri = 'mongodb://mongos.ecommerce-prod.svc.cluster.local:27017/ecommerce';

// Local development (standalone)
const uri = 'mongodb://localhost:27017/ecommerce';
```

### Connection Pooling

```typescript
import { connectToMongoDB } from '@infrastructure/database/mongodb-connection';

// Connect with optimized pool settings
await connectToMongoDB();

// Connection pool configuration:
// - maxPoolSize: 100 (production) / 50 (development)
// - minPoolSize: 10 (production) / 5 (development)
// - maxIdleTimeMS: 30000
// - readPreference: secondaryPreferred (production)
```

## Index Management

### Create Indexes

```typescript
import { createIndexes } from '@infrastructure/database/indexes';

// Create all indexes
await createIndexes();
```

### List Indexes

```typescript
import { listIndexes } from '@infrastructure/database/indexes';

const indexes = await listIndexes();
console.log('Users indexes:', indexes.users);
console.log('Products indexes:', indexes.products);
console.log('Orders indexes:', indexes.orders);
```

### Index Strategy

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| users | email | Unique | User lookup |
| users | userId | Unique | Primary key |
| users | createdAt | Descending | Sorting |
| products | productId | Unique | Primary key |
| products | category + price | Compound | Filtering |
| products | title + description | Text | Search |
| orders | orderId | Unique | Primary key |
| orders | userId + createdAt | Compound | User orders |
| orders | status + createdAt | Compound | Order filtering |

## Query Optimization

### Enable Profiling

```typescript
import { enableProfiling } from '@infrastructure/database/profiling';

// Profile queries slower than 100ms
await enableProfiling(100);
```

### Analyze Slow Queries

```typescript
import { analyzeQueryPerformance } from '@infrastructure/database/profiling';

// Get and analyze slow queries
await analyzeQueryPerformance();
```

### Query Explanation

```typescript
import { explainQuery } from '@infrastructure/database/profiling';

// Explain a query
await explainQuery('products', { category: 'electronics' });
```

## Read Preferences

### Secondary Reads (List Operations)

```typescript
import { ProductReadOperations } from '@infrastructure/database/read-preferences';

// Read from secondary for better load distribution
const products = await ProductReadOperations.findProducts(
  { category: 'electronics' },
  { limit: 20, skip: 0 }
);
```

### Primary Reads (Critical Data)

```typescript
import { OrderReadOperations } from '@infrastructure/database/read-preferences';

// Read from primary for latest data
const order = await OrderReadOperations.findOrderById('order-123');
```

## Monitoring

### Database Health Check

```typescript
import { getDatabaseMonitor } from '@infrastructure/database/monitoring';

const monitor = getDatabaseMonitor();

// Health check
const health = await monitor.healthCheck();
console.log('Database healthy:', health.healthy);
```

### Connection Pool Stats

```typescript
const poolStats = await monitor.getConnectionPoolStats();
console.log('Current connections:', poolStats.connections.current);
console.log('Available connections:', poolStats.connections.available);
```

### Sharding Stats

```typescript
const shardingStats = await monitor.getShardingStats();
console.log('Shards:', shardingStats.shards);
console.log('Balancer:', shardingStats.balancer);
```

### Shard Distribution

```typescript
const distribution = await monitor.getShardDistribution('users');
console.log('Shard distribution:', distribution);
```

## Performance Tuning

### Connection Pool Sizing

```typescript
// Formula: connections = (core_count * 2) + effective_spindle_count
// For 4-core server with SSD: (4 * 2) + 1 = 9 connections per instance
// With 10 instances: 90 connections total
// Set maxPoolSize to 100 for headroom
```

### Read Preference Strategy

| Operation | Read Preference | Reason |
|-----------|----------------|--------|
| Product listing | secondaryPreferred | High read volume |
| Product search | secondaryPreferred | Non-critical reads |
| User authentication | primary | Requires latest data |
| Order details | primary | Critical data |
| Order history | secondaryPreferred | Historical data |

### Shard Key Selection

| Collection | Shard Key | Type | Reason |
|------------|-----------|------|--------|
| users | userId | Hashed | Even distribution |
| products | productId | Hashed | Even distribution |
| orders | orderId | Hashed | Even distribution |
| carts | userId | Hashed | User-based access |
| reviews | productId + userId | Compound | Query pattern |

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod mongo-config-0 -n ecommerce-prod

# Check logs
kubectl logs mongo-config-0 -n ecommerce-prod

# Check persistent volumes
kubectl get pvc -n ecommerce-prod
```

### Replica Set Initialization Failed

```bash
# Check replica set status
kubectl exec -it mongo-config-0 -n ecommerce-prod -- mongosh --port 27019 --eval "rs.status()"

# Re-initialize if needed
kubectl exec -it mongo-config-0 -n ecommerce-prod -- mongosh --port 27019 --eval "rs.reconfig(...)"
```

### Shard Not Added

```bash
# Check shard status
kubectl exec -it <mongos-pod> -n ecommerce-prod -- mongosh --eval "sh.status()"

# Add shard manually
kubectl exec -it <mongos-pod> -n ecommerce-prod -- mongosh --eval "sh.addShard('shard1ReplSet/...')"
```

### Unbalanced Shards

```bash
# Check balancer status
use admin
sh.getBalancerState()

# Enable balancer
sh.startBalancer()

# Check chunk distribution
db.printShardingStatus()
```

### Slow Queries

```bash
# Enable profiling
db.setProfilingLevel(1, 100)

# Check slow queries
db.system.profile.find().sort({ts: -1}).limit(10)

# Analyze query plan
db.collection.find({...}).explain("executionStats")
```

## Best Practices

1. **Always use connection pooling** - Reuse connections
2. **Create appropriate indexes** - Match query patterns
3. **Use read preferences** - Distribute load
4. **Monitor shard distribution** - Ensure balance
5. **Profile slow queries** - Optimize performance
6. **Set resource limits** - Prevent resource exhaustion
7. **Use pod anti-affinity** - Distribute across nodes
8. **Regular backups** - Protect data
9. **Monitor metrics** - Track performance
10. **Test failover** - Ensure high availability

## Performance Targets

- **Query Response Time (P95):** < 50ms
- **Write Throughput:** 10K writes/second
- **Read Throughput:** 50K reads/second
- **Connection Pool Utilization:** < 80%
- **Shard Balance:** ±10% across shards

## Next Steps

1. Configure monitoring dashboards (Grafana)
2. Set up alerts for performance metrics
3. Implement backup strategy
4. Test failover scenarios
5. Optimize query patterns based on profiling

## Additional Resources

- [MongoDB Sharding Documentation](https://docs.mongodb.com/manual/sharding/)
- [Connection Pooling](https://docs.mongodb.com/manual/administration/connection-pool-overview/)
- [Query Optimization](https://docs.mongodb.com/manual/core/query-optimization/)
- [Read Preferences](https://docs.mongodb.com/manual/core/read-preference/)
