import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaTopic } from '@shared/infrastructure/messaging/kafka/topics';
import { OrderPlacedHandler } from './handlers/order-placed.handler';

/**
 * Consumer groups for Payment Service
 * Subscribes to relevant topics and routes events to handlers
 */
export class ConsumerGroups {
    private consumers: Consumer[] = [];

    constructor(
        private kafka: Kafka,
        private orderPlacedHandler: OrderPlacedHandler
    ) { }

    /**
     * Start all consumer groups
     */
    async startAll(): Promise<void> {
        await this.startOrderEventsConsumer();
        console.log('✓ All payment service consumers started');
    }

    /**
     * Stop all consumer groups
     */
    async stopAll(): Promise<void> {
        for (const consumer of this.consumers) {
            await consumer.disconnect();
        }
        console.log('✓ All payment service consumers stopped');
    }

    /**
     * Subscribe to order events
     */
    private async startOrderEventsConsumer(): Promise<void> {
        const consumer = this.kafka.consumer({
            groupId: 'payment-service-order-events',
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
        });

        await consumer.connect();
        await consumer.subscribe({
            topic: KafkaTopic.ORDER_EVENTS,
            fromBeginning: false,
        });

        await consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                await this.routeOrderEvent(payload);
            },
        });

        this.consumers.push(consumer);
        console.log(`  ✓ Subscribed to ${KafkaTopic.ORDER_EVENTS}`);
    }

    /**
     * Route order events to appropriate handlers
     */
    private async routeOrderEvent(payload: EachMessagePayload): Promise<void> {
        const eventType = payload.message.headers?.eventType?.toString();

        try {
            switch (eventType) {
                case 'OrderPlaced':
                    await this.orderPlacedHandler.handle(payload);
                    break;
                default:
                    console.log(`Unhandled order event type: ${eventType}`);
            }
        } catch (error: any) {
            console.error(`Error handling order event ${eventType}:`, error.message);
            // Event will be retried by Kafka consumer
            throw error;
        }
    }
}
