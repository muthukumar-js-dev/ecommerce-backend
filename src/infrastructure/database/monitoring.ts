import mongoose from 'mongoose';

export interface ConnectionPoolStats {
    current: number;
    available: number;
    totalCreated: number;
}

export interface ShardInfo {
    _id: string;
    host: string;
    state: number;
}

export interface DatabaseStats {
    collections: number;
    views: number;
    objects: number;
    avgObjSize: number;
    dataSize: number;
    storageSize: number;
    indexes: number;
    indexSize: number;
}

export class DatabaseMonitor {
    /**
     * Get connection pool statistics
     */
    async getConnectionPoolStats(): Promise<any> {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        try {
            const serverStatus = await db.admin().serverStatus();

            return {
                connections: {
                    current: serverStatus.connections.current,
                    available: serverStatus.connections.available,
                    totalCreated: serverStatus.connections.totalCreated,
                },
                network: {
                    bytesIn: serverStatus.network.bytesIn,
                    bytesOut: serverStatus.network.bytesOut,
                    numRequests: serverStatus.network.numRequests,
                },
                opcounters: serverStatus.opcounters,
            };
        } catch (error: unknown) {
            console.error('Failed to get connection pool stats:', error);
            throw error;
        }
    }

    /**
     * Get sharding statistics
     */
    async getShardingStats(): Promise<any> {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        try {
            const admin = db.admin();

            // List shards
            const shardStatus = await admin.command({ listShards: 1 });

            // Get balancer status
            const balancerStatus = await admin.command({ balancerStatus: 1 });

            // Get sharding statistics
            const shardingStats = await admin.command({ shardingStatistics: 1 });

            return {
                shards: shardStatus.shards,
                balancer: {
                    mode: balancerStatus.mode,
                    inBalancerRound: balancerStatus.inBalancerRound,
                    numBalancerRounds: balancerStatus.numBalancerRounds,
                },
                statistics: shardingStats,
            };
        } catch (error: unknown) {
            console.error('Failed to get sharding stats:', error);
            // Return empty stats if not in sharded environment
            return {
                shards: [],
                balancer: null,
                statistics: null,
            };
        }
    }

    /**
     * Get database statistics
     */
    async getDatabaseStats(): Promise<DatabaseStats> {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        try {
            const stats = await db.stats();

            return {
                collections: stats.collections,
                views: stats.views ?? 0,
                objects: stats.objects,
                avgObjSize: stats.avgObjSize,
                dataSize: stats.dataSize,
                storageSize: stats.storageSize,
                indexes: stats.indexes,
                indexSize: stats.indexSize,
            };
        } catch (error: unknown) {
            console.error('Failed to get database stats:', error);
            throw error;
        }
    }

    /**
     * Get collection statistics
     */
    async getCollectionStats(collectionName: string): Promise<any> {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        try {
            // Use runCommand instead of deprecated stats()
            const stats = await db.command({ collStats: collectionName });

            return {
                ns: stats.ns ?? `${db.databaseName}.${collectionName}`,
                count: stats.count ?? 0,
                size: stats.size ?? 0,
                avgObjSize: stats.avgObjSize ?? 0,
                storageSize: stats.storageSize ?? 0,
                nindexes: stats.nindexes ?? 0,
                totalIndexSize: stats.totalIndexSize ?? 0,
                sharded: stats.sharded ?? false,
            };
        } catch (error: unknown) {
            console.error(`Failed to get stats for collection ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Get shard distribution for a collection
     */
    async getShardDistribution(collectionName: string): Promise<any> {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        try {
            const collection = db.collection(collectionName);
            const stats: any = await (collection as any).stats();

            if (!stats.sharded) {
                return {
                    sharded: false,
                    message: 'Collection is not sharded',
                };
            }

            return {
                sharded: true,
                shards: stats.shards,
                count: stats.count,
                size: stats.size,
            };
        } catch (error: unknown) {
            console.error(`Failed to get shard distribution for ${collectionName}:`, error);
            return {
                sharded: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Get comprehensive metrics
     */
    async getComprehensiveMetrics(): Promise<any> {
        const [poolStats, shardingStats, dbStats] = await Promise.all([
            this.getConnectionPoolStats().catch(() => null),
            this.getShardingStats().catch(() => null),
            this.getDatabaseStats().catch(() => null),
        ]);

        return {
            timestamp: new Date(),
            connectionPool: poolStats,
            sharding: shardingStats,
            database: dbStats,
        };
    }

    /**
     * Monitor database health
     */
    async healthCheck(): Promise<{
        healthy: boolean;
        details: any;
    }> {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                return {
                    healthy: false,
                    details: { error: 'Database connection not established' },
                };
            }

            // Ping database
            await db.admin().ping();

            // Get basic stats
            const stats = await this.getConnectionPoolStats();

            return {
                healthy: true,
                details: {
                    readyState: mongoose.connection.readyState,
                    connections: stats.connections,
                },
            };
        } catch (error: unknown) {
            return {
                healthy: false,
                details: { error: (error as Error).message },
            };
        }
    }
}

// Singleton instance
let databaseMonitorInstance: DatabaseMonitor | null = null;

export function getDatabaseMonitor(): DatabaseMonitor {
    if (!databaseMonitorInstance) {
        databaseMonitorInstance = new DatabaseMonitor();
    }
    return databaseMonitorInstance;
}
