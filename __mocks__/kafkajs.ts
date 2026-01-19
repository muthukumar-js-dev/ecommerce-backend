
const mockConsumer = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockImplementation(async ({ eachMessage: _ }: any) => {
        return Promise.resolve();
    }),
    stop: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    events: { REQUEST_TIMEOUT: 'connection.request_timeout' }
};

const mockProducer = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue([{ topicName: 'test', partition: 0, errorCode: 0, baseOffset: '0' }]),
};

const mockAdmin = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    describeCluster: jest.fn().mockResolvedValue({
        clusterId: 'test-cluster-id',
        brokers: [{ nodeId: 1, host: 'localhost', port: 9092 }]
    }),
    listTopics: jest.fn().mockResolvedValue([
        'user.events', 'order.events', 'payment.events',
        'notification.events', 'product.events', 'dlq.events'
    ]),
    fetchTopicMetadata: jest.fn().mockResolvedValue({
        topics: [{
            name: 'order.events',
            partitions: Array(20).fill({ partitionId: 0, leader: 1, replicas: [1], isr: [1] })
        }]
    }),
    createTopics: jest.fn().mockResolvedValue(true)
};

export class Kafka {
    constructor(_config: any) { }
    admin() { return mockAdmin; }
    producer() { return mockProducer; }
    consumer() { return mockConsumer; }
}

export const logLevel = { INFO: 1, ERROR: 4, WARN: 2, DEBUG: 5, NOTHING: 0 };
