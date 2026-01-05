import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { UserRegisteredHandler } from './handlers/user-registered.handler';
import { OrderPlacedHandler } from './handlers/order-placed.handler';
import { OrderShippedHandler } from './handlers/order-shipped.handler';
import { PaymentSucceededHandler } from './handlers/payment-succeeded.handler';

/**
 * Kafka Consumer Groups Manager
 * Manages all Kafka consumers for the notification service
 */
export class ConsumerGroups {
    private consumers: Consumer[] = [];

    constructor(
        private kafka: Kafka,
        private sendEmailUseCase: SendEmailUseCase
    ) { }

    /**
     * Start all consumer groups
     */
    async startAll(): Promise<void> {
        await Promise.all([
            this.startUserRegisteredConsumer(),
            this.startOrderPlacedConsumer(),
            this.startOrderShippedConsumer(),
            this.startPaymentSucceededConsumer(),
        ]);

        console.log('✅ All Kafka consumers started');
    }

    /**
     * Stop all consumer groups
     */
    async stopAll(): Promise<void> {
        await Promise.all(this.consumers.map((consumer) => consumer.disconnect()));
        console.log('✅ All Kafka consumers stopped');
    }

    private async startUserRegisteredConsumer(): Promise<void> {
        const consumer = this.kafka.consumer({
            groupId: 'notification-service-user-registered',
        });

        await consumer.connect();
        await consumer.subscribe({
            topic: 'user.registered',
            fromBeginning: false,
        });

        const handler = new UserRegisteredHandler(this.sendEmailUseCase);

        await consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                await handler.handle(payload);
            },
        });

        this.consumers.push(consumer);
        console.log('📧 UserRegistered consumer started');
    }

    private async startOrderPlacedConsumer(): Promise<void> {
        const consumer = this.kafka.consumer({
            groupId: 'notification-service-order-placed',
        });

        await consumer.connect();
        await consumer.subscribe({
            topic: 'order.placed',
            fromBeginning: false,
        });

        const handler = new OrderPlacedHandler(this.sendEmailUseCase);

        await consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                await handler.handle(payload);
            },
        });

        this.consumers.push(consumer);
        console.log('📧 OrderPlaced consumer started');
    }

    private async startOrderShippedConsumer(): Promise<void> {
        const consumer = this.kafka.consumer({
            groupId: 'notification-service-order-shipped',
        });

        await consumer.connect();
        await consumer.subscribe({
            topic: 'order.shipped',
            fromBeginning: false,
        });

        const handler = new OrderShippedHandler(this.sendEmailUseCase);

        await consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                await handler.handle(payload);
            },
        });

        this.consumers.push(consumer);
        console.log('📧 OrderShipped consumer started');
    }

    private async startPaymentSucceededConsumer(): Promise<void> {
        const consumer = this.kafka.consumer({
            groupId: 'notification-service-payment-succeeded',
        });

        await consumer.connect();
        await consumer.subscribe({
            topic: 'payment.succeeded',
            fromBeginning: false,
        });

        const handler = new PaymentSucceededHandler(this.sendEmailUseCase);

        await consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                await handler.handle(payload);
            },
        });

        this.consumers.push(consumer);
        console.log('📧 PaymentSucceeded consumer started');
    }
}
