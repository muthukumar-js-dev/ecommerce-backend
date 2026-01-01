# Phase 4 - Task 4: Database Optimization & Sharding

**Duration:** 6-7 days  
**Priority:** Critical  
**Dependencies:** Tasks 1-3 (Kubernetes + Containers + Redis)

---

## Objective

Implement MongoDB sharding with read replicas and connection pooling to support horizontal database scalability for 10 million concurrent users.

---

## Context

Database optimization provides:
- **Horizontal Scaling:** Distribute data across multiple shards
- **Read Scalability:** Read replicas for query distribution
- **High Availability:** Automatic failover with replica sets
- **Performance:** Optimized queries and indexes
- **Connection Efficiency:** Connection pooling

---

## Implementation Steps

### Step 1: MongoDB Sharded Cluster Architecture

**Architecture Overview:**

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
                    ┌────▼───┐     ┌────▼───┐
                    │Shard 3 │     │Read    │
                    │(3 nodes)     │Replicas│
                    └────────┘     └────────┘
```

### Step 2: Deploy Config Servers

**Create `k8s/mongodb/config-servers.yaml`:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongo-config-headless
  namespace: ecommerce-prod
spec:
  clusterIP: None
  ports:
    - port: 27019
      name: mongodb
  selector:
    app: mongo-config
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo-config
  namespace: ecommerce-prod
spec:
  serviceName: mongo-config-headless
  replicas: 3
  selector:
    matchLabels:
      app: mongo-config
  template:
    metadata:
      labels:
        app: mongo-config
    spec:
      containers:
        - name: mongo
          image: mongo:6
          command:
            - mongod
            - --configsvr
            - --replSet
            - configReplSet
            - --bind_ip_all
            - --port
            - "27019"
          ports:
            - containerPort: 27019
              name: mongodb
          volumeMounts:
            - name: data
              mountPath: /data/db
            - name: config
              mountPath: /etc/mongo
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 1000m
              memory: 4Gi
          livenessProbe:
            exec:
              command:
                - mongo
                - --port
                - "27019"
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - mongo
                - --port
                - "27019"
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: config
          configMap:
            name: mongo-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

**Initialize config server replica set:**

```bash
kubectl exec -it mongo-config-0 -n ecommerce-prod -- mongo --port 27019

# In mongo shell:
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "mongo-config-0.mongo-config-headless:27019" },
    { _id: 1, host: "mongo-config-1.mongo-config-headless:27019" },
    { _id: 2, host: "mongo-config-2.mongo-config-headless:27019" }
  ]
});
```

### Step 3: Deploy Shard Servers

**Create `k8s/mongodb/shard-1.yaml`:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongo-shard1-headless
  namespace: ecommerce-prod
spec:
  clusterIP: None
  ports:
    - port: 27018
      name: mongodb
  selector:
    app: mongo-shard1
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo-shard1
  namespace: ecommerce-prod
spec:
  serviceName: mongo-shard1-headless
  replicas: 3
  selector:
    matchLabels:
      app: mongo-shard1
  template:
    metadata:
      labels:
        app: mongo-shard1
    spec:
      containers:
        - name: mongo
          image: mongo:6
          command:
            - mongod
            - --shardsvr
            - --replSet
            - shard1ReplSet
            - --bind_ip_all
            - --port
            - "27018"
          ports:
            - containerPort: 27018
              name: mongodb
          volumeMounts:
            - name: data
              mountPath: /data/db
          resources:
            requests:
              cpu: 1000m
              memory: 4Gi
            limits:
              cpu: 2000m
              memory: 8Gi
          livenessProbe:
            exec:
              command:
                - mongo
                - --port
                - "27018"
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 200Gi
```

**Initialize shard replica sets:**

```bash
# Shard 1
kubectl exec -it mongo-shard1-0 -n ecommerce-prod -- mongo --port 27018

rs.initiate({
  _id: "shard1ReplSet",
  members: [
    { _id: 0, host: "mongo-shard1-0.mongo-shard1-headless:27018" },
    { _id: 1, host: "mongo-shard1-1.mongo-shard1-headless:27018" },
    { _id: 2, host: "mongo-shard1-2.mongo-shard1-headless:27018" }
  ]
});

# Repeat for shard2 and shard3
```

### Step 4: Deploy Mongos Routers

**Create `k8s/mongodb/mongos.yaml`:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongos
  namespace: ecommerce-prod
spec:
  type: ClusterIP
  ports:
    - port: 27017
      targetPort: 27017
  selector:
    app: mongos
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongos
  namespace: ecommerce-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mongos
  template:
    metadata:
      labels:
        app: mongos
    spec:
      containers:
        - name: mongos
          image: mongo:6
          command:
            - mongos
            - --configdb
            - configReplSet/mongo-config-0.mongo-config-headless:27019,mongo-config-1.mongo-config-headless:27019,mongo-config-2.mongo-config-headless:27019
            - --bind_ip_all
          ports:
            - containerPort: 27017
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
          livenessProbe:
            exec:
              command:
                - mongo
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 10
```

### Step 5: Configure Sharding

**Add shards and enable sharding:**

```javascript
// Connect to mongos
mongo mongodb://mongos.ecommerce-prod.svc.cluster.local:27017

use admin

// Add shards
sh.addShard("shard1ReplSet/mongo-shard1-0.mongo-shard1-headless:27018,mongo-shard1-1.mongo-shard1-headless:27018,mongo-shard1-2.mongo-shard1-headless:27018");
sh.addShard("shard2ReplSet/mongo-shard2-0.mongo-shard2-headless:27018,mongo-shard2-1.mongo-shard2-headless:27018,mongo-shard2-2.mongo-shard2-headless:27018");
sh.addShard("shard3ReplSet/mongo-shard3-0.mongo-shard3-headless:27018,mongo-shard3-1.mongo-shard3-headless:27018,mongo-shard3-2.mongo-shard3-headless:27018");

// Verify shards
sh.status()

// Enable sharding on database
sh.enableSharding("ecommerce")

// Shard collections with appropriate shard keys
sh.shardCollection("ecommerce.users", { userId: "hashed" })
sh.shardCollection("ecommerce.orders", { orderId: "hashed" })
sh.shardCollection("ecommerce.products", { productId: "hashed" })
sh.shardCollection("ecommerce.cart", { userId: "hashed" })

// Verify sharding
db.users.getShardDistribution()
db.orders.getShardDistribution()
```

### Step 6: Connection Pooling Configuration

**Update `src/infrastructure/database/mongodb-connection.ts`:**

```typescript
import mongoose from 'mongoose';

export interface MongoDBConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

export function getMongoDBConfig(): MongoDBConfig {
  return {
    uri: process.env.MONGODB_URI || 'mongodb://mongos:27017/ecommerce',
    options: {
      // Connection pool settings
      maxPoolSize: 100,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
      
      // Timeout settings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Read preference for load distribution
      readPreference: 'secondaryPreferred',
      
      // Write concern for durability
      w: 'majority',
      wtimeoutMS: 5000,
      
      // Compression
      compressors: ['snappy', 'zlib'],
      
      // Application name for monitoring
      appName: 'ecommerce-backend',
    },
  };
}

export async function connectToMongoDB(): Promise<void> {
  const config = getMongoDBConfig();

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });

  await mongoose.connect(config.uri, config.options);
  
  console.log('MongoDB connection pool initialized:', {
    maxPoolSize: config.options.maxPoolSize,
    minPoolSize: config.options.minPoolSize,
  });
}

export async function disconnectFromMongoDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected gracefully');
}
```

### Step 7: Query Optimization

**Create indexes for common queries:**

```typescript
// src/infrastructure/database/indexes.ts

import { UserModel } from '@domain/user/models/user.model';
import { ProductModel } from '@domain/product/models/product.model';
import { OrderModel } from '@domain/order/models/order.model';

export async function createIndexes(): Promise<void> {
  console.log('Creating database indexes...');

  // User indexes
  await UserModel.collection.createIndex(
    { email: 1 },
    { unique: true, name: 'email_unique' }
  );
  await UserModel.collection.createIndex(
    { createdAt: -1 },
    { name: 'created_at_desc' }
  );
  await UserModel.collection.createIndex(
    { 'address.city': 1, 'address.state': 1 },
    { name: 'address_location' }
  );

  // Product indexes
  await ProductModel.collection.createIndex(
    { category: 1, price: 1 },
    { name: 'category_price' }
  );
  await ProductModel.collection.createIndex(
    { title: 'text', description: 'text' },
    { name: 'text_search' }
  );
  await ProductModel.collection.createIndex(
    { sellerId: 1, createdAt: -1 },
    { name: 'seller_products' }
  );
  await ProductModel.collection.createIndex(
    { inventory: 1 },
    { name: 'inventory_check' }
  );

  // Order indexes
  await OrderModel.collection.createIndex(
    { userId: 1, createdAt: -1 },
    { name: 'user_orders' }
  );
  await OrderModel.collection.createIndex(
    { status: 1, createdAt: -1 },
    { name: 'order_status' }
  );
  await OrderModel.collection.createIndex(
    { orderNumber: 1 },
    { unique: true, name: 'order_number_unique' }
  );
  await OrderModel.collection.createIndex(
    { 'items.productId': 1 },
    { name: 'order_items_product' }
  );

  console.log('Database indexes created successfully');
}
```

### Step 8: Query Performance Monitoring

**Enable profiling:**

```typescript
// src/infrastructure/database/profiling.ts

export async function enableProfiling(): Promise<void> {
  const db = mongoose.connection.db;
  
  // Set profiling level (0=off, 1=slow queries, 2=all queries)
  await db.command({
    profile: 1,
    slowms: 100, // Log queries slower than 100ms
  });

  console.log('Database profiling enabled (slowms: 100)');
}

export async function getSlowQueries(limit: number = 10): Promise<any[]> {
  const db = mongoose.connection.db;
  
  const slowQueries = await db
    .collection('system.profile')
    .find({ millis: { $gt: 100 } })
    .sort({ ts: -1 })
    .limit(limit)
    .toArray();

  return slowQueries;
}

export async function analyzeQueryPerformance(): Promise<void> {
  const slowQueries = await getSlowQueries();
  
  console.log('Slow queries detected:');
  slowQueries.forEach((query, index) => {
    console.log(`${index + 1}. ${query.op} on ${query.ns}`);
    console.log(`   Duration: ${query.millis}ms`);
    console.log(`   Query: ${JSON.stringify(query.command)}`);
  });
}
```

### Step 9: Read Replicas Configuration

**Configure read preference:**

```typescript
// For read-heavy operations, use secondary reads
export async function findProductsWithSecondaryRead(
  filter: any
): Promise<any[]> {
  return ProductModel.find(filter)
    .read('secondaryPreferred')
    .lean()
    .exec();
}

// For critical reads, use primary
export async function findOrderWithPrimaryRead(orderId: string): Promise<any> {
  return OrderModel.findOne({ orderId })
    .read('primary')
    .exec();
}
```

### Step 10: Database Monitoring

**Create monitoring script:**

```typescript
// src/infrastructure/database/monitoring.ts

export class DatabaseMonitor {
  async getConnectionPoolStats(): Promise<any> {
    const stats = mongoose.connection.db.admin().serverStatus();
    return {
      connections: stats.connections,
      network: stats.network,
      opcounters: stats.opcounters,
    };
  }

  async getShardingStats(): Promise<any> {
    const admin = mongoose.connection.db.admin();
    const shardStatus = await admin.command({ listShards: 1 });
    
    return {
      shards: shardStatus.shards,
      balancerState: await admin.command({ balancerStatus: 1 }),
    };
  }

  async getDatabaseStats(): Promise<any> {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    return {
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      storageSize: stats.storageSize,
    };
  }
}
```

---

## Testing

**Test sharding distribution:**

```bash
# Connect to mongos
mongo mongodb://mongos:27017

use ecommerce

# Check shard distribution
db.users.getShardDistribution()
db.orders.getShardDistribution()
db.products.getShardDistribution()

# Verify balancing
sh.status()
```

**Load test database:**

```typescript
// tests/load/database-load.test.ts

describe('Database Load Test', () => {
  it('should handle 10K concurrent writes', async () => {
    const writes = Array.from({ length: 10000 }, (_, i) =>
      UserModel.create({
        name: `User ${i}`,
        email: `user${i}@test.com`,
        password: 'hashed',
      })
    );

    const start = Date.now();
    await Promise.all(writes);
    const duration = Date.now() - start;

    console.log(`10K writes completed in ${duration}ms`);
    expect(duration).toBeLessThan(30000); // Should complete in < 30s
  });
});
```

---

## Deliverables

- [ ] MongoDB sharded cluster deployed
- [ ] 3 config servers configured
- [ ] 3 shards with replica sets
- [ ] Mongos routers deployed
- [ ] Sharding enabled and configured
- [ ] Connection pooling optimized
- [ ] Indexes created
- [ ] Query profiling enabled
- [ ] Read replicas configured
- [ ] Monitoring setup
- [ ] Tests passing
- [ ] Documentation

---

## Performance Targets

- **Query Response Time (P95):** < 50ms
- **Write Throughput:** 10K writes/second
- **Read Throughput:** 50K reads/second
- **Connection Pool Utilization:** < 80%
- **Shard Balance:** ±10% across shards

---

## Next Steps

After completing this task:
1. Proceed to **Task 5: Horizontal Pod Autoscaling**
2. Monitor shard distribution
3. Optimize slow queries

---

**Task Owner:** Database Team + DevOps  
**Reviewer:** Tech Lead  
**Estimated Effort:** 6-7 days  
**Status:** Not Started
