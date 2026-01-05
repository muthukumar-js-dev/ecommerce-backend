import { EachMessagePayload } from 'kafkajs';
import { KafkaProducer } from '../kafka/kafka-producer';
import { KafkaTopic } from '../kafka/topics';

/**
 * Retry Handler with exponential backoff and DLQ support
 * Wraps event handlers to provide automatic retry logic
 */
export class RetryHandler {
    private static readonly MAX_RETRIES = 3;
    private static readonly BASE_DELAY_MS = 1000;

    constructor(private kafkaProducer: KafkaProducer) { }

    /**
     * Handle event with retry logic
     */
    async handleWithRetry(
        handler: (payload: EachMessagePayload) => Promise<void>,
        payload: EachMessagePayload
    ): Promise<void> {
        const retryCount = this.getRetryCount(payload);

        try {
            await handler(payload);
        } catch (error: any) {
            console.error(`  ✗ Handler failed (retry ${retryCount}/${RetryHandler.MAX_RETRIES}):`, error.message);

            if (retryCount >= RetryHandler.MAX_RETRIES) {
                console.error(`  ⚠ Max retries exceeded, sending to DLQ`);
                await this.sendToDLQ(payload, error);
                return; // Don't throw, message is handled
            }

            // Exponential backoff
            const delayMs = RetryHandler.BASE_DELAY_MS * Math.pow(2, retryCount);
            console.log(`  ⏳ Retrying in ${delayMs}ms...`);
            await this.sleep(delayMs);

            // Re-publish with incremented retry count
            await this.republishWithRetry(payload, retryCount + 1);
        }
    }

    /**
     * Send failed message to Dead Letter Queue
     */
    private async sendToDLQ(payload: EachMessagePayload, error: Error): Promise<void> {
        const headers = this.extractHeaders(payload);

        await this.kafkaProducer.send(
            KafkaTopic.DLQ_EVENTS,
            payload.message.key?.toString() || 'unknown',
            {
                originalTopic: payload.topic,
                originalPartition: payload.partition,
                originalOffset: payload.message.offset,
                originalMessage: payload.message.value?.toString(),
                originalHeaders: headers,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                retryCount: this.getRetryCount(payload),
            },
            {
                eventType: 'DLQEvent',
                originalTopic: payload.topic,
            }
        );

        console.log(`  ✓ Message sent to DLQ: ${payload.message.key}`);
    }

    /**
     * Re-publish message with incremented retry count
     */
    private async republishWithRetry(
        payload: EachMessagePayload,
        retryCount: number
    ): Promise<void> {
        const headers = this.extractHeaders(payload);
        headers.retryCount = retryCount.toString();

        await this.kafkaProducer.send(
            payload.topic as KafkaTopic,
            payload.message.key?.toString() || 'unknown',
            JSON.parse(payload.message.value?.toString() || '{}'),
            headers
        );

        console.log(`  ✓ Message republished with retry count: ${retryCount}`);
    }

    /**
     * Get retry count from message headers
     */
    private getRetryCount(payload: EachMessagePayload): number {
        const headers = payload.message.headers || {};
        const retryCountHeader = headers.retryCount?.toString();
        return retryCountHeader ? parseInt(retryCountHeader, 10) : 0;
    }

    /**
     * Extract all headers as key-value pairs
     */
    private extractHeaders(payload: EachMessagePayload): Record<string, string> {
        const headers = payload.message.headers || {};
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
            result[key] = value?.toString() || '';
        }
        return result;
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
