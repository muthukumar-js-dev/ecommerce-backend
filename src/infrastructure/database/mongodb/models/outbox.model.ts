import mongoose, { Schema, Document } from 'mongoose';

export interface IOutboxEvent extends Document {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    payload: any;
    topic: string;
    published: boolean;
    publishedAt?: Date;
    createdAt: Date;
    retryCount: number;
    lastError?: string;
}

const outboxSchema = new Schema<IOutboxEvent>(
    {
        eventId: { type: String, required: true, unique: true, index: true },
        eventType: { type: String, required: true, index: true },
        aggregateId: { type: String, required: true, index: true },
        aggregateType: { type: String, required: true },
        payload: { type: Schema.Types.Mixed, required: true },
        topic: { type: String, required: true },
        published: { type: Boolean, default: false, index: true },
        publishedAt: { type: Date },
        retryCount: { type: Number, default: 0 },
        lastError: { type: String },
    },
    {
        timestamps: true,
        collection: 'outbox_events',
    }
);

// Compound index for efficient polling of unpublished events
outboxSchema.index({ published: 1, createdAt: 1 });

// Index for cleanup queries
outboxSchema.index({ published: 1, publishedAt: 1 });

// Index for monitoring retry counts
outboxSchema.index({ retryCount: 1, published: 1 });

export const OutboxModel = mongoose.model<IOutboxEvent>('OutboxEvent', outboxSchema);
