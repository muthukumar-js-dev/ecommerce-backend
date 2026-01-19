import { OutboxModel, IOutboxEvent } from '../models/outbox.model';
import { DomainEvent } from '../../../../shared/domain/domain-event';
import { KafkaTopic } from '../../../messaging/kafka/topics';
import { ClientSession } from 'mongoose';

export class OutboxRepository {
    /**
     * Save a domain event to the outbox table
     * Must be called within a transaction
     */
    async save(
        event: DomainEvent<any>,
        topic: KafkaTopic,
        session?: ClientSession
    ): Promise<void> {
        await OutboxModel.create(
            [
                {
                    eventId: event.eventId,
                    eventType: event.eventName,
                    aggregateId: this.extractAggregateId(event),
                    aggregateType: this.extractAggregateType(event),
                    payload: event.payload,
                    topic,
                    published: false,
                    retryCount: 0,
                },
            ],
            { session }
        );
    }

    /**
     * Find unpublished events for processing
     */
    async findUnpublished(limit: number = 100): Promise<IOutboxEvent[]> {
        return OutboxModel.find({ published: false })
            .sort({ createdAt: 1 }) // FIFO order
            .limit(limit)
            .exec();
    }

    /**
     * Mark an event as successfully published
     */
    async markPublished(eventId: string): Promise<void> {
        await OutboxModel.updateOne(
            { eventId },
            {
                $set: {
                    published: true,
                    publishedAt: new Date(),
                },
            }
        );
    }

    /**
     * Increment retry count and record error
     */
    async incrementRetry(eventId: string, error: string): Promise<void> {
        await OutboxModel.updateOne(
            { eventId },
            {
                $inc: { retryCount: 1 },
                $set: { lastError: error },
            }
        );
    }

    /**
     * Get events that exceeded retry limit
     */
    async findFailedEvents(maxRetries: number = 5): Promise<IOutboxEvent[]> {
        return OutboxModel.find({
            published: false,
            retryCount: { $gte: maxRetries },
        }).exec();
    }

    /**
     * Delete old published events (cleanup)
     */
    async deleteOldEvents(daysOld: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await OutboxModel.deleteMany({
            published: true,
            publishedAt: { $lt: cutoffDate },
        });

        return result.deletedCount || 0;
    }

    /**
     * Get statistics for monitoring
     */
    async getStats(): Promise<{
        unpublished: number;
        published: number;
        failed: number;
        oldestUnpublished?: Date;
    }> {
        const [unpublished, published, failed, oldest] = await Promise.all([
            OutboxModel.countDocuments({ published: false }),
            OutboxModel.countDocuments({ published: true }),
            OutboxModel.countDocuments({ published: false, retryCount: { $gte: 5 } }),
            OutboxModel.findOne({ published: false }).sort({ createdAt: 1 }).select('createdAt'),
        ]);

        return {
            unpublished,
            published,
            failed,
            oldestUnpublished: oldest?.createdAt,
        };
    }

    /**
     * Extract aggregate ID from event payload
     */
    private extractAggregateId(event: DomainEvent<any>): string {
        const payload = event.payload;
        return (
            payload.userId ||
            payload.orderId ||
            payload.productId ||
            payload.paymentId ||
            payload.id ||
            'unknown'
        );
    }

    /**
     * Extract aggregate type from event name
     */
    private extractAggregateType(event: DomainEvent<any>): string {
        const eventName = event.eventName;
        if (eventName.includes('User')) {return 'User';}
        if (eventName.includes('Order')) {return 'Order';}
        if (eventName.includes('Product')) {return 'Product';}
        if (eventName.includes('Payment')) {return 'Payment';}
        return 'Unknown';
    }
}
