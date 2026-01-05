import { EventBus } from '@infrastructure/events/event-bus';
import { EventHandler } from '@infrastructure/events/event-handler.interface';
import { DomainEvent } from '@shared/domain/domain-event';

class TestEvent extends DomainEvent<any> {
    constructor(payload: any) {
        super('TestEvent', payload, 1);
    }
}

describe('EventBus Integration', () => {
    let eventBus: EventBus;
    let mockHandler: jest.Mocked<EventHandler<TestEvent>>;

    beforeEach(() => {
        eventBus = new EventBus(); // No store for basic bus test
        mockHandler = {
            handle: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('should publish event to subscribed handlers', async () => {
        eventBus.subscribe('TestEvent', mockHandler);

        const event = new TestEvent({ data: 'test' });
        await eventBus.publish(event);

        expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should handle multiple handlers', async () => {
        const handler2 = { handle: jest.fn().mockResolvedValue(undefined) };

        eventBus.subscribe('TestEvent', mockHandler);
        eventBus.subscribe('TestEvent', handler2);

        const event = new TestEvent({ data: 'test' });
        await eventBus.publish(event);

        expect(mockHandler.handle).toHaveBeenCalled();
        expect(handler2.handle).toHaveBeenCalled();
    });

    it('should not fail if one handler fails', async () => {
        mockHandler.handle.mockRejectedValue(new Error('Handler error'));
        eventBus.subscribe('TestEvent', mockHandler);

        const event = new TestEvent({ data: 'test' });

        // Should resolve without throwing
        await expect(eventBus.publish(event)).resolves.not.toThrow();
    });
});
