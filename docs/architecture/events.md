# Event-Driven Architecture

## Overview

Our e-commerce backend uses event-driven architecture to achieve loose coupling between components, enable asynchronous processing, and maintain an audit trail of all state changes.

## Core Concepts

### Domain Events

Domain events represent **something that happened** in the domain that domain experts care about.

**Characteristics:**
- Named in past tense (OrderPlaced, UserRegistered)
- Immutable once created
- Contain all data needed by subscribers
- Published after state change is persisted
- Can have multiple handlers

### Event Bus

The event bus is the central nervous system that routes events to handlers.

**Responsibilities:**
- Publish events
- Subscribe handlers
- Route events to appropriate handlers
- Ensure at-least-once delivery
- Handle failures and retries

### Event Store

The event store persists all domain events for audit trail and potential event sourcing.

**Benefits:**
- Complete audit trail
- Debugging and troubleshooting
- Event replay capability
- Analytics and reporting

## Architecture

```
┌──────────────┐
│  Aggregate   │
│              │
│ 1. Execute   │
│    Business  │
│    Logic     │
│              │
│ 2. Raise     │
│    Domain    │
│    Event     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Repository   │
│              │
│ 3. Persist   │
│    Aggregate │
│              │
│ 4. Publish   │
│    Events    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Event Bus   │
│              │
│ 5. Store     │
│    Event     │
│              │
│ 6. Route to  │
│    Handlers  │
└──────┬───────┘
       │
       ├─────────────┬─────────────┬─────────────┐
       ▼             ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│  Handler 1 │ │  Handler 2 │ │  Handler 3 │ │  Handler N │
│            │ │            │ │            │ │            │
│ Update     │ │ Send       │ │ Update     │ │ Process    │
│ Read Model │ │ Email      │ │ Aggregate  │ │ Business   │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

## Implementation

### 1. Defining Domain Events

```typescript
// src/domain/order/events/order-placed.event.ts
export class OrderPlaced extends DomainEvent {
  constructor(
    public readonly payload: {
      orderId: string;
      orderNumber: string;
      userId: string;
      userName: string;
      items: OrderItemDTO[];
      totalAmount: number;
      itemCount: number;
      placedAt: Date;
    }
  ) {
    super('OrderPlaced', payload.orderId);
  }
}
```

### 2. Raising Events in Aggregates

```typescript
// src/domain/order/aggregates/order.aggregate.ts
export class Order extends AggregateRoot<OrderProps> {
  static create(
    userId: ID,
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    id: ID
  ): Order {
    const order = new Order({...props}, id);
    
    // Raise domain event
    order.addDomainEvent(
      new OrderPlaced({
        orderId: id,
        orderNumber: order.orderNumber.value,
        userId,
        items: items.map(i => i.toDTO()),
        totalAmount: order.totalAmount.amount,
        itemCount: items.length,
        placedAt: new Date()
      })
    );
    
    return order;
  }
}
```

### 3. Publishing Events

```typescript
// src/infrastructure/database/mongodb/repositories/order.repository.ts
export class OrderRepository implements IOrderRepository {
  async save(order: Order): Promise<void> {
    // 1. Persist aggregate
    await OrderModel.create(this.toModel(order));
    
    // 2. Publish domain events
    for (const event of order.domainEvents) {
      await this.eventBus.publish(event);
    }
    
    // 3. Clear events from aggregate
    order.clearDomainEvents();
  }
}
```

### 4. Creating Event Handlers

```typescript
// src/infrastructure/events/handlers/order-placed.handler.ts
export class UpdateOrderReadModelHandler implements EventHandler<OrderPlaced> {
  constructor(
    private orderReadRepository: IOrderReadRepository
  ) {}

  async handle(event: OrderPlaced): Promise<void> {
    await this.orderReadRepository.create({
      id: event.payload.orderId,
      orderNumber: event.payload.orderNumber,
      userId: event.payload.userId,
      userName: event.payload.userName,
      items: event.payload.items,
      total: event.payload.totalAmount,
      status: 'PENDING',
      placedAt: event.payload.placedAt,
      updatedAt: new Date()
    });
  }
}

export class SendOrderConfirmationHandler implements EventHandler<OrderPlaced> {
  constructor(
    private emailService: IEmailService
  ) {}

  async handle(event: OrderPlaced): Promise<void> {
    await this.emailService.send({
      to: event.payload.userEmail,
      subject: 'Order Confirmation',
      body: `Your order ${event.payload.orderNumber} has been placed.`
    });
  }
}
```

### 5. Registering Event Handlers

```typescript
// src/infrastructure/events/event-bus.ts
eventBus.subscribe('OrderPlaced', new UpdateOrderReadModelHandler(orderReadRepo));
eventBus.subscribe('OrderPlaced', new SendOrderConfirmationHandler(emailService));
eventBus.subscribe('OrderPlaced', new ReserveInventoryHandler(productRepo));
```

## Event Patterns

### 1. Event Notification

Simple notification that something happened. Handlers react independently.

```typescript
// OrderPlaced → Multiple independent handlers
eventBus.subscribe('OrderPlaced', updateReadModelHandler);
eventBus.subscribe('OrderPlaced', sendEmailHandler);
eventBus.subscribe('OrderPlaced', updateAnalyticsHandler);
```

### 2. Event-Carried State Transfer

Event contains all data needed by handlers (no need to query).

```typescript
export class OrderPlaced extends DomainEvent {
  constructor(
    public readonly payload: {
      orderId: string;
      orderNumber: string;
      userId: string;
      userName: string,      // Carried state
      userEmail: string,     // Carried state
      items: OrderItemDTO[], // Carried state
      totalAmount: number
    }
  ) {
    super('OrderPlaced', payload.orderId);
  }
}
```

### 3. Event Sourcing (Partial)

We store events for audit trail but don't rebuild state from events (yet).

```typescript
// Event store keeps history
await eventStore.append(event);

// Can query event history
const events = await eventStore.getEvents(orderId);
```

## Error Handling

### Retry Strategy

```typescript
export class EventBus {
  async publish(event: DomainEvent): Promise<void> {
    // Store event first
    await this.eventStore.append(event);
    
    // Get handlers
    const handlers = this.getHandlers(event.eventName);
    
    // Execute handlers with retry
    for (const handler of handlers) {
      await this.executeWithRetry(handler, event);
    }
  }
  
  private async executeWithRetry(
    handler: EventHandler,
    event: DomainEvent,
    maxAttempts = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await handler.handle(event);
        return; // Success
      } catch (error) {
        if (attempt === maxAttempts) {
          // Log failure, send to dead letter queue
          await this.handleFailure(handler, event, error);
        }
        // Wait before retry
        await this.delay(attempt * 1000);
      }
    }
  }
}
```

### Dead Letter Queue

```typescript
async handleFailure(
  handler: EventHandler,
  event: DomainEvent,
  error: Error
): Promise<void> {
  await this.deadLetterQueue.add({
    handlerName: handler.constructor.name,
    event,
    error: error.message,
    timestamp: new Date()
  });
  
  // Alert monitoring system
  this.logger.error('Event handler failed', {
    handler: handler.constructor.name,
    event: event.eventName,
    error
  });
}
```

## Event Versioning

### Strategy: Upcasting

```typescript
// V1 Event
export class OrderPlacedV1 extends DomainEvent {
  constructor(
    public readonly payload: {
      orderId: string;
      totalAmount: number;
    }
  ) {
    super('OrderPlaced', payload.orderId, 1); // version
  }
}

// V2 Event (added more fields)
export class OrderPlacedV2 extends DomainEvent {
  constructor(
    public readonly payload: {
      orderId: string;
      orderNumber: string; // NEW
      userId: string;      // NEW
      totalAmount: number;
    }
  ) {
    super('OrderPlaced', payload.orderId, 2); // version
  }
}

// Upcaster
export class OrderPlacedUpcaster {
  upcast(event: any): OrderPlacedV2 {
    if (event.version === 1) {
      return new OrderPlacedV2({
        ...event.payload,
        orderNumber: 'MIGRATED',
        userId: 'UNKNOWN'
      });
    }
    return event;
  }
}
```

## Best Practices

### 1. Event Naming
- Use past tense (OrderPlaced, not PlaceOrder)
- Be specific (OrderShipped, not OrderUpdated)
- Include context (UserRegistered, not Registered)

### 2. Event Payload
- Include all data handlers need
- Don't include sensitive data
- Keep events immutable
- Version events from the start

### 3. Event Handlers
- Keep handlers idempotent
- Handle failures gracefully
- Don't throw exceptions
- Log all actions

### 4. Event Ordering
- Don't rely on event order
- Use timestamps if needed
- Handle out-of-order events

### 5. Performance
- Process events asynchronously
- Batch event processing if possible
- Monitor handler performance
- Scale handlers independently

## Monitoring

### Metrics to Track
- Events published per second
- Event processing latency
- Handler failure rate
- Dead letter queue size
- Event store size

### Alerts
- Handler failures
- Processing lag > threshold
- Dead letter queue growing
- Event store issues

## Benefits

### Loose Coupling
- Aggregates don't know about handlers
- Easy to add new handlers
- Easy to remove handlers
- No direct dependencies

### Scalability
- Async processing
- Independent scaling
- Event replay capability
- Load distribution

### Audit Trail
- Complete history
- Debugging capability
- Compliance requirements
- Analytics

## Trade-offs

### Complexity
- More moving parts
- Eventual consistency
- Error handling complexity
- Monitoring requirements

### Debugging
- Harder to trace flow
- Async makes debugging harder
- Need good logging
- Need event visualization

## Related Documentation

- [CQRS Implementation](./cqrs.md)
- [Domain Events Catalog](../events/event-catalog.md)
- [Saga Pattern](../patterns/saga.md)
