# ADR 002: Implement CQRS (Command Query Responsibility Segregation)

## Status
**Accepted** - January 2024

## Context

After adopting DDD (ADR 001), we faced challenges with:
- Complex queries requiring joins across multiple aggregates
- Read performance degradation as data grew
- Write operations slowed by complex read model updates
- Difficulty optimizing for both reads and writes
- Conflicting requirements (strong consistency for writes, eventual consistency acceptable for reads)

## Decision

We will implement **CQRS (Command Query Responsibility Segregation)** to separate read and write models.

### Implementation Details:

1. **Command Side (Write Model)**
   - Commands represent intentions to change state
   - Processed by command handlers
   - Operate on domain aggregates
   - Enforce business rules
   - Publish domain events

2. **Query Side (Read Model)**
   - Queries request data without side effects
   - Processed by query handlers
   - Read from denormalized read models
   - Optimized for specific queries
   - Updated via event handlers

3. **Infrastructure**
   - CommandBus routes commands to handlers
   - QueryBus routes queries to handlers
   - EventBus connects write and read sides
   - Separate databases/collections for read and write

## Consequences

### Positive

✅ **Performance**
- Read models optimized for queries (denormalized)
- Write models optimized for consistency (normalized)
- Independent scaling of reads and writes
- Faster query response times

✅ **Flexibility**
- Multiple read models for different views
- Can use different databases for reads/writes
- Easy to add new query models
- Cache read models aggressively

✅ **Maintainability**
- Clear separation of concerns
- Commands and queries have single responsibility
- Easier to understand and modify
- Better testability

✅ **Scalability**
- Scale reads independently (add read replicas)
- Scale writes independently
- Distribute load effectively
- Handle high read/write ratios

### Negative

❌ **Complexity**
- More code (commands, queries, handlers, read models)
- Event handling infrastructure needed
- Eventual consistency to manage
- Learning curve for team

❌ **Consistency**
- Read models may be stale
- Need to handle consistency window
- More complex error scenarios
- Requires monitoring of lag

❌ **Operational Overhead**
- More moving parts to monitor
- Event processing to track
- Read model synchronization
- Debugging more complex

### Neutral

⚖️ **Development Time**
- Slower initially (infrastructure setup)
- Faster for new features (clear patterns)
- More code but simpler code

## Alternatives Considered

### 1. Traditional CRUD with ORMs
**Pros:** Simple, familiar, less code
**Cons:** Poor performance at scale, complex queries, tight coupling
**Verdict:** ❌ Doesn't meet performance requirements

### 2. Materialized Views (Database Level)
**Pros:** Database handles denormalization, less application code
**Cons:** Database-specific, limited flexibility, harder to test
**Verdict:** ❌ Not portable, limited control

### 3. Full Event Sourcing
**Pros:** Complete audit trail, time travel, powerful
**Cons:** Very complex, rebuild state from events, operational overhead
**Verdict:** ❌ Too complex for current needs

## Implementation Plan

### Phase 1: Infrastructure
- [x] Create CommandBus and QueryBus
- [x] Create base Command and Query classes
- [x] Create handler interfaces
- [x] Set up CQRS module

### Phase 2: Commands
- [x] Implement PlaceOrderCommand
- [x] Implement RegisterUserCommand
- [x] Implement CreateProductCommand
- [x] Add command validation

### Phase 3: Queries
- [x] Implement GetOrderHistoryQuery
- [x] Implement GetUserProfileQuery
- [x] Implement ListProductsQuery
- [x] Create read models

### Phase 4: Event Handlers
- [x] Create UpdateOrderReadModelHandler
- [x] Create UpdateUserReadModelHandler
- [x] Create UpdateProductReadModelHandler
- [x] Handle eventual consistency

## Validation

### Success Criteria
- ✅ Commands and queries separated
- ✅ Read models denormalized for performance
- ✅ Event handlers update read models
- ✅ Query response time < 100ms (P95)
- ✅ Command processing < 500ms (P95)

### Metrics
- Query P95 latency: < 100ms ✅
- Command P95 latency: < 500ms ✅
- Read model lag: < 200ms ✅
- Read/write ratio: 80/20 (as expected)

## Trade-offs Accepted

### Eventual Consistency
**Trade-off:** Read models may be slightly stale
**Mitigation:** 
- Return essential data from commands
- Client-side optimistic updates
- Monitor and alert on excessive lag

### Increased Complexity
**Trade-off:** More code and infrastructure
**Mitigation:**
- Clear patterns and conventions
- Good documentation
- Team training

### Operational Overhead
**Trade-off:** More components to monitor
**Mitigation:**
- Comprehensive monitoring
- Automated alerts
- Runbooks for common issues

## Examples

### Command Example
```typescript
// Command
const command = new PlaceOrderCommand(userId, items, addressId, paymentId);
const result = await commandBus.execute(command);

// Returns minimal data
{ orderId: 'order-123', orderNumber: 'ORD-2024-001' }
```

### Query Example
```typescript
// Query
const query = new GetOrderHistoryQuery(userId, { page: 1, limit: 10 });
const result = await queryBus.execute(query);

// Returns denormalized data
{
  orders: [{
    id: 'order-123',
    orderNumber: 'ORD-2024-001',
    total: 250.00,
    status: 'DELIVERED',
    items: [...],
    placedAt: '2024-01-01T10:00:00Z'
  }]
}
```

## References

- [CQRS by Martin Fowler](https://martinfowler.com/bliki/CQRS.html)
- [CQRS Journey by Microsoft](https://docs.microsoft.com/en-us/previous-versions/msp-n-p/jj554200(v=pandp.10))
- [Implementing CQRS by Greg Young](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf)

## Related ADRs

- [ADR 001: Adopt DDD](./001-adopt-ddd.md)
- [ADR 003: Event-Driven Architecture](./003-event-driven-architecture.md)
