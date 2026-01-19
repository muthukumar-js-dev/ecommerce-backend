import mongoose, { Schema, Document } from 'mongoose';
import { IEventStore } from './event-store.interface';
import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

interface IEventDocument extends Document {
    eventId: string;
    eventName: string;
    aggregateId?: string;
    payload: any;
    version: number;
    occurredOn: Date;
    metadata?: any;
}

const eventSchema = new Schema<IEventDocument>(
    {
        eventId: { type: String, required: true, unique: true },
        eventName: { type: String, required: true, index: true },
        aggregateId: { type: String, index: true },
        payload: { type: Schema.Types.Mixed, required: true },
        version: { type: Number, required: true },
        occurredOn: { type: Date, required: true, index: true },
        metadata: { type: Schema.Types.Mixed },
    },
    {
        collection: 'domain_events',
        timestamps: true,
    }
);

const EventModel = mongoose.model<IEventDocument>('DomainEvent', eventSchema);

export class MongoDBEventStore implements IEventStore {
    async save(event: DomainEvent<any>): Promise<void> {
        await EventModel.create({
            eventId: event.eventId,
            eventName: event.eventName,
            aggregateId: this.extractAggregateId(event),
            payload: event.payload,
            version: event.version,
            occurredOn: event.occurredOn,
        });
    }

    async getByAggregateId(aggregateId: ID): Promise<DomainEvent<any>[]> {
        const docs = await EventModel.find({ aggregateId })
            .sort({ occurredOn: 1 })
            .exec();

        return docs.map((doc) => this.toDomainEvent(doc));
    }

    async getByEventName(eventName: string, limit: number = 100): Promise<DomainEvent<any>[]> {
        const docs = await EventModel.find({ eventName })
            .sort({ occurredOn: -1 })
            .limit(limit)
            .exec();

        return docs.map((doc) => this.toDomainEvent(doc));
    }

    async getAllEvents(offset: number = 0, limit: number = 100): Promise<DomainEvent<any>[]> {
        const docs = await EventModel.find()
            .sort({ occurredOn: 1 })
            .skip(offset)
            .limit(limit)
            .exec();

        return docs.map((doc) => this.toDomainEvent(doc));
    }

    replay(_fromEventId?: ID): Promise<void> {
        // Implementation for event replay would go here
        console.log('Event replay not yet implemented');
        return Promise.resolve();
    }

    private extractAggregateId(event: DomainEvent<any>): string | undefined {
        // Try to extract aggregate ID from common payload fields
        // This logic relies on consistency in payload naming conventions
        const payload = event.payload;
        return payload.userId || payload.productId || payload.orderId || payload.id;
    }

    private toDomainEvent(doc: IEventDocument): DomainEvent<any> {
        // We cast this back to DomainEvent. 
        // In a stricter system, we might want to reinstantiate specific Event classes (e.g., UserRegistered)
        // based on eventName, but for storage/retrieval purposes, generic structure works.
        return {
            eventId: doc.eventId,
            eventName: doc.eventName,
            payload: doc.payload,
            version: doc.version,
            occurredOn: doc.occurredOn,
        } as any;
    }
}
