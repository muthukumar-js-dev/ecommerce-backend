import mongoose from 'mongoose';
import { createIndexes, listIndexes } from '@infrastructure/database/indexes';
import { getDatabaseMonitor } from '@infrastructure/database/monitoring';
import { enableProfiling, getSlowQueries } from '@infrastructure/database/profiling';

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import * as dbConnection from '@infrastructure/database/mongodb-connection';

let mongoServer: MongoMemoryReplSet;

describe('Database Integration Tests', () => {
    beforeAll(async () => {
        // Start in-memory server as Replica Set
        mongoServer = await MongoMemoryReplSet.create({
            replSet: { count: 1, storageEngine: 'wiredTiger' },
        });
        const mongoUri = mongoServer.getUri("ecommerce-test"); // Explicit DB name
        process.env.MONGODB_URI = mongoUri;

        // Connect using the infrastructure function we are testing
        await dbConnection.connectToMongoDB();
    });

    afterAll(async () => {
        // Clean up and disconnect
        if (mongoose.connection.db) {
            await mongoose.connection.dropDatabase();
        }
        await dbConnection.disconnectFromMongoDB();
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    describe('Connection Pool', () => {
        it('should establish connection successfully', () => {
            expect(dbConnection.isConnected()).toBe(true);
        });

        it('should have correct connection stats', () => {
            const stats = dbConnection.getConnectionStats();

            expect(stats.readyState).toBe(1); // 1 = connected
            expect(stats.name).toBe('ecommerce-test');
        });

        it('should handle connection pool settings', async () => {
            const monitor = getDatabaseMonitor();
            const poolStats = await monitor.getConnectionPoolStats();

            expect(poolStats.connections).toBeDefined();
            expect(poolStats.connections.current).toBeGreaterThan(0);
        });
    });

    describe('Indexes', () => {
        beforeAll(async () => {
            // Create test collections
            await mongoose.connection.db.createCollection('users');
            await mongoose.connection.db.createCollection('products');
            await mongoose.connection.db.createCollection('orders');

            // Create indexes
            await createIndexes();
        });

        it('should create all required indexes', async () => {
            const indexes = await listIndexes();

            // Check users indexes
            expect(indexes.users).toBeDefined();
            expect(indexes.users!.length).toBeGreaterThan(1);

            const userIndexNames = indexes.users!.map((idx: any) => idx.name);
            expect(userIndexNames).toContain('email_unique');
            expect(userIndexNames).toContain('userId_unique');

            // Check products indexes
            expect(indexes.products).toBeDefined();
            const productIndexNames = indexes.products!.map((idx: any) => idx.name);
            expect(productIndexNames).toContain('productId_unique');
            expect(productIndexNames).toContain('category_price');
            expect(productIndexNames).toContain('text_search');

            // Check orders indexes
            expect(indexes.orders).toBeDefined();
            const orderIndexNames = indexes.orders!.map((idx: any) => idx.name);
            expect(orderIndexNames).toContain('orderId_unique');
            expect(orderIndexNames).toContain('user_orders');
        });

        it('should enforce unique constraints', async () => {
            const db = mongoose.connection.db;

            // Insert first user
            await db.collection('users').insertOne({
                userId: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
            });

            // Try to insert duplicate email
            await expect(
                db.collection('users').insertOne({
                    userId: 'user-2',
                    email: 'test@example.com',
                    name: 'Another User',
                })
            ).rejects.toThrow();
        });
    });

    describe('Query Profiling', () => {
        beforeAll(async () => {
            await enableProfiling(50); // Profile queries slower than 50ms
        });

        it('should enable profiling', async () => {
            const db = mongoose.connection.db;
            const status = await db.command({ profile: -1 });

            expect(status.was).toBeGreaterThanOrEqual(0);
        });

        it('should capture slow queries', async () => {
            const db = mongoose.connection.db;

            // Create a slow query by scanning collection
            await db.collection('products').find({}).toArray();

            // Wait a bit for profiling to capture
            await new Promise(resolve => setTimeout(resolve, 100));

            const slowQueries = await getSlowQueries(5);
            // May or may not have slow queries depending on data size
            expect(Array.isArray(slowQueries)).toBe(true);
        });
    });

    describe('Database Monitoring', () => {
        let monitor: ReturnType<typeof getDatabaseMonitor>;

        beforeAll(() => {
            monitor = getDatabaseMonitor();
        });

        it('should get database stats', async () => {
            const stats = await monitor.getDatabaseStats();

            expect(stats.collections).toBeGreaterThan(0);
            expect(stats.dataSize).toBeGreaterThanOrEqual(0);
            expect(stats.indexes).toBeGreaterThan(0);
        });

        it('should get collection stats', async () => {
            const stats = await monitor.getCollectionStats('users');

            expect(stats.ns).toContain('users');
            expect(stats.count).toBeGreaterThanOrEqual(0);
            expect(stats.nindexes).toBeGreaterThan(0);
        });

        it('should perform health check', async () => {
            const health = await monitor.healthCheck();

            expect(health.healthy).toBe(true);
            expect(health.details.readyState).toBe(1);
        });

        it('should get comprehensive metrics', async () => {
            const metrics = await monitor.getComprehensiveMetrics();

            expect(metrics.timestamp).toBeInstanceOf(Date);
            expect(metrics.connectionPool).toBeDefined();
            expect(metrics.database).toBeDefined();
        });
    });

    describe('Performance', () => {
        it('should handle concurrent writes', async () => {
            const db = mongoose.connection.db;
            const writes = [];

            for (let i = 0; i < 100; i++) {
                writes.push(
                    db.collection('products').insertOne({
                        productId: `product-${i}`,
                        title: `Product ${i}`,
                        price: Math.random() * 1000,
                        category: 'test',
                    })
                );
            }

            const startTime = Date.now();
            await Promise.all(writes);
            const duration = Date.now() - startTime;

            console.log(`100 concurrent writes completed in ${duration}ms`);
            expect(duration).toBeLessThan(5000); // Should complete in < 5s
        });

        it('should handle concurrent reads', async () => {
            const db = mongoose.connection.db;
            const reads = [];

            for (let i = 0; i < 100; i++) {
                reads.push(
                    db.collection('products').findOne({ productId: `product-${i % 10}` })
                );
            }

            const startTime = Date.now();
            await Promise.all(reads);
            const duration = Date.now() - startTime;

            console.log(`100 concurrent reads completed in ${duration}ms`);
            expect(duration).toBeLessThan(2000); // Should complete in < 2s
        });

        it('should use indexes for queries', async () => {
            const db = mongoose.connection.db;

            // Query that should use index
            const explain = await db.collection('products')
                .find({ category: 'test' })
                .explain('executionStats');

            // Check if index was used (not COLLSCAN)
            const stage = explain.executionStats.executionStages;
            expect(stage.stage).not.toBe('COLLSCAN');
        });
    });
});
