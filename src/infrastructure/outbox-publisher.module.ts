import { OutboxPublisher } from './messaging/outbox/outbox-publisher';
import { OutboxRepository } from './database/mongodb/repositories/outbox.repository';
import { KafkaProducer } from './messaging/kafka/kafka-producer';
import { getKafkaInstance } from './messaging/kafka/kafka.config';

/**
 * Outbox Publisher Module
 * Manages the lifecycle of the outbox publisher background worker
 */
export class OutboxPublisherModule {
    private publisher: OutboxPublisher | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;

    /**
     * Initialize and start the outbox publisher
     */
    async start(): Promise<void> {
        console.log('🚀 Starting Outbox Publisher Module...');

        // Initialize components
        const outboxRepository = new OutboxRepository();
        const kafka = getKafkaInstance();
        const kafkaProducer = new KafkaProducer(kafka);

        // Create publisher with configuration
        this.publisher = new OutboxPublisher(outboxRepository, kafkaProducer, {
            pollingIntervalMs: parseInt(process.env.OUTBOX_POLLING_INTERVAL_MS || '1000'),
            batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '100'),
            maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '5'),
        });

        // Start publisher
        await this.publisher.start();

        // Setup periodic cleanup of old events (daily)
        this.cleanupInterval = setInterval(() => {
            void (async () => {
                try {
                    const daysOld = parseInt(process.env.OUTBOX_CLEANUP_DAYS || '30');
                    const deleted = await outboxRepository.deleteOldEvents(daysOld);
                    if (deleted > 0) {
                        console.log(`🧹 Cleaned up ${deleted} old outbox events`);
                    }
                } catch (error) {
                    console.error('❌ Error cleaning up outbox events:', error);
                }
            })();
        }, 24 * 60 * 60 * 1000); // 24 hours

        console.log('✅ Outbox Publisher Module started successfully');
    }

    /**
     * Stop the outbox publisher gracefully
     */
    async stop(): Promise<void> {
        console.log('🛑 Stopping Outbox Publisher Module...');

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        if (this.publisher) {
            await this.publisher.stop();
            this.publisher = null;
        }

        console.log('✅ Outbox Publisher Module stopped');
    }

    /**
     * Get publisher statistics
     */
    async getStats(): Promise<any> {
        if (!this.publisher) {
            return { error: 'Publisher not initialized' };
        }

        return this.publisher.getStats();
    }
}

// Singleton instance
let outboxPublisherModule: OutboxPublisherModule | null = null;

/**
 * Get the singleton instance of OutboxPublisherModule
 */
export function getOutboxPublisherModule(): OutboxPublisherModule {
    if (!outboxPublisherModule) {
        outboxPublisherModule = new OutboxPublisherModule();
    }
    return outboxPublisherModule;
}

/**
 * Initialize outbox publisher on application startup
 */
export async function initializeOutboxPublisher(): Promise<void> {
    const module = getOutboxPublisherModule();
    await module.start();

    // Graceful shutdown
    process.on('SIGTERM', () => {
        void (async () => {
            await module.stop();
        })();
    });

    process.on('SIGINT', () => {
        void (async () => {
            await module.stop();
            process.exit(0);
        })();
    });
}
