import mongoose from 'mongoose';

export interface MongoDBConfig {
    uri: string;
    options: mongoose.ConnectOptions;
}

export function getMongoDBConfig(): MongoDBConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ecommerce';

    return {
        uri,
        options: {
            // Connection pool settings
            maxPoolSize: isProduction ? 100 : 50,
            minPoolSize: isProduction ? 10 : 5,
            maxIdleTimeMS: 30000,

            // Timeout settings
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,

            // Retry settings
            retryWrites: true,
            retryReads: true,

            // Read preference for load distribution
            readPreference: isProduction ? 'secondaryPreferred' : 'primary',

            // Write concern for durability
            w: 'majority',
            wtimeoutMS: 5000,

            // Compression
            compressors: ['zlib'],

            // Application name for monitoring
            appName: 'ecommerce-backend',

            // Auto-index creation (disable in production)
            autoIndex: !isProduction,
        },
    };
}

export async function connectToMongoDB(): Promise<void> {
    const config = getMongoDBConfig();

    // Set up event handlers before connecting
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
        console.log(`Connection URI: ${config.uri.replace(/\/\/.*@/, '//<credentials>@')}`);
    });

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', () => {
        void (async () => {
            await disconnectFromMongoDB();
            process.exit(0);
        })();
    });

    process.on('SIGTERM', () => {
        void (async () => {
            await disconnectFromMongoDB();
            process.exit(0);
        })();
    });

    try {
        await mongoose.connect(config.uri, config.options);

        console.log('MongoDB connection pool initialized:', {
            maxPoolSize: config.options.maxPoolSize,
            minPoolSize: config.options.minPoolSize,
            readPreference: config.options.readPreference,
        });
    } catch (error: unknown) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

export async function disconnectFromMongoDB(): Promise<void> {
    try {
        await mongoose.disconnect();
        console.log('MongoDB disconnected gracefully');
    } catch (error: unknown) {
        console.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
}

export function getConnectionStats(): {
    readyState: number;
    host: string;
    port: number;
    name: string;
} {
    return {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
    };
}

export function isConnected(): boolean {
    return (mongoose.connection.readyState as number) === 1;
}
