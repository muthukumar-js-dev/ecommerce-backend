import { Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { shardingConfig } from './sharding-config';
import { createLogger } from '../logging/logger';
import winston from 'winston';

export class ShardRouter<T extends Document> {
    private logger: winston.Logger;
    private modelName: string;

    constructor(modelName: string) {
        this.modelName = modelName;
        this.logger = createLogger(`ShardRouter:${modelName}`);
    }

    /**
     * Find documents across all shards or specific shard
     */
    async find(
        filter: FilterQuery<T>,
        shardKey?: string | number
    ): Promise<T[]> {
        if (shardKey) {
            // Query specific shard
            return this.findInShard(filter, shardKey);
        }

        // Query all shards and merge results
        return this.findAcrossShards(filter);
    }

    /**
     * Find one document
     */
    async findOne(
        filter: FilterQuery<T>,
        shardKey?: string | number
    ): Promise<T | null> {
        if (shardKey) {
            const connection = shardingConfig.getConnectionForKey(shardKey);
            const Model = connection.model<T>(this.modelName);
            return Model.findOne(filter).exec();
        }

        // Search across all shards
        const results = await this.findAcrossShards(filter);
        return results.length > 0 ? results[0] ?? null : null;
    }

    /**
     * Find by ID (requires shard key)
     */
    async findById(id: string, shardKey: string | number): Promise<T | null> {
        const connection = shardingConfig.getConnectionForKey(shardKey);
        const Model = connection.model<T>(this.modelName);
        return Model.findById(id).exec();
    }

    /**
     * Create document in appropriate shard
     */
    async create(doc: Partial<T>, shardKey: string | number): Promise<T> {
        const connection = shardingConfig.getConnectionForKey(shardKey);
        const Model = connection.model<T>(this.modelName);

        this.logger.info(`Creating document in shard for key: ${shardKey}`);

        return Model.create(doc);
    }

    /**
     * Update document in specific shard
     */
    async updateOne(
        filter: FilterQuery<T>,
        update: UpdateQuery<T>,
        shardKey: string | number,
        options?: QueryOptions
    ): Promise<{ matchedCount: number; modifiedCount: number }> {
        const connection = shardingConfig.getConnectionForKey(shardKey);
        const Model = connection.model<T>(this.modelName);

        const result = await Model.updateOne(filter, update, options).exec();

        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        };
    }

    /**
     * Update many documents across shards
     */
    async updateMany(
        filter: FilterQuery<T>,
        update: UpdateQuery<T>,
        shardKey?: string | number
    ): Promise<{ matchedCount: number; modifiedCount: number }> {
        if (shardKey) {
            return this.updateOne(filter, update, shardKey);
        }

        // Update across all shards
        const shards = shardingConfig.getAllShards();
        let totalMatched = 0;
        let totalModified = 0;

        for (const shard of shards) {
            const connection = shardingConfig.getConnection(shard.id);
            const Model = connection.model<T>(this.modelName);

            const result = await Model.updateMany(filter, update).exec();
            totalMatched += result.matchedCount;
            totalModified += result.modifiedCount;
        }

        return {
            matchedCount: totalMatched,
            modifiedCount: totalModified,
        };
    }

    /**
     * Delete document from specific shard
     */
    async deleteOne(
        filter: FilterQuery<T>,
        shardKey: string | number
    ): Promise<{ deletedCount: number }> {
        const connection = shardingConfig.getConnectionForKey(shardKey);
        const Model = connection.model<T>(this.modelName);

        const result = await Model.deleteOne(filter).exec();

        return { deletedCount: result.deletedCount };
    }

    /**
     * Count documents across shards
     */
    async count(filter: FilterQuery<T>, shardKey?: string | number): Promise<number> {
        if (shardKey) {
            const connection = shardingConfig.getConnectionForKey(shardKey);
            const Model = connection.model<T>(this.modelName);
            return Model.countDocuments(filter).exec();
        }

        // Count across all shards
        const shards = shardingConfig.getAllShards();
        let totalCount = 0;

        for (const shard of shards) {
            const connection = shardingConfig.getConnection(shard.id);
            const Model = connection.model<T>(this.modelName);
            const count = await Model.countDocuments(filter).exec();
            totalCount += count;
        }

        return totalCount;
    }

    /**
     * Aggregate across shards
     */
    async aggregate(pipeline: any[], shardKey?: string | number): Promise<any[]> {
        if (shardKey) {
            const connection = shardingConfig.getConnectionForKey(shardKey);
            const Model = connection.model<T>(this.modelName);
            return Model.aggregate(pipeline as any).exec();
        }

        // Aggregate across all shards and merge results
        const shards = shardingConfig.getAllShards();
        const results: any[] = [];

        for (const shard of shards) {
            const connection = shardingConfig.getConnection(shard.id);
            const Model = connection.model<T>(this.modelName);
            const shardResults = await Model.aggregate(pipeline as any).exec();
            results.push(...shardResults);
        }

        return results;
    }

    /**
     * Find documents in specific shard
     */
    private async findInShard(
        filter: FilterQuery<T>,
        shardKey: string | number
    ): Promise<T[]> {
        const connection = shardingConfig.getConnectionForKey(shardKey);
        const Model = connection.model<T>(this.modelName);
        return Model.find(filter).exec();
    }

    /**
     * Find documents across all shards
     */
    private async findAcrossShards(filter: FilterQuery<T>): Promise<T[]> {
        const shards = shardingConfig.getAllShards();
        const results: T[] = [];

        for (const shard of shards) {
            try {
                const connection = shardingConfig.getConnection(shard.id);
                const Model = connection.model<T>(this.modelName);
                const shardResults = await Model.find(filter).exec();
                results.push(...shardResults);
            } catch (error: unknown) {
                this.logger.error(`Error querying shard ${shard.id}:`, error);
                // Continue with other shards
            }
        }

        return results;
    }
}
