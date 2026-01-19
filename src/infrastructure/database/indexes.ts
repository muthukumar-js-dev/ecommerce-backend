import mongoose from 'mongoose';

export async function createIndexes(): Promise<void> {
    console.log('Creating database indexes...');

    try {
        // Get database connection
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        // User indexes
        await db.collection('users').createIndex(
            { email: 1 },
            { unique: true, name: 'email_unique' }
        );
        console.log('✓ Created index: users.email_unique');

        await db.collection('users').createIndex(
            { userId: 1 },
            { unique: true, name: 'userId_unique' }
        );
        console.log('✓ Created index: users.userId_unique');

        await db.collection('users').createIndex(
            { createdAt: -1 },
            { name: 'created_at_desc' }
        );
        console.log('✓ Created index: users.created_at_desc');

        await db.collection('users').createIndex(
            { 'address.city': 1, 'address.state': 1 },
            { name: 'address_location', sparse: true }
        );
        console.log('✓ Created index: users.address_location');

        // Product indexes
        await db.collection('products').createIndex(
            { productId: 1 },
            { unique: true, name: 'productId_unique' }
        );
        console.log('✓ Created index: products.productId_unique');

        await db.collection('products').createIndex(
            { category: 1, price: 1 },
            { name: 'category_price' }
        );
        console.log('✓ Created index: products.category_price');

        await db.collection('products').createIndex(
            { title: 'text', description: 'text' },
            { name: 'text_search', weights: { title: 10, description: 5 } }
        );
        console.log('✓ Created index: products.text_search');

        await db.collection('products').createIndex(
            { sellerId: 1, createdAt: -1 },
            { name: 'seller_products' }
        );
        console.log('✓ Created index: products.seller_products');

        await db.collection('products').createIndex(
            { inventory: 1 },
            { name: 'inventory_check' }
        );
        console.log('✓ Created index: products.inventory_check');

        await db.collection('products').createIndex(
            { createdAt: -1 },
            { name: 'created_at_desc' }
        );
        console.log('✓ Created index: products.created_at_desc');

        // Order indexes
        await db.collection('orders').createIndex(
            { orderId: 1 },
            { unique: true, name: 'orderId_unique' }
        );
        console.log('✓ Created index: orders.orderId_unique');

        await db.collection('orders').createIndex(
            { userId: 1, createdAt: -1 },
            { name: 'user_orders' }
        );
        console.log('✓ Created index: orders.user_orders');

        await db.collection('orders').createIndex(
            { status: 1, createdAt: -1 },
            { name: 'order_status' }
        );
        console.log('✓ Created index: orders.order_status');

        await db.collection('orders').createIndex(
            { orderNumber: 1 },
            { unique: true, name: 'order_number_unique' }
        );
        console.log('✓ Created index: orders.order_number_unique');

        await db.collection('orders').createIndex(
            { 'items.productId': 1 },
            { name: 'order_items_product' }
        );
        console.log('✓ Created index: orders.order_items_product');

        await db.collection('orders').createIndex(
            { 'payment.status': 1 },
            { name: 'payment_status', sparse: true }
        );
        console.log('✓ Created index: orders.payment_status');

        // Cart indexes
        await db.collection('carts').createIndex(
            { userId: 1 },
            { unique: true, name: 'userId_unique' }
        );
        console.log('✓ Created index: carts.userId_unique');

        await db.collection('carts').createIndex(
            { updatedAt: -1 },
            { name: 'updated_at_desc' }
        );
        console.log('✓ Created index: carts.updated_at_desc');

        // Review indexes
        await db.collection('reviews').createIndex(
            { productId: 1, createdAt: -1 },
            { name: 'product_reviews' }
        );
        console.log('✓ Created index: reviews.product_reviews');

        await db.collection('reviews').createIndex(
            { userId: 1, productId: 1 },
            { unique: true, name: 'user_product_unique' }
        );
        console.log('✓ Created index: reviews.user_product_unique');

        await db.collection('reviews').createIndex(
            { rating: 1 },
            { name: 'rating_index' }
        );
        console.log('✓ Created index: reviews.rating_index');

        console.log('✅ All database indexes created successfully');
    } catch (error: unknown) {
        console.error('❌ Error creating indexes:', error);
        throw error;
    }
}

export async function listIndexes(): Promise<Record<string, any[]>> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    const collections = ['users', 'products', 'orders', 'carts', 'reviews'];
    const indexes: Record<string, any[]> = {};

    for (const collectionName of collections) {
        try {
            const collection = db.collection(collectionName);
            indexes[collectionName] = await collection.indexes();
        } catch (error: unknown) {
            console.error(`Error listing indexes for ${collectionName}:`, error);
            indexes[collectionName] = [];
        }
    }

    return indexes;
}

export async function dropIndexes(collectionName: string, indexName: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    await db.collection(collectionName).dropIndex(indexName);
    console.log(`Dropped index ${indexName} from ${collectionName}`);
}
