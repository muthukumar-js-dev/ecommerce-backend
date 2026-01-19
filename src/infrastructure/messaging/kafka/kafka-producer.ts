import { Kafka, Producer, ProducerRecord, RecordMetadata, CompressionTypes } from 'kafkajs';
import { KafkaTopic } from './topics';

export interface ProducerConfig {
    transactionalId?: string;
    maxInFlightRequests?: number;
    idempotent?: boolean;
}

export class KafkaProducer {
    private producer: Producer;
    private connected: boolean = false;

    constructor(kafka: Kafka, config?: ProducerConfig) {
        this.producer = kafka.producer({
            allowAutoTopicCreation: false,
            transactionalId: config?.transactionalId || `ecommerce-producer-${process.pid}`,
            maxInFlightRequests: config?.maxInFlightRequests || 5,
            idempotent: config?.idempotent !== false, // Default to true
            retry: {
                initialRetryTime: 100,
                retries: 8,
                maxRetryTime: 30000,
                multiplier: 2,
                factor: 0.2,
            },

        });
    }

    async connect(): Promise<void> {
        if (!this.connected) {
            await this.producer.connect();
            this.connected = true;
            console.log('✓ Kafka producer connected');
        }
    }

    async disconnect(): Promise<void> {
        if (this.connected) {
            await this.producer.disconnect();
            this.connected = false;
            console.log('✓ Kafka producer disconnected');
        }
    }

    /**
     * Send a single message to Kafka
     */
    async send(
        topic: KafkaTopic,
        key: string,
        value: any,
        headers?: Record<string, string>
    ): Promise<RecordMetadata[]> {
        if (!this.connected) {
            await this.connect();
        }

        const record: ProducerRecord = {
            topic,
            messages: [
                {
                    key,
                    value: JSON.stringify(value),
                    headers: this.serializeHeaders(headers),
                    timestamp: Date.now().toString(),
                },
            ],
            compression: CompressionTypes.GZIP,
        };

        try {
            const metadata = await this.producer.send(record);
            return metadata;
        } catch (error: any) {
            console.error(`Failed to send message to ${topic}:`, error);
            throw error;
        }
    }

    /**
     * Send multiple messages in a batch
     */
    async sendBatch(
        topic: KafkaTopic,
        messages: Array<{ key: string; value: any; headers?: Record<string, string> }>
    ): Promise<RecordMetadata[]> {
        if (!this.connected) {
            await this.connect();
        }

        const record: ProducerRecord = {
            topic,
            messages: messages.map((msg) => ({
                key: msg.key,
                value: JSON.stringify(msg.value),
                headers: this.serializeHeaders(msg.headers),
                timestamp: Date.now().toString(),
            })),
            compression: CompressionTypes.GZIP,
        };

        try {
            const metadata = await this.producer.send(record);
            return metadata;
        } catch (error: any) {
            console.error(`Failed to send batch to ${topic}:`, error);
            throw error;
        }
    }

    /**
     * Check if producer is connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Serialize headers to Buffer format required by Kafka
     */
    private serializeHeaders(headers?: Record<string, string>): Record<string, Buffer> | undefined {
        if (!headers) { return undefined; }

        const serialized: Record<string, Buffer> = {};
        for (const [key, value] of Object.entries(headers)) {
            serialized[key] = Buffer.from(value);
        }
        return serialized;
    }
}
