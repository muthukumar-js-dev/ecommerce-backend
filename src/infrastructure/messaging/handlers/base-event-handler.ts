import { EachMessagePayload } from 'kafkajs';
import { MessageHandler } from '../kafka/kafka-consumer';
import { ProcessedEventRepository } from '@infrastructure/database/mongodb/repositories/processed-event.repository';

/**
 * Base Event Handler with idempotency support
 * All event handlers should extend this class
 */
export abstract class BaseEventHandler implements MessageHandler {
    constructor(protected processedEventRepo: ProcessedEventRepository) { }

    /**
     * Handle incoming message with idempotency check
     */
    async handle(payload: EachMessagePayload): Promise<void> {
        const eventId = this.extractEventId(payload);
        const eventType = this.extractEventType(payload);

        // Check if already processed (idempotency)
        const isProcessed = await this.processedEventRepo.exists(eventId);
        if (isProcessed) {
            console.log(`⏭ Event ${eventId} (${eventType}) already processed, skipping`);
            return;
        }

        try {
            console.log(`📨 Processing event ${eventId} (${eventType})...`);

            // Process the event (implemented by subclass)
            await this.processEvent(payload);

            // Mark as processed
            await this.processedEventRepo.save({
                eventId,
                eventType,
                processedAt: new Date(),
                handler: this.constructor.name,
            });

            console.log(`✓ Event ${eventId} (${eventType}) processed successfully`);
        } catch (error: any) {
            console.error(`❌ Error processing event ${eventId} (${eventType}):`, error.message);
            throw error; // Kafka will retry
        }
    }

    /**
     * Process the event (must be implemented by subclass)
     */
    protected abstract processEvent(payload: EachMessagePayload): Promise<void>;

    /**
     * Extract event ID from message headers or key
     */
    protected extractEventId(payload: EachMessagePayload): string {
        const headers = payload.message.headers || {};
        const eventId =
            headers.eventId?.toString() ||
            payload.message.key?.toString() ||
            `${payload.topic}-${payload.partition}-${payload.message.offset}`;
        return eventId;
    }

    /**
     * Extract event type from message headers
     */
    protected extractEventType(payload: EachMessagePayload): string {
        const headers = payload.message.headers || {};
        return headers.eventType?.toString() || 'unknown';
    }

    /**
     * Parse message value as JSON
     */
    protected parseMessage<T>(payload: EachMessagePayload): T {
        const value = payload.message.value?.toString() || '{}';
        return JSON.parse(value);
    }

    /**
     * Extract all headers as key-value pairs
     */
    protected extractHeaders(payload: EachMessagePayload): Record<string, string> {
        const headers = payload.message.headers || {};
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
            result[key] = value?.toString() || '';
        }
        return result;
    }
}
