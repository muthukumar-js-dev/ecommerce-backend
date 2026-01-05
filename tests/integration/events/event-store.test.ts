import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoDBEventStore } from '@infrastructure/events/mongodb-event-store';
import { DomainEvent } from '@shared/domain/domain-event';

class TestEvent extends DomainEvent<any> {
    constructor(payload: any) {
        super('TestEvent', payload, 1);
    }
}

describe('MongoDBEventStore Integration', () => {
    let mongoServer: MongoMemoryServer;
    let eventStore: MongoDBEventStore;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
        eventStore = new MongoDBEventStore();
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        await mongoose.connection.collection('domain_events').deleteMany({});
    });

    it('should save and retrieve an event', async () => {
        const event = new TestEvent({ foo: 'bar' });

        await eventStore.save(event);

        const retrieved = await eventStore.getByEventName('TestEvent');
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].eventId).toBe(event.eventId);
        expect(retrieved[0].payload).toEqual(event.payload);
    });

    it('should retrieve events by aggregateId', async () => {
        // Mock event with aggregateId in payload logic (event-store implementation specific)
        const payloadWithId = { userId: 'user-123', data: 'test' };
        const event = new TestEvent(payloadWithId);

        await eventStore.save(event);

        const retrieved = await eventStore.getByAggregateId('user-123');
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].eventId).toBe(event.eventId);
    });
});
