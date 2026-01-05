# ADR 003: Event-Driven Architecture

## Status
**Accepted** - January 2024

## Context

With DDD and CQRS in place (ADR 001, 002), we needed a way to:
- Communicate between aggregates without tight coupling
- Update read models when write models change
- Maintain audit trail of all state changes
- Enable asynchronous processing
- Support future microservices architecture

Direct aggregate-to-aggregate calls would create tight coupling and violate DDD principles.

## Decision

We will implement **Event-Driven Architecture** using domain events as the primary communication mechanism between aggregates and bounded contexts.

### Implementation Details:

1. **Domain Events**
   - Raised by aggregates when state changes
   - Immutable once created
   - Named in past tense (OrderPlaced, UserRegistered)
   - Contain all data needed by subscribers

2. **Event Bus**
   - Central routing mechanism
   - Publishes events to all subscribers
   - Ensures at-least-once delivery
   - Handles retries and failures

3. **Event Store**
   - Persists all domain events
   - Provides audit trail
   - Enables event replay
   - Supports debugging and analytics

4. **Event Handlers**
   - Subscribe to specific events
   - Update read models
   - Trigger side effects (emails, notifications)
   - Coordinate sagas

## Consequences

### Positive

✅ **Loose Coupling**
- Aggregates don't know about each other
- Easy to add new event handlers
- Easy to remove handlers
- No direct dependencies

✅ **Scalability**
- Asynchronous processing
- Independent scaling of handlers
- Event replay capability
- Load distribution

✅ **Audit Trail**
- Complete history of all changes
- Debugging capability
- Compliance requirements
- Analytics and reporting

✅ **Flexibility**
- Easy to add new features (new handlers)
- Can process events in different ways
- Support for future event sourcing
- Enable microservices migration

✅ **Resilience**
- Failures isolated to handlers
- Retry mechanism
- Dead letter queue
- System continues despite handler failures

### Negative

❌ **Complexity**
- More moving parts
- Eventual consistency
- Error handling complexity
- Monitoring requirements

❌ **Debugging**
- Harder to trace flow
- Async makes debugging harder
- Need good logging
- Need event visualization tools

❌ **Operational Overhead**
- Event store to maintain
- Event processing to monitor
- Dead letter queue to handle
- Performance tuning

❌ **Consistency**
- Eventual consistency challenges
- Need to handle out-of-order events
- Idempotency required
- Compensation logic needed

## Alternatives Considered

### 1. Direct Aggregate Calls
**Pros:** Simple, synchronous, immediate consistency
**Cons:** Tight coupling, violates DDD, hard to scale
**Verdict:** ❌ Violates architectural principles

### 2. Message Queue (RabbitMQ/Kafka)
**Pros:** Proven technology, robust, scalable
**Cons:** Additional infrastructure, operational complexity, overkill for current scale
**Verdict:** ⏳ Future consideration when scale demands

### 3. Database Triggers
**Pros:** Simple, database-level, no application code
**Cons:** Database-specific, hard to test, poor maintainability
**Verdict:** ❌ Not portable, hard to maintain

## Implementation Plan

### Phase 1: Infrastructure
- [x] Create Event Bus
- [x] Create Event Store
- [x] Create base DomainEvent class
- [x] Implement publish/subscribe mechanism

### Phase 2: Domain Events
- [x] Define all domain events
- [x] Raise events from aggregates
- [x] Publish events after persistence
- [x] Create event catalog

### Phase 3: Event Handlers
- [x] Create read model update handlers
- [x] Create notification handlers
- [x] Create saga handlers
- [x] Implement retry logic

### Phase 4: Monitoring
- [x] Event processing metrics
- [x] Handler failure tracking
- [x] Dead letter queue monitoring
- [x] Performance dashboards

## Validation

### Success Criteria
- ✅ All state changes publish events
- ✅ Read models updated via events
- ✅ Event store contains all events
- ✅ Handlers are idempotent
- ✅ Retry mechanism works

### Metrics
- Events published/second: ~100
- Event processing latency: < 200ms (P95)
- Handler failure rate: < 0.1%
- Dead letter queue size: < 10 items
- Event store size: Growing as expected

## Error Handling Strategy

### Retry Policy
```typescript
// Exponential backoff with max 3 attempts
maxAttempts: 3
initialDelay: 1000ms
backoffMultiplier: 2
```

### Dead Letter Queue
- Failed events after max retries
- Manual review and reprocessing
- Alert on queue growth
- Weekly cleanup

### Idempotency
- All handlers must be idempotent
- Use event ID for deduplication
- Check before processing
- Safe to replay events

## Event Versioning Strategy

### Approach: Upcasting
```typescript
// Support multiple versions
if (event.version === 1) {
  event = upcastToV2(event);
}
```

### Guidelines
- Additive changes preferred
- Breaking changes require new version
- Support old versions during migration
- Document version changes

## Examples

### Publishing Event
```typescript
// In aggregate
this.addDomainEvent(new OrderPlaced({
  orderId: this.id,
  userId: this.userId,
  totalAmount: this.total.amount,
  placedAt: new Date()
}));

// In repository
for (const event of order.domainEvents) {
  await eventBus.publish(event);
}
```

### Handling Event
```typescript
export class UpdateOrderReadModelHandler implements EventHandler<OrderPlaced> {
  async handle(event: OrderPlaced): Promise<void> {
    await orderReadRepo.create({
      id: event.payload.orderId,
      userId: event.payload.userId,
      total: event.payload.totalAmount,
      status: 'PENDING',
      placedAt: event.payload.placedAt
    });
  }
}
```

## Monitoring

### Key Metrics
- Events published per second
- Event processing latency
- Handler success/failure rate
- Dead letter queue size
- Event store growth rate

### Alerts
- Handler failure rate > 1%
- Processing lag > 1 second
- Dead letter queue > 50 items
- Event store disk usage > 80%

## References

- [Event-Driven Architecture by Martin Fowler](https://martinfowler.com/articles/201701-event-driven.html)
- [Domain Events by Vaughn Vernon](https://vaughnvernon.com/domain-events/)
- [Event Sourcing by Greg Young](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf)

## Related ADRs

- [ADR 001: Adopt DDD](./001-adopt-ddd.md)
- [ADR 002: Implement CQRS](./002-implement-cqrs.md)
- [ADR 004: Anti-Corruption Layer](./004-anti-corruption-layer.md)
