# Phase 2 - Task 6: Implement Domain Events Infrastructure

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Tasks 2, 3, 4 (Domain Layers with Events)

---

## Objective

Build a robust event infrastructure including an event bus, event store, event handlers, and event versioning to enable event-driven architecture and eventual consistency.

---

## Context

Domain events are the foundation for:
- Decoupling bounded contexts
- Eventual consistency
- Audit trails
- Integration with external systems
- CQRS read model updates

---

## Implementation Steps

### Step 1: Create Event Bus

**Create `src/infrastructure/events/event-bus.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { EventHandler } from './event-handler.interface';

export class EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();
  private eventStore?: IEventStore;

  constructor(eventStore?: IEventStore) {
    this.eventStore = eventStore;
  }

  subscribe<T extends DomainEvent<any>>(
    eventName: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  async publish<T extends DomainEvent<any>>(event: T): Promise<void> {
    // Store event
    if (this.eventStore) {
      await this.eventStore.save(event);
    }

    // Publish to handlers
    const handlers = this.handlers.get(event.eventName) || [];
    
    const promises = handlers.map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Error handling event ${event.eventName}:`, error);
        // In production, implement retry logic and dead letter queue
      }
    });

    await Promise.all(promises);
  }

  async publishAll(events: DomainEvent<any>[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
```

**Create `src/infrastructure/events/event-handler.interface.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';

export interface EventHandler<T extends DomainEvent<any>> {
  handle(event: T): Promise<void>;
}
```

### Step 2: Create Event Store

**Create `src/infrastructure/events/event-store.interface.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface IEventStore {
  save(event: DomainEvent<any>): Promise<void>;
  getByAggregateId(aggregateId: ID): Promise<DomainEvent<any>[]>;
  getByEventName(eventName: string, limit?: number): Promise<DomainEvent<any>[]>;
  getAllEvents(offset?: number, limit?: number): Promise<DomainEvent<any>[]>;
  replay(fromEventId?: ID): Promise<void>;
}
```

**Create `src/infrastructure/events/mongodb-event-store.ts`:**

```typescript
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

  async replay(fromEventId?: ID): Promise<void> {
    // Implementation for event replay
    // This would re-publish events to rebuild read models
    console.log('Event replay not yet implemented');
  }

  private extractAggregateId(event: DomainEvent<any>): string | undefined {
    // Try to extract aggregate ID from common payload fields
    const payload = event.payload as any;
    return payload.userId || payload.productId || payload.orderId || payload.id;
  }

  private toDomainEvent(doc: IEventDocument): DomainEvent<any> {
    // Reconstruct domain event from stored data
    return {
      eventId: doc.eventId,
      eventName: doc.eventName,
      payload: doc.payload,
      version: doc.version,
      occurredOn: doc.occurredOn,
    } as any;
  }
}
```

### Step 3: Create Event Handlers

**Create `src/infrastructure/events/handlers/send-order-confirmation-email.handler.ts`:**

```typescript
import { EventHandler } from '../event-handler.interface';
import { OrderPlaced } from '@domain/order/events/order-placed.event';

export class SendOrderConfirmationEmailHandler implements EventHandler<OrderPlaced> {
  async handle(event: OrderPlaced): Promise<void> {
    const { orderId, orderNumber, userId, totalAmount } = event.payload;

    console.log(`Sending order confirmation email for order ${orderNumber}`);
    
    // In production, integrate with email service
    // await emailService.send({
    //   to: user.email,
    //   template: 'order-confirmation',
    //   data: { orderNumber, totalAmount }
    // });
  }
}
```

**Create `src/infrastructure/events/handlers/update-user-order-count.handler.ts`:**

```typescript
import { EventHandler } from '../event-handler.interface';
import { OrderPlaced } from '@domain/order/events/order-placed.event';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';

export class UpdateUserOrderCountHandler implements EventHandler<OrderPlaced> {
  constructor(private readonly userRepository: IUserRepository) {}

  async handle(event: OrderPlaced): Promise<void> {
    const { userId, itemCount } = event.payload;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      console.error(`User ${userId} not found`);
      return;
    }

    // Update order count
    for (let i = 0; i < itemCount; i++) {
      user.incrementOrderCount();
    }

    await this.userRepository.update(user);
    console.log(`Updated order count for user ${userId}`);
  }
}
```

**Create `src/infrastructure/events/handlers/reserve-inventory.handler.ts`:**

```typescript
import { EventHandler } from '../event-handler.interface';
import { OrderPlaced } from '@domain/order/events/order-placed.event';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';

export class ReserveInventoryHandler implements EventHandler<OrderPlaced> {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly productRepository: IProductRepository
  ) {}

  async handle(event: OrderPlaced): Promise<void> {
    const { orderId } = event.payload;

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    // Reserve inventory for each item
    for (const item of order.items) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.reserveInventory(item.quantity);
        await this.productRepository.update(product);
      }
    }

    console.log(`Reserved inventory for order ${orderId}`);
  }
}
```

### Step 4: Event Versioning

**Create `src/infrastructure/events/event-migrator.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';

export interface EventMigration {
  fromVersion: number;
  toVersion: number;
  migrate(event: any): any;
}

export class EventMigrator {
  private migrations = new Map<string, EventMigration[]>();

  registerMigration(eventName: string, migration: EventMigration): void {
    if (!this.migrations.has(eventName)) {
      this.migrations.set(eventName, []);
    }
    this.migrations.get(eventName)!.push(migration);
  }

  migrate<T extends DomainEvent<any>>(event: T, targetVersion: number): T {
    const migrations = this.migrations.get(event.eventName) || [];
    
    let currentEvent = event;
    let currentVersion = event.version;

    while (currentVersion < targetVersion) {
      const migration = migrations.find(
        (m) => m.fromVersion === currentVersion && m.toVersion === currentVersion + 1
      );

      if (!migration) {
        throw new Error(
          `No migration found from version ${currentVersion} to ${currentVersion + 1} for event ${event.eventName}`
        );
      }

      currentEvent = migration.migrate(currentEvent);
      currentVersion++;
    }

    return currentEvent;
  }
}

// Example migration
export class UserRegisteredV1ToV2Migration implements EventMigration {
  fromVersion = 1;
  toVersion = 2;

  migrate(event: any): any {
    return {
      ...event,
      version: 2,
      payload: {
        ...event.payload,
        // Add new field in v2
        registrationSource: 'web',
      },
    };
  }
}
```

### Step 5: Event Dispatcher Middleware

**Create `src/infrastructure/events/event-dispatcher.middleware.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { EventBus } from './event-bus';

export function eventDispatcherMiddleware(eventBus: EventBus) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original send
    const originalSend = res.send;

    // Override send to dispatch events after response
    res.send = function (data: any): Response {
      // Send response first
      const result = originalSend.call(this, data);

      // Dispatch events after response (fire and forget)
      if ((req as any).domainEvents && Array.isArray((req as any).domainEvents)) {
        setImmediate(async () => {
          try {
            await eventBus.publishAll((req as any).domainEvents);
          } catch (error) {
            console.error('Error dispatching events:', error);
          }
        });
      }

      return result;
    };

    next();
  };
}
```

### Step 6: Integration with Aggregates

**Update aggregate root to collect events:**

```typescript
// In controller or use case
const user = User.create(props, id);

// Collect domain events
const events = user.domainEvents;

// Save aggregate
await userRepository.save(user);

// Publish events
await eventBus.publishAll(events);

// Clear events
user.clearDomainEvents();
```

---

## Testing Requirements

**Create `tests/integration/events/event-bus.test.ts`:**

```typescript
import { EventBus } from '@infrastructure/events/event-bus';
import { EventHandler } from '@infrastructure/events/event-handler.interface';
import { UserRegistered } from '@domain/user/events/user-registered.event';

describe('EventBus', () => {
  let eventBus: EventBus;
  let mockHandler: jest.Mocked<EventHandler<UserRegistered>>;

  beforeEach(() => {
    eventBus = new EventBus();
    mockHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('should publish event to subscribed handlers', async () => {
    eventBus.subscribe('UserRegistered', mockHandler);

    const event = new UserRegistered({
      userId: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as any,
      registeredAt: new Date(),
    });

    await eventBus.publish(event);

    expect(mockHandler.handle).toHaveBeenCalledWith(event);
  });

  it('should handle multiple handlers for same event', async () => {
    const handler2 = { handle: jest.fn().mockResolvedValue(undefined) };
    
    eventBus.subscribe('UserRegistered', mockHandler);
    eventBus.subscribe('UserRegistered', handler2);

    const event = new UserRegistered({
      userId: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as any,
      registeredAt: new Date(),
    });

    await eventBus.publish(event);

    expect(mockHandler.handle).toHaveBeenCalled();
    expect(handler2.handle).toHaveBeenCalled();
  });

  it('should not fail if handler throws error', async () => {
    mockHandler.handle.mockRejectedValue(new Error('Handler error'));
    eventBus.subscribe('UserRegistered', mockHandler);

    const event = new UserRegistered({
      userId: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as any,
      registeredAt: new Date(),
    });

    await expect(eventBus.publish(event)).resolves.not.toThrow();
  });
});
```

---

## Deliverables

- [ ] Event bus implementation
- [ ] Event store (MongoDB)
- [ ] Event handlers for all domain events
- [ ] Event versioning and migration
- [ ] Event dispatcher middleware
- [ ] Integration tests
- [ ] Event catalog documentation
- [ ] Monitoring and logging

---

## Event Catalog

Document all domain events:

| Event Name | Payload | Version | Handlers |
|------------|---------|---------|----------|
| UserRegistered | userId, email, name, role | 1 | CreateWishlist, SendWelcomeEmail, UpdateReadModel |
| UserLoggedIn | userId, loginAt | 1 | UpdateLastLogin, UpdateReadModel |
| ProductCreated | productId, sku, title | 1 | UpdateReadModel, NotifySellers |
| ProductOutOfStock | productId, sku | 1 | NotifyAdmin, UpdateReadModel |
| OrderPlaced | orderId, userId, total | 1 | ReserveInventory, SendConfirmation, UpdateUserCount |
| OrderCancelled | orderId, reason | 1 | RestoreInventory, ProcessRefund, SendNotification |

---

## Next Steps

After completing this task:
1. Proceed to **Task 7: Refactor Application Layer**
2. Implement event replay for read models
3. Add event monitoring and alerting

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
