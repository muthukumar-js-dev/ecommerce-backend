import { Kafka, KafkaConfig, logLevel } from 'kafkajs';

export interface KafkaClientConfig {
    brokers: string[];
    clientId: string;
    ssl?: boolean;
    sasl?: {
        mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
        username: string;
        password: string;
    };
}

export function createKafkaClient(config: KafkaClientConfig): Kafka {
    const kafkaConfig: KafkaConfig = {
        clientId: config.clientId,
        brokers: config.brokers,
        logLevel: logLevel.INFO,
        retry: {
            initialRetryTime: 100,
            retries: 8,
            maxRetryTime: 30000,
            multiplier: 2,
            factor: 0.2,
        },
        connectionTimeout: 10000,
        requestTimeout: 30000,
    };

    if (config.ssl) {
        kafkaConfig.ssl = true;
    }

    if (config.sasl) {
        kafkaConfig.sasl = config.sasl;
    }

    return new Kafka(kafkaConfig);
}

// Environment-based configuration
export function getKafkaConfig(): KafkaClientConfig {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production') {
        return {
            clientId: 'ecommerce-backend',
            brokers: (process.env.KAFKA_BROKERS || '').split(','),
            ssl: true,
            sasl: {
                mechanism: 'scram-sha-256',
                username: process.env.KAFKA_USERNAME || '',
                password: process.env.KAFKA_PASSWORD || '',
            },
        };
    }

    return {
        clientId: 'ecommerce-backend-dev',
        brokers: ['localhost:9092'],
    };
}

// Singleton instance
let kafkaInstance: Kafka | null = null;

export function getKafkaInstance(): Kafka {
    if (!kafkaInstance) {
        const config = getKafkaConfig();
        kafkaInstance = createKafkaClient(config);
    }
    return kafkaInstance;
}
