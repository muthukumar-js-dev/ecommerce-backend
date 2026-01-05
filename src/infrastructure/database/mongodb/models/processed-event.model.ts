import mongoose, { Schema, Document } from 'mongoose';

/**
 * Processed Event Document
 * Tracks events that have been processed to ensure idempotency
 */
export interface IProcessedEventDocument extends Document {
    eventId: string;
    eventType: string;
    processedAt: Date;
    handler: string;
    createdAt: Date;
}

const ProcessedEventSchema = new Schema<IProcessedEventDocument>(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        eventType: {
            type: String,
            required: true,
            index: true,
        },
        processedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        handler: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
        collection: 'processed_events',
    }
);

// Compound index for efficient queries
ProcessedEventSchema.index({ eventType: 1, processedAt: -1 });

// TTL index to auto-delete old events after 30 days
ProcessedEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ProcessedEventModel = mongoose.model<IProcessedEventDocument>(
    'ProcessedEvent',
    ProcessedEventSchema
);
