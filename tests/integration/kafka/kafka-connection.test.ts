import {
    createKafkaClient,
    getKafkaConfig,
} from '../../../src/infrastructure/messaging/kafka/kafka.config';
import { KafkaHealthCheck } from '../../../src/infrastructure/messaging/kafka/health-check';
import { KafkaTopic } from '../../../src/infrastructure/messaging/kafka/topics';

describe('Kafka Integration Tests', () => {
    const config = getKafkaConfig();
    const kafka = createKafkaClient(config);

    describe('Connection', () => {
        it('should connect to Kafka cluster', async () => {
            const healthCheck = new KafkaHealthCheck(kafka);
            const result = await healthCheck.check();

            expect(result.healthy).toBe(true);
            expect(result.details?.brokers).toBeGreaterThan(0);
        }, 30000);

        it('should have cluster ID', async () => {
            const admin = kafka.admin();
            await admin.connect();

            const cluster = await admin.describeCluster();
            await admin.disconnect();

            expect(cluster.clusterId).toBeDefined();
            expect(cluster.brokers.length).toBeGreaterThan(0);
        }, 30000);
    });

    describe('Topics', () => {
        it('should list all required topics', async () => {
            const admin = kafka.admin();
            await admin.connect();

            const topics = await admin.listTopics();
            await admin.disconnect();

            expect(topics).toContain(KafkaTopic.USER_EVENTS);
            expect(topics).toContain(KafkaTopic.ORDER_EVENTS);
            expect(topics).toContain(KafkaTopic.PAYMENT_EVENTS);
            expect(topics).toContain(KafkaTopic.NOTIFICATION_EVENTS);
            expect(topics).toContain(KafkaTopic.PRODUCT_EVENTS);
            expect(topics).toContain(KafkaTopic.DLQ_EVENTS);
        }, 30000);

        it('should verify topic configurations', async () => {
            const admin = kafka.admin();
            await admin.connect();

            const topicMetadata = await admin.fetchTopicMetadata({
                topics: [KafkaTopic.ORDER_EVENTS],
            });

            await admin.disconnect();

            const orderTopic = topicMetadata.topics.find(
                (t) => t.name === KafkaTopic.ORDER_EVENTS
            );

            expect(orderTopic).toBeDefined();
            expect(orderTopic!.partitions.length).toBe(20); // 20 partitions for order events
        }, 30000);
    });

    describe('Health Checks', () => {
        it('should pass health check', async () => {
            const healthCheck = new KafkaHealthCheck(kafka);
            const result = await healthCheck.check();

            expect(result.healthy).toBe(true);
            expect(result.message).toContain('broker');
        }, 30000);

        it('should verify all topics exist', async () => {
            const healthCheck = new KafkaHealthCheck(kafka);
            const expectedTopics = [
                KafkaTopic.USER_EVENTS,
                KafkaTopic.ORDER_EVENTS,
                KafkaTopic.PAYMENT_EVENTS,
                KafkaTopic.NOTIFICATION_EVENTS,
                KafkaTopic.PRODUCT_EVENTS,
                KafkaTopic.DLQ_EVENTS,
            ];

            const result = await healthCheck.checkTopics(expectedTopics);

            expect(result.healthy).toBe(true);
        }, 30000);
    });

    describe('Producer/Consumer', () => {
        it('should produce and consume a message', async () => {
            const producer = kafka.producer();
            const consumer = kafka.consumer({ groupId: 'test-group' });

            await producer.connect();
            await consumer.connect();

            await consumer.subscribe({
                topic: KafkaTopic.USER_EVENTS,
                fromBeginning: false,
            });

            const testMessage = {
                eventId: 'test-123',
                userId: 'user-123',
                email: 'test@example.com',
                timestamp: new Date().toISOString(),
            };

            let receivedMessage: any = null;

            await consumer.run({
                eachMessage: async ({ message }) => {
                    receivedMessage = JSON.parse(message.value!.toString());
                },
            });

            await producer.send({
                topic: KafkaTopic.USER_EVENTS,
                messages: [
                    {
                        key: 'test-123',
                        value: JSON.stringify(testMessage),
                    },
                ],
            });

            // Wait for message to be consumed
            await new Promise((resolve) => setTimeout(resolve, 2000));

            await producer.disconnect();
            await consumer.disconnect();

            expect(receivedMessage).toBeDefined();
            expect(receivedMessage.eventId).toBe('test-123');
        }, 30000);
    });
});
