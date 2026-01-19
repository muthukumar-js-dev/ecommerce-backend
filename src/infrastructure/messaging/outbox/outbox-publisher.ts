import { OutboxRepository } from '../../database/mongodb/repositories/outbox.repository';
import { KafkaProducer } from '../kafka/kafka-producer';
import { KafkaTopic } from '../kafka/topics';
import { metadataToHeaders } from '../kafka/event-metadata';

export interface OutboxPublisherConfig {
    pollingIntervalMs?: number;
    batchSize?: number;
    maxRetries?: number;
}

export class OutboxPublisher {
    private isRunning: boolean = false;
    private pollingIntervalMs: number;
    private batchSize: number;
    private maxRetries: number;
    private pollTimeout: NodeJS.Timeout | null = null;

    constructor(
        private outboxRepository: OutboxRepository,
        private kafkaProducer: KafkaProducer,
        config?: OutboxPublisherConfig
    ) {
        this.pollingIntervalMs = config?.pollingIntervalMs || 1000; // 1 second
        this.batchSize = config?.batchSize || 100;
        this.maxRetries = config?.maxRetries || 5;
    }

    /**
     * Start the outbox publisher
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('⚠ Outbox publisher already running');
            return;
        }

        this.isRunning = true;
        console.log('✓ Starting outbox publisher...');
        console.log(`  - Polling interval: ${this.pollingIntervalMs}ms`);
        console.log(`  - Batch size: ${this.batchSize}`);
        console.log(`  - Max retries: ${this.maxRetries}`);

        await this.kafkaProducer.connect();
        this.poll();
    }

    /**
     * Stop the outbox publisher
     */
    async stop(): Promise<void> {
        this.isRunning = false;

        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }

        await this.kafkaProducer.disconnect();
        console.log('✓ Outbox publisher stopped');
    }

    /**
     * Poll for unpublished events
     */
    private poll(): void {
        if (!this.isRunning) { return; }

        this.pollTimeout = setTimeout(() => {
            if (!this.isRunning) { return; } // Double check inside timeout

            void (async () => {
                try {
                    await this.publishPendingEvents();
                } catch (error) {
                    console.error('❌ Error in outbox publisher:', error);
                }

                // Continue polling
                if (this.isRunning) {
                    this.poll();
                }
            })();
        }, this.pollingIntervalMs);
    }

    /**
     * Publish pending events from outbox
     */
    private async publishPendingEvents(): Promise<void> {
        const events = await this.outboxRepository.findUnpublished(this.batchSize);

        if (events.length === 0) {
            return;
        }

        console.log(`📤 Publishing ${events.length} events from outbox`);

        let published = 0;
        let failed = 0;

        for (const event of events) {
            try {
                // Create metadata for headers
                const metadata = {
                    eventId: event.eventId,
                    eventType: event.eventType,
                    aggregateId: event.aggregateId,
                    aggregateType: event.aggregateType,
                    timestamp: new Date().toISOString(),
                    version: 1,
                };

                const headers = metadataToHeaders(metadata);

                // Publish to Kafka
                await this.kafkaProducer.send(
                    event.topic as KafkaTopic,
                    event.aggregateId,
                    event.payload,
                    headers
                );

                // Mark as published
                await this.outboxRepository.markPublished(event.eventId);
                published++;

                console.log(`  ✓ Published: ${event.eventType} (${event.eventId})`);
            } catch (error: any) {
                failed++;
                console.error(`  ✗ Failed: ${event.eventType} (${event.eventId}):`, error.message);

                // Increment retry count
                await this.outboxRepository.incrementRetry(event.eventId, error.message);

                // Move to DLQ if exceeded max retries
                if (event.retryCount >= this.maxRetries) {
                    console.error(`  ⚠ Event ${event.eventId} exceeded retry limit, moving to DLQ`);
                    await this.moveToDeadLetterQueue(event);
                }
            }
        }

        if (published > 0 || failed > 0) {
            console.log(`📊 Batch complete: ${published} published, ${failed} failed`);
        }
    }

    /**
     * Move failed event to dead letter queue
     */
    private async moveToDeadLetterQueue(event: any): Promise<void> {
        try {
            await this.kafkaProducer.send(
                KafkaTopic.DLQ_EVENTS,
                event.eventId,
                {
                    originalTopic: event.topic,
                    originalEvent: event.payload,
                    error: event.lastError,
                    retryCount: event.retryCount,
                    failedAt: new Date().toISOString(),
                },
                {
                    eventId: event.eventId,
                    eventType: event.eventType,
                    originalTopic: event.topic,
                }
            );

            // Mark as published (moved to DLQ)
            await this.outboxRepository.markPublished(event.eventId);
            console.log(`  ✓ Moved to DLQ: ${event.eventId}`);
        } catch (error: any) {
            console.error(`  ✗ Failed to move to DLQ: ${event.eventId}:`, error.message);
        }
    }

    /**
     * Get publisher statistics
     */
    async getStats(): Promise<{
        isRunning: boolean;
        outboxStats: any;
    }> {
        const outboxStats = await this.outboxRepository.getStats();

        return {
            isRunning: this.isRunning,
            outboxStats,
        };
    }
}
