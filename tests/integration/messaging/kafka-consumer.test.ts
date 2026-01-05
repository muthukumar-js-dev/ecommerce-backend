import { KafkaConsumer } from '../../../src/infrastructure/messaging/kafka/kafka-consumer';
import { getKafkaInstance } from '../../../src/infrastructure/messaging/kafka/kafka.config';
import { KafkaTopic } from '../../../src/infrastructure/messaging/kafka/topics';
import { ProcessedEventRepository } from '../../../src/infrastructure/database/mongodb/repositories/processed-event.repository';
import { ProcessedEventModel } from '../../../src/infrastructure/database/mongodb/models/processed-event.model';
import { BaseEventHandler } from '../../../src/infrastructure/messaging/handlers/base-event-handler';
import { EachMessagePayload } from 'kafkajs';
import mongoose from 'mongoose';

// Test handler
class TestEventHandler extends BaseEventHandler {
    public processedEvents: any[] = [];

    protected async processEvent(payload: EachMessagePayload): Promise<void> {
        const event = this.parseMessage(payload);
        this.processedEvents.push(event);
    }
}

describe('Kafka Consumer Integration Tests', () => {
    let processedEventRepo: ProcessedEventRepository;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce-test');
        processedEventRepo = new ProcessedEventRepository();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await ProcessedEventModel.deleteMany({});
    });

    describe('Consumer Connection', () => {
        it('should connect to Kafka and subscribe to topics', async () => {
            const kafka = getKafkaInstance();
            const consumer = new KafkaConsumer(kafka, 'test-group');

            const handler = new TestEventHandler(processedEventRepo);
            consumer.registerHandler(KafkaTopic.USER_EVENTS, handler);

            await consumer.start();
            expect(consumer.isConnected()).toBe(true);

            await consumer.stop();
            expect(consumer.isConnected()).toBe(false);
        }, 30000);
    });

    describe('Idempotency', () => {
        it('should process event only once', async () => {
            const eventId = 'test-event-123';
            const handler = new TestEventHandler(processedEventRepo);

            // First processing
            const payload1 = createMockPayload(eventId, { data: 'test' });
            await handler.handle(payload1);

            expect(handler.processedEvents.length).toBe(1);

            // Second processing (duplicate)
            const payload2 = createMockPayload(eventId, { data: 'test' });
            await handler.handle(payload2);

            // Should still be 1 (not processed again)
            expect(handler.processedEvents.length).toBe(1);

            // Verify in database
            const exists = await processedEventRepo.exists(eventId);
            expect(exists).toBe(true);
        });
    });

    describe('Event Processing', () => {
        it('should extract event metadata correctly', async () => {
            const eventId = 'meta-test-123';
            const eventType = 'UserRegistered';
            const handler = new TestEventHandler(processedEventRepo);

            const payload = createMockPayload(eventId, { userId: '123' }, eventType);
            await handler.handle(payload);

            const processed = await ProcessedEventModel.findOne({ eventId });
            expect(processed).toBeDefined();
            expect(processed?.eventType).toBe(eventType);
            expect(processed?.handler).toBe('TestEventHandler');
        });

        it('should parse message payload correctly', async () => {
            const eventId = 'parse-test-123';
            const testData = { userId: '123', email: 'test@example.com' };
            const handler = new TestEventHandler(processedEventRepo);

            const payload = createMockPayload(eventId, testData);
            await handler.handle(payload);

            expect(handler.processedEvents[0]).toEqual(testData);
        });
    });

    describe('Error Handling', () => {
        it('should throw error on processing failure', async () => {
            class FailingHandler extends BaseEventHandler {
                protected async processEvent(): Promise<void> {
                    throw new Error('Processing failed');
                }
            }

            const handler = new FailingHandler(processedEventRepo);
            const payload = createMockPayload('fail-test-123', {});

            await expect(handler.handle(payload)).rejects.toThrow('Processing failed');

            // Event should not be marked as processed
            const exists = await processedEventRepo.exists('fail-test-123');
            expect(exists).toBe(false);
        });
    });

    describe('Statistics', () => {
        it('should provide accurate statistics', async () => {
            const handler = new TestEventHandler(processedEventRepo);

            // Process multiple events
            await handler.handle(createMockPayload('stat-1', {}, 'UserRegistered'));
            await handler.handle(createMockPayload('stat-2', {}, 'UserRegistered'));
            await handler.handle(createMockPayload('stat-3', {}, 'OrderPlaced'));

            const stats = await processedEventRepo.getStats();

            expect(stats.total).toBe(3);
            expect(stats.byType['UserRegistered']).toBe(2);
            expect(stats.byType['OrderPlaced']).toBe(1);
            expect(stats.byHandler['TestEventHandler']).toBe(3);
        });
    });
});

// Helper function to create mock Kafka payload
function createMockPayload(
    eventId: string,
    data: any,
    eventType: string = 'TestEvent'
): EachMessagePayload {
    return {
        topic: KafkaTopic.USER_EVENTS,
        partition: 0,
        message: {
            key: Buffer.from(eventId),
            value: Buffer.from(JSON.stringify(data)),
            headers: {
                eventId: Buffer.from(eventId),
                eventType: Buffer.from(eventType),
            },
            timestamp: Date.now().toString(),
            offset: '0',
            attributes: 0,
            size: 0,
        },
        heartbeat: async () => { },
        pause: () => () => { },
    };
}
