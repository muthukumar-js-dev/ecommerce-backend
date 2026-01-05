import { ProcessedEventModel } from '../models/processed-event.model';

export interface ProcessedEvent {
    eventId: string;
    eventType: string;
    processedAt: Date;
    handler: string;
}

/**
 * Repository for tracking processed events
 * Ensures idempotent event processing
 */
export class ProcessedEventRepository {
    /**
     * Save a processed event
     */
    async save(event: ProcessedEvent): Promise<void> {
        try {
            await ProcessedEventModel.create(event);
        } catch (error: any) {
            // Ignore duplicate key errors (event already processed)
            if (error.code !== 11000) {
                throw error;
            }
        }
    }

    /**
     * Check if an event has been processed
     */
    async exists(eventId: string): Promise<boolean> {
        const count = await ProcessedEventModel.countDocuments({ eventId });
        return count > 0;
    }

    /**
     * Delete old processed events (manual cleanup if needed)
     * Note: TTL index handles automatic cleanup after 30 days
     */
    async deleteOldEvents(daysOld: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await ProcessedEventModel.deleteMany({
            createdAt: { $lt: cutoffDate },
        });

        return result.deletedCount || 0;
    }

    /**
     * Get statistics about processed events
     */
    async getStats(): Promise<{
        total: number;
        byType: Record<string, number>;
        byHandler: Record<string, number>;
    }> {
        const total = await ProcessedEventModel.countDocuments();

        const byType = await ProcessedEventModel.aggregate([
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
        ]);

        const byHandler = await ProcessedEventModel.aggregate([
            { $group: { _id: '$handler', count: { $sum: 1 } } },
        ]);

        return {
            total,
            byType: Object.fromEntries(byType.map((item) => [item._id, item.count])),
            byHandler: Object.fromEntries(byHandler.map((item) => [item._id, item.count])),
        };
    }
}
