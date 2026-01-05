import { KafkaConsumer } from './kafka/kafka-consumer';
import { getKafkaInstance } from './kafka/kafka.config';
import { KafkaTopic } from './kafka/topics';
import { UserRegisteredConsumerHandler } from './handlers/user-registered-consumer.handler';
import { OrderPlacedConsumerHandler } from './handlers/order-placed-consumer.handler';
import { ProductCreatedConsumerHandler } from './handlers/product-created-consumer.handler';
import { ProcessedEventRepository } from '@infrastructure/database/mongodb/repositories/processed-event.repository';
import { UserReadRepository } from '@infrastructure/database/mongodb/read-models/user-read.repository';
import { OrderReadRepository } from '@infrastructure/database/mongodb/read-models/order-read.repository';
import { ProductReadRepository } from '@infrastructure/database/mongodb/read-models/product-read.repository';

/**
 * Consumer Groups Module
 * Manages all Kafka consumer groups for the application
 */
export class ConsumerGroupsModule {
    private consumers: KafkaConsumer[] = [];

    /**
     * Start all consumer groups
     */
    async startAll(): Promise<void> {
        console.log('🚀 Starting Kafka consumer groups...');

        const kafka = getKafkaInstance();

        // Initialize repositories
        const processedEventRepo = new ProcessedEventRepository();
        const userReadRepo = new UserReadRepository();
        const orderReadRepo = new OrderReadRepository();
        const productReadRepo = new ProductReadRepository();

        // User Events Consumer Group
        const userConsumer = new KafkaConsumer(kafka, 'user-service-group');
        userConsumer.registerHandler(
            KafkaTopic.USER_EVENTS,
            new UserRegisteredConsumerHandler(processedEventRepo, userReadRepo)
        );
        await userConsumer.start();
        this.consumers.push(userConsumer);

        // Order Events Consumer Group
        const orderConsumer = new KafkaConsumer(kafka, 'order-service-group');
        orderConsumer.registerHandler(
            KafkaTopic.ORDER_EVENTS,
            new OrderPlacedConsumerHandler(processedEventRepo, orderReadRepo)
        );
        await orderConsumer.start();
        this.consumers.push(orderConsumer);

        // Product Events Consumer Group
        const productConsumer = new KafkaConsumer(kafka, 'product-service-group');
        productConsumer.registerHandler(
            KafkaTopic.PRODUCT_EVENTS,
            new ProductCreatedConsumerHandler(processedEventRepo, productReadRepo)
        );
        await productConsumer.start();
        this.consumers.push(productConsumer);

        console.log(`✅ All consumer groups started (${this.consumers.length} groups)`);
    }

    /**
     * Stop all consumer groups gracefully
     */
    async stopAll(): Promise<void> {
        console.log('🛑 Stopping all consumer groups...');

        for (const consumer of this.consumers) {
            await consumer.stop();
        }

        this.consumers = [];
        console.log('✅ All consumer groups stopped');
    }

    /**
     * Get number of active consumers
     */
    getActiveCount(): number {
        return this.consumers.filter((c) => c.isConnected()).length;
    }
}

// Singleton instance
let consumerGroupsModule: ConsumerGroupsModule | null = null;

/**
 * Get the singleton instance of ConsumerGroupsModule
 */
export function getConsumerGroupsModule(): ConsumerGroupsModule {
    if (!consumerGroupsModule) {
        consumerGroupsModule = new ConsumerGroupsModule();
    }
    return consumerGroupsModule;
}

/**
 * Initialize consumer groups on application startup
 */
export async function initializeConsumerGroups(): Promise<void> {
    const module = getConsumerGroupsModule();
    await module.startAll();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        await module.stopAll();
    });

    process.on('SIGINT', async () => {
        await module.stopAll();
        process.exit(0);
    });
}
