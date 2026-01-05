import { DomainEvent } from '@shared/domain/domain-event';
import { EventHandler } from './event-handler.interface';
import { IEventStore } from './event-store.interface';

export class EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();
  private eventStore?: IEventStore;

  constructor(eventStore?: IEventStore) {
    this.eventStore = eventStore;
  }

  subscribe<TEvent extends DomainEvent<any>>(
    eventName: string,
    handler: EventHandler<TEvent>
  ): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)?.push(handler);
  }

  async publish(event: DomainEvent<any>): Promise<void> {
    // 1. Store event if store is available
    if (this.eventStore) {
      try {
        await this.eventStore.save(event);
      } catch (error) {
        console.error(`Failed to save event ${event.eventName} to store:`, error);
        // We usually proceed to publish even if save fails, 
        // OR we throw to ensure data integrity. 
        // For this implementation, we log and proceed to ensure availability.
      }
    }

    // 2. Dispatch to handlers
    const handlers = this.handlers.get(event.eventName);
    if (!handlers) return;

    // Use map + Promise.allSettled (or manual try/catch) to isolate handler failures
    const promises = handlers.map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Error handling event ${event.eventName} in handler ${handler.constructor.name}:`, error);
      }
    });

    await Promise.all(promises);
  }

  async publishAll(events: readonly DomainEvent<any>[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }
}
