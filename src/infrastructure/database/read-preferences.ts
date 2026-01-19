import mongoose from 'mongoose';

/**
 * Read preference options for query routing
 */
export enum ReadPreference {
    PRIMARY = 'primary',
    PRIMARY_PREFERRED = 'primaryPreferred',
    SECONDARY = 'secondary',
    SECONDARY_PREFERRED = 'secondaryPreferred',
    NEAREST = 'nearest',
}

/**
 * Execute query with secondary read preference
 * Use for read-heavy, non-critical operations
 */
export function withSecondaryRead<T>(query: mongoose.Query<T, any>): mongoose.Query<T, any> {
    return query.read(ReadPreference.SECONDARY_PREFERRED);
}

/**
 * Execute query with primary read preference
 * Use for critical reads that require latest data
 */
export function withPrimaryRead<T>(query: mongoose.Query<T, any>): mongoose.Query<T, any> {
    return query.read(ReadPreference.PRIMARY);
}

/**
 * Execute query with nearest read preference
 * Use for geographically distributed reads
 */
export function withNearestRead<T>(query: mongoose.Query<T, any>): mongoose.Query<T, any> {
    return query.read(ReadPreference.NEAREST);
}

/**
 * Product queries with read preferences
 */
export class ProductReadOperations {
    /**
     * Find products with secondary read (list operations)
     */
    static async findProducts(
        filter: any,
        options?: { limit?: number; skip?: number; sort?: any }
    ): Promise<any[]> {
        const Model = mongoose.model('Product');

        let query = Model.find(filter)
            .read(ReadPreference.SECONDARY_PREFERRED)
            .lean();

        if (options?.limit) {query = query.limit(options.limit);}
        if (options?.skip) {query = query.skip(options.skip);}
        if (options?.sort) {query = query.sort(options.sort);}

        return query.exec();
    }

    /**
     * Find product by ID with secondary read
     */
    static async findProductById(productId: string): Promise<any> {
        const Model = mongoose.model('Product');

        return Model.findOne({ productId })
            .read(ReadPreference.SECONDARY_PREFERRED)
            .lean()
            .exec();
    }

    /**
     * Search products with secondary read
     */
    static async searchProducts(searchTerm: string, limit: number = 20): Promise<any[]> {
        const Model = mongoose.model('Product');

        return Model.find(
            { $text: { $search: searchTerm } },
            { score: { $meta: 'textScore' } }
        )
            .read(ReadPreference.SECONDARY_PREFERRED)
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean()
            .exec();
    }
}

/**
 * Order queries with read preferences
 */
export class OrderReadOperations {
    /**
     * Find order with primary read (critical data)
     */
    static async findOrderById(orderId: string): Promise<any> {
        const Model = mongoose.model('Order');

        return Model.findOne({ orderId })
            .read(ReadPreference.PRIMARY)
            .exec();
    }

    /**
     * Find user orders with secondary read (list operations)
     */
    static async findUserOrders(
        userId: string,
        options?: { limit?: number; skip?: number }
    ): Promise<any[]> {
        const Model = mongoose.model('Order');

        let query = Model.find({ userId })
            .read(ReadPreference.SECONDARY_PREFERRED)
            .sort({ createdAt: -1 })
            .lean();

        if (options?.limit) {query = query.limit(options.limit);}
        if (options?.skip) {query = query.skip(options.skip);}

        return query.exec();
    }

    /**
     * Find orders by status with secondary read
     */
    static async findOrdersByStatus(
        status: string,
        options?: { limit?: number; skip?: number }
    ): Promise<any[]> {
        const Model = mongoose.model('Order');

        let query = Model.find({ status })
            .read(ReadPreference.SECONDARY_PREFERRED)
            .sort({ createdAt: -1 })
            .lean();

        if (options?.limit) {query = query.limit(options.limit);}
        if (options?.skip) {query = query.skip(options.skip);}

        return query.exec();
    }
}

/**
 * User queries with read preferences
 */
export class UserReadOperations {
    /**
     * Find user by ID with primary read (authentication)
     */
    static async findUserById(userId: string): Promise<any> {
        const Model = mongoose.model('User');

        return Model.findOne({ userId })
            .read(ReadPreference.PRIMARY)
            .exec();
    }

    /**
     * Find user by email with primary read (authentication)
     */
    static async findUserByEmail(email: string): Promise<any> {
        const Model = mongoose.model('User');

        return Model.findOne({ email })
            .read(ReadPreference.PRIMARY)
            .exec();
    }

    /**
     * Find users with secondary read (list operations)
     */
    static async findUsers(
        filter: any,
        options?: { limit?: number; skip?: number }
    ): Promise<any[]> {
        const Model = mongoose.model('User');

        let query = Model.find(filter)
            .read(ReadPreference.SECONDARY_PREFERRED)
            .select('-password')
            .lean();

        if (options?.limit) {query = query.limit(options.limit);}
        if (options?.skip) {query = query.skip(options.skip);}

        return query.exec();
    }
}

/**
 * Get read preference statistics
 */
export async function getReadPreferenceStats(): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    try {
        const stats = await db.admin().serverStatus();

        return {
            connections: stats.connections,
            network: stats.network,
            opcounters: stats.opcounters,
            opcountersRepl: stats.opcountersRepl,
        };
    } catch (error: unknown) {
        console.error('Failed to get read preference stats:', error);
        throw error;
    }
}
