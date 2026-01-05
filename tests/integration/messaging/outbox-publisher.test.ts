import { OutboxPublisher } from '../../../src/infrastructure/messaging/outbox/outbox-publisher';
import { OutboxRepository } from '../../../src/infrastructure/database/mongodb/repositories/outbox.repository';
import { KafkaProducer } from '../../../src/infrastructure/messaging/kafka/kafka-producer';
import { getKafkaInstance } from '../../../src/infrastructure/messaging/kafka/kafka.config';
import { KafkaTopic } from '../../../src/infrastructure/messaging/kafka/topics';
import { OutboxModel } from '../../../src/infrastructure/database/mongodb/models/outbox.model';
import mongoose from 'mongoose';

describe('Outbox Publisher Integration Tests', () => {
    let outboxRepository: OutboxRepository;
    let kafkaProducer: KafkaProducer;
    let publisher: OutboxPublisher;

    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce-test');

        // Initialize components
        outboxRepository = new OutboxRepository();
        const kafka = getKafkaInstance();
        kafkaProducer = new KafkaProducer(kafka);
    });

    afterAll(async () => {
        if (publisher) {
            await publisher.stop();
        }
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clear outbox before each test
        await OutboxModel.deleteMany({});
    });

    describe('Event Publishing', () => {
        it('should publish events from outbox to Kafka', async () => {
            // Arrange: Create test event in outbox
            const testEvent = {
                eventId: 'test-event-123',
                eventType: 'UserRegistered',
                aggregateId: 'user-123',
                aggregateType: 'User',
                payload: {
                    userId: 'user-123',
                    email: 'test@example.com',
                    name: 'Test User',
                },
                topic: KafkaTopic.USER_EVENTS,
                published: false,
                retryCount: 0,
            };

            await OutboxModel.create(testEvent);

            // Act: Start publisher and wait for processing
            publisher = new OutboxPublisher(outboxRepository, kafkaProducer, {
                pollingIntervalMs: 500,
            });

            await publisher.start();
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for polling

            // Assert: Event should be marked as published
            const updatedEvent = await OutboxModel.findOne({ eventId: 'test-event-123' });
            expect(updatedEvent?.published).toBe(true);
            expect(updatedEvent?.publishedAt).toBeDefined();
        }, 30000);

        it('should publish multiple events in batch', async () => {
            // Arrange: Create multiple events
            const events = Array.from({ length: 5 }, (_, i) => ({
                eventId: `test-event-${i}`,
                eventType: 'UserRegistered',
                aggregateId: `user-${i}`,
                aggregateType: 'User',
                payload: { userId: `user-${i}` },
                topic: KafkaTopic.USER_EVENTS,
                published: false,
                retryCount: 0,
            }));

            await OutboxModel.insertMany(events);

            // Act: Start publisher
            publisher = new OutboxPublisher(outboxRepository, kafkaProducer, {
                pollingIntervalMs: 500,
                batchSize: 10,
            });

            await publisher.start();
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Assert: All events should be published
            const publishedCount = await OutboxModel.countDocuments({ published: true });
            expect(publishedCount).toBe(5);
        }, 30000);
    });

    describe('Retry Logic', () => {
        it('should retry failed events', async () => {
            // Arrange: Create event that will fail initially
            const testEvent = {
                eventId: 'retry-test-123',
                eventType: 'OrderPlaced',
                aggregateId: 'order-123',
                aggregateType: 'Order',
                payload: { orderId: 'order-123' },
                topic: 'invalid-topic' as KafkaTopic, // This will cause failure
                published: false,
                retryCount: 0,
            };

            await OutboxModel.create(testEvent);

            // Act: Start publisher
            publisher = new OutboxPublisher(outboxRepository, kafkaProducer, {
                pollingIntervalMs: 500,
                maxRetries: 3,
            });

            await publisher.start();
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Assert: Retry count should be incremented
            const updatedEvent = await OutboxModel.findOne({ eventId: 'retry-test-123' });
            expect(updatedEvent?.retryCount).toBeGreaterThan(0);
            expect(updatedEvent?.lastError).toBeDefined();
        }, 30000);

        it('should move to DLQ after max retries', async () => {
            // Arrange: Create event with high retry count
            const testEvent = {
                eventId: 'dlq-test-123',
                eventType: 'OrderPlaced',
                aggregateId: 'order-123',
                aggregateType: 'Order',
                payload: { orderId: 'order-123' },
                topic: 'invalid-topic' as KafkaTopic,
                published: false,
                retryCount: 5, // Already at max
            };

            await OutboxModel.create(testEvent);

            // Act: Start publisher
            publisher = new OutboxPublisher(outboxRepository, kafkaProducer, {
                pollingIntervalMs: 500,
                maxRetries: 5,
            });

            await publisher.start();
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Assert: Event should be marked as published (moved to DLQ)
            const updatedEvent = await OutboxModel.findOne({ eventId: 'dlq-test-123' });
            expect(updatedEvent?.published).toBe(true);
        }, 30000);
    });

    describe('Statistics', () => {
        it('should provide accurate statistics', async () => {
            // Arrange: Create mix of published and unpublished events
            await OutboxModel.insertMany([
                {
                    eventId: 'published-1',
                    eventType: 'UserRegistered',
                    aggregateId: 'user-1',
                    aggregateType: 'User',
                    payload: {},
                    topic: KafkaTopic.USER_EVENTS,
                    published: true,
                    publishedAt: new Date(),
                    retryCount: 0,
                },
                {
                    eventId: 'unpublished-1',
                    eventType: 'UserRegistered',
                    aggregateId: 'user-2',
                    aggregateType: 'User',
                    payload: {},
                    topic: KafkaTopic.USER_EVENTS,
                    published: false,
                    retryCount: 0,
                },
                {
                    eventId: 'failed-1',
                    eventType: 'UserRegistered',
                    aggregateId: 'user-3',
                    aggregateType: 'User',
                    payload: {},
                    topic: KafkaTopic.USER_EVENTS,
                    published: false,
                    retryCount: 6,
                },
            ]);

            // Act: Get statistics
            const stats = await outboxRepository.getStats();

            // Assert
            expect(stats.published).toBe(1);
            expect(stats.unpublished).toBe(2);
            expect(stats.failed).toBe(1);
            expect(stats.oldestUnpublished).toBeDefined();
        });
    });

    describe('Cleanup', () => {
        it('should delete old published events', async () => {
            // Arrange: Create old published event
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 35); // 35 days old

            await OutboxModel.create({
                eventId: 'old-event-1',
                eventType: 'UserRegistered',
                aggregateId: 'user-1',
                aggregateType: 'User',
                payload: {},
                topic: KafkaTopic.USER_EVENTS,
                published: true,
                publishedAt: oldDate,
                retryCount: 0,
            });

            // Act: Delete old events (30 days)
            const deletedCount = await outboxRepository.deleteOldEvents(30);

            // Assert
            expect(deletedCount).toBe(1);
            const remaining = await OutboxModel.countDocuments({});
            expect(remaining).toBe(0);
        });
    });
});
