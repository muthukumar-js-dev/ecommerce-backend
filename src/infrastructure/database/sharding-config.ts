import mongoose, { Connection } from 'mongoose';
import { createLogger } from '../logging/logger';
import winston from 'winston';

export interface ShardConfig {
    shardKey: string;
    numShards: number;
    shards: ShardDefinition[];
    strategy: 'hash' | 'range' | 'geo';
}

export interface ShardDefinition {
    id: string;
    name: string;
    uri: string;
    minKey?: number;
    maxKey?: number;
    region?: string;
}

export class ShardingConfig {
    private static instance: ShardingConfig;
    private logger: winston.Logger;
    private config: ShardConfig;
    private connections: Map<string, Connection>;

    private constructor() {
        this.logger = createLogger('ShardingConfig');
        this.connections = new Map();
        this.config = this.loadConfig();
    }

    static getInstance(): ShardingConfig {
        if (!ShardingConfig.instance) {
            ShardingConfig.instance = new ShardingConfig();
        }
        return ShardingConfig.instance;
    }

    private loadConfig(): ShardConfig {
        // Default configuration - can be overridden by environment variables
        return {
            shardKey: process.env.SHARD_KEY ?? 'userId',
            numShards: parseInt(process.env.NUM_SHARDS ?? '3', 10),
            strategy: (process.env.SHARD_STRATEGY as 'hash' | 'range' | 'geo') ?? 'hash',
            shards: [
                {
                    id: 'shard0',
                    name: 'Shard 0',
                    uri: process.env.SHARD_0_URI ?? process.env.MONGODB_URI ?? '',
                    minKey: 0,
                    maxKey: 33,
                },
                {
                    id: 'shard1',
                    name: 'Shard 1',
                    uri: process.env.SHARD_1_URI ?? process.env.MONGODB_URI ?? '',
                    minKey: 33,
                    maxKey: 66,
                },
                {
                    id: 'shard2',
                    name: 'Shard 2',
                    uri: process.env.SHARD_2_URI ?? process.env.MONGODB_URI ?? '',
                    minKey: 66,
                    maxKey: 100,
                },
            ],
        };
    }

    async initializeShards(): Promise<void> {
        this.logger.info('Initializing database shards...');

        for (const shard of this.config.shards) {
            try {
                const connection = await mongoose.createConnection(shard.uri).asPromise();
                this.connections.set(shard.id, connection);
                this.logger.info(`Connected to shard: ${shard.name}`);
            } catch (error: unknown) {
                this.logger.error(`Failed to connect to shard: ${shard.name}`, error);
                throw error;
            }
        }

        this.logger.info(`All ${this.config.numShards} shards initialized successfully`);
    }

    getShardForKey(key: string | number): ShardDefinition {
        const shardIndex = this.calculateShardIndex(key);
        return this.config.shards[shardIndex]!;
    }

    getConnection(shardId: string): Connection {
        const connection = this.connections.get(shardId);
        if (!connection) {
            throw new Error(`Connection not found for shard: ${shardId}`);
        }
        return connection;
    }

    getConnectionForKey(key: string | number): Connection {
        const shard = this.getShardForKey(key);
        return this.getConnection(shard.id);
    }

    private calculateShardIndex(key: string | number): number {
        if (this.config.strategy === 'hash') {
            return this.hashSharding(key);
        } else if (this.config.strategy === 'range') {
            return this.rangeSharding(key);
        }
        throw new Error(`Unsupported sharding strategy: ${this.config.strategy}`);
    }

    private hashSharding(key: string | number): number {
        // Simple hash function for demonstration
        // In production, use a more robust hash function
        const keyString = String(key);
        let hash = 0;
        for (let i = 0; i < keyString.length; i++) {
            const char = keyString.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) % this.config.numShards;
    }

    private rangeSharding(key: string | number): number {
        const numericKey = typeof key === 'number' ? key : parseInt(key, 10);
        if (isNaN(numericKey)) {
            throw new Error(`Invalid key for range sharding: ${key}`);
        }

        const percentage = (numericKey % 100);
        for (let i = 0; i < this.config.shards.length; i++) {
            const shard = this.config.shards[i]!;
            if (
                shard.minKey !== undefined &&
                shard.maxKey !== undefined &&
                percentage >= shard.minKey &&
                percentage < shard.maxKey
            ) {
                return i;
            }
        }

        // Default to first shard if no match
        return 0;
    }

    async closeAllConnections(): Promise<void> {
        this.logger.info('Closing all shard connections...');
        for (const [shardId, connection] of this.connections.entries()) {
            await connection.close();
            this.logger.info(`Closed connection to shard: ${shardId}`);
        }
        this.connections.clear();
    }

    getConfig(): ShardConfig {
        return { ...this.config };
    }

    getAllShards(): ShardDefinition[] {
        return [...this.config.shards];
    }
}

// Export singleton instance
export const shardingConfig = ShardingConfig.getInstance();
