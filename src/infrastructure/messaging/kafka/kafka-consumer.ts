import { Kafka, Consumer, EachMessagePayload, ConsumerConfig } from 'kafkajs';
import { KafkaTopic } from './topics';

export interface MessageHandler {
    handle(payload: EachMessagePayload): Promise<void>;
}

/**
 * Kafka Consumer with consumer group support
 * Handles message consumption from Kafka topics
 */
export class KafkaConsumer {
    private consumer: Consumer;
    private connected: boolean = false;
    private handlers = new Map<KafkaTopic, MessageHandler>();

    constructor(
        private kafka: Kafka,
        private groupId: string
    ) {
        const config: ConsumerConfig = {
            groupId,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
            maxBytesPerPartition: 1048576, // 1MB
            retry: {
                initialRetryTime: 100,
                retries: 8,
                multiplier: 2,
            },
        };

        this.consumer = kafka.consumer(config);
    }

    /**
     * Register a handler for a specific topic
     */
    registerHandler(topic: KafkaTopic, handler: MessageHandler): void {
        this.handlers.set(topic, handler);
        console.log(`✓ Registered handler for topic: ${topic}`);
    }

    /**
     * Start consuming messages
     */
    async start(): Promise<void> {
        if (this.connected) {
            console.log(`⚠ Consumer ${this.groupId} already connected`);
            return;
        }

        console.log(`🔌 Connecting consumer: ${this.groupId}...`);
        await this.consumer.connect();
        this.connected = true;

        const topics = Array.from(this.handlers.keys());
        if (topics.length === 0) {
            console.log(`⚠ No topics registered for consumer: ${this.groupId}`);
            return;
        }

        console.log(`📡 Subscribing to topics: ${topics.join(', ')}`);
        await this.consumer.subscribe({ topics, fromBeginning: false });

        await this.consumer.run({
            eachMessage: async (payload) => {
                const handler = this.handlers.get(payload.topic as KafkaTopic);
                if (handler) {
                    try {
                        await handler.handle(payload);
                    } catch (error: any) {
                        console.error(
                            `❌ Error processing message from ${payload.topic}:`,
                            error.message
                        );
                        // Kafka will retry based on consumer config
                        throw error;
                    }
                } else {
                    console.warn(`⚠ No handler found for topic: ${payload.topic}`);
                }
            },
        });

        console.log(`✓ Kafka consumer started: ${this.groupId}`);
    }

    /**
     * Stop consuming messages gracefully
     */
    async stop(): Promise<void> {
        if (!this.connected) {
            return;
        }

        console.log(`🛑 Stopping consumer: ${this.groupId}...`);
        await this.consumer.disconnect();
        this.connected = false;
        console.log(`✓ Consumer stopped: ${this.groupId}`);
    }

    /**
     * Check if consumer is connected
     */
    isConnected(): boolean {
        return this.connected;
    }
}
