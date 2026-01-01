# Phase 3: Event-Driven Adoption - Task Overview

**Phase Duration:** 20 weeks  
**Objective:** Transform the monolith into an event-driven microservices architecture using Kafka for messaging, extract key services, and implement distributed system patterns

---

## Phase 3 Goals

Transition from a domain-driven monolith to distributed microservices:
- **Kafka Integration:** Implement enterprise-grade message broker
- **Service Extraction:** Extract Payment, Notification, and Analytics services
- **Event Sourcing:** Implement event sourcing for critical aggregates
- **Distributed Patterns:** Saga, idempotency, circuit breakers
- **API Gateway:** Centralized routing, rate limiting, authentication

---

## Task Summary

### 📝 Task 1: Setup Kafka Infrastructure
- **Duration:** 4-5 days
- **Key Deliverables:**
  - Kafka cluster setup (local + production)
  - Topic design and partitioning strategy
  - Producer and consumer configuration
  - Monitoring and alerting
  - Schema registry

### 📝 Task 2: Implement Event Publishing
- **Duration:** 5-6 days
- **Key Deliverables:**
  - Kafka producer integration
  - Event serialization (Avro/JSON)
  - Transactional outbox pattern
  - Event versioning
  - Publish-subscribe patterns

### 📝 Task 3: Implement Event Consumption
- **Duration:** 5-6 days
- **Key Deliverables:**
  - Kafka consumer groups
  - Event handlers
  - Idempotent processing
  - Dead letter queues
  - Retry mechanisms

### 📝 Task 4: Extract Payment Service
- **Duration:** 6-7 days
- **Key Deliverables:**
  - Standalone payment microservice
  - Payment domain model
  - Stripe integration
  - Payment events
  - API endpoints

### 📝 Task 5: Extract Notification Service
- **Duration:** 5-6 days
- **Key Deliverables:**
  - Standalone notification microservice
  - Email/SMS integration
  - Template management
  - Notification events
  - Delivery tracking

### 📝 Task 6: Implement Saga Pattern
- **Duration:** 6-7 days
- **Key Deliverables:**
  - Saga orchestration framework
  - Compensation logic
  - Saga state management
  - Distributed transaction coordination
  - Saga monitoring

### 📝 Task 7: Implement API Gateway
- **Duration:** 5-6 days
- **Key Deliverables:**
  - API Gateway (Kong/Express Gateway)
  - Request routing
  - Rate limiting
  - Authentication/Authorization
  - Request transformation

### 📝 Task 8: Service Mesh & Discovery
- **Duration:** 4-5 days
- **Key Deliverables:**
  - Service registry (Consul/Eureka)
  - Service discovery
  - Load balancing
  - Health checks
  - Circuit breakers

### 📝 Task 9: Distributed Tracing & Monitoring
- **Duration:** 4-5 days
- **Key Deliverables:**
  - Distributed tracing (Jaeger)
  - Correlation IDs
  - Metrics collection
  - Log aggregation
  - Dashboards

### 📝 Task 10: Testing & Validation
- **Duration:** 5-6 days
- **Key Deliverables:**
  - Integration tests
  - Contract tests
  - Chaos engineering
  - Performance tests
  - Documentation

---

## Timeline

```
Week 1:     Task 1 (Kafka Setup)
Week 2-3:   Task 2 (Event Publishing)
Week 4-5:   Task 3 (Event Consumption)
Week 6-7:   Task 4 (Payment Service)
Week 8-9:   Task 5 (Notification Service)
Week 10-12: Task 6 (Saga Pattern)
Week 13-14: Task 7 (API Gateway)
Week 15-16: Task 8 (Service Mesh)
Week 17-18: Task 9 (Monitoring)
Week 19-20: Task 10 (Testing)
```

---

## Architecture Evolution

### Current State (End of Phase 2)
```
┌─────────────────────────────────────┐
│      Monolithic Application         │
│  (TypeScript + DDD + CQRS + Events) │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  Domain  │  │  Domain  │        │
│  │  Events  │  │  Models  │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────────────────┐          │
│  │   MongoDB (Single)   │          │
│  └──────────────────────┘          │
└─────────────────────────────────────┘
```

### Target State (End of Phase 3)
```
┌──────────────────────────────────────────────┐
│             API Gateway                      │
│  (Kong - Rate Limit, Auth, Routing)         │
└──────┬────────────────────────────┬──────────┘
       │                            │
   ┌───▼────┐                  ┌───▼────┐
   │  Core  │                  │Payment │
   │Service │                  │Service │
   └───┬────┘                  └───┬────┘
       │                            │
       └──────────┬─────────────────┘
                  │
            ┌─────▼──────┐
            │   Kafka    │
            │  Cluster   │
            └─────┬──────┘
                  │
       ┌──────────┴──────────┐
       │                     │
   ┌───▼────┐          ┌────▼──────┐
   │Notific-│          │ Analytics │
   │ation   │          │  Service  │
   │Service │          └───────────┘
   └────────┘
```

---

## Kafka Architecture

### Topics Design

```
user.events
├── user.registered (partition by userId)
├── user.updated
└── user.deleted

order.events
├── order.placed (partition by orderId)
├── order.confirmed
├── order.shipped
├── order.delivered
└── order.cancelled

payment.events
├── payment.initiated (partition by paymentId)
├── payment.succeeded
├── payment.failed
└── refund.completed

notification.events
├── email.requested
├── email.sent
└── email.failed
```

### Partitioning Strategy

- **User Events:** 10 partitions (by userId hash)
- **Order Events:** 20 partitions (by orderId hash)
- **Payment Events:** 10 partitions (by paymentId hash)
- **Notification Events:** 5 partitions (round-robin)

### Replication Factor

- **Production:** 3 (for high availability)
- **Development:** 1 (single broker)

---

## Service Extraction Strategy

### Phase 3A: Extract Stateless Services
1. **Notification Service** (Week 8-9)
   - No database
   - Pure event consumer
   - Easy to extract

2. **Analytics Service** (Future)
   - Read-only
   - Separate database
   - No dependencies

### Phase 3B: Extract Stateful Services
3. **Payment Service** (Week 6-7)
   - Own database
   - Stripe integration
   - Critical business logic

### Phase 3C: Keep in Monolith (For Now)
- User Service
- Product Service
- Order Service
- Cart Service

**Rationale:** Core services are tightly coupled and require more planning for extraction (Phase 4+)

---

## Event-Driven Patterns

### 1. Transactional Outbox Pattern

```typescript
// Atomic write to DB + outbox table
async function placeOrder(order: Order): Promise<void> {
  const session = await startTransaction();
  
  try {
    // 1. Save order to database
    await orderRepository.save(order, session);
    
    // 2. Save events to outbox table
    for (const event of order.domainEvents) {
      await outboxRepository.save({
        eventId: event.eventId,
        eventType: event.eventName,
        payload: JSON.stringify(event.payload),
        createdAt: new Date(),
        published: false,
      }, session);
    }
    
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
}

// Background worker publishes events from outbox
setInterval(async () => {
  const unpublishedEvents = await outboxRepository.findUnpublished();
  
  for (const event of unpublishedEvents) {
    await kafkaProducer.send({
      topic: 'order.events',
      messages: [{ value: event.payload }],
    });
    
    await outboxRepository.markPublished(event.id);
  }
}, 1000);
```

### 2. Idempotent Consumer Pattern

```typescript
class IdempotentEventHandler {
  async handle(event: DomainEvent): Promise<void> {
    // Check if already processed
    const exists = await processedEventsRepo.exists(event.eventId);
    if (exists) {
      console.log(`Event ${event.eventId} already processed`);
      return;
    }
    
    // Process event
    await this.processEvent(event);
    
    // Mark as processed
    await processedEventsRepo.save({
      eventId: event.eventId,
      processedAt: new Date(),
    });
  }
}
```

### 3. Saga Pattern

```typescript
class OrderPlacementSaga {
  async execute(orderId: string): Promise<void> {
    const saga = await sagaRepository.create({
      sagaId: generateId(),
      type: 'ORDER_PLACEMENT',
      orderId,
      status: 'STARTED',
      steps: [],
    });
    
    try {
      // Step 1: Reserve inventory
      await this.reserveInventory(saga);
      
      // Step 2: Process payment
      await this.processPayment(saga);
      
      // Step 3: Confirm order
      await this.confirmOrder(saga);
      
      await sagaRepository.complete(saga.sagaId);
    } catch (error) {
      // Compensate in reverse order
      await this.compensate(saga);
      await sagaRepository.fail(saga.sagaId, error);
    }
  }
  
  private async compensate(saga: Saga): Promise<void> {
    for (const step of saga.steps.reverse()) {
      await step.compensate();
    }
  }
}
```

---

## Success Criteria

### Technical Metrics
- [ ] Kafka cluster operational (99.9% uptime)
- [ ] Event publishing < 50ms (P95)
- [ ] Event processing < 500ms (P95)
- [ ] Zero message loss
- [ ] Idempotent processing verified

### Service Metrics
- [ ] Payment service extracted and operational
- [ ] Notification service extracted and operational
- [ ] Services can scale independently
- [ ] Circuit breakers functioning
- [ ] Distributed tracing working

### Performance Metrics
- [ ] System handles 10x current load
- [ ] API Gateway latency < 10ms
- [ ] Service-to-service latency < 50ms
- [ ] Event lag < 1 second

### Reliability Metrics
- [ ] Saga compensation working
- [ ] Dead letter queue processing
- [ ] Automatic retries functioning
- [ ] No data loss during failures

---

## Risk Management

### High Risk Items

1. **Message Loss**
   - **Risk:** Events lost during Kafka failures
   - **Mitigation:** Transactional outbox, replication factor 3
   - **Contingency:** Event replay from event store

2. **Distributed Transactions**
   - **Risk:** Saga compensation failures
   - **Mitigation:** Idempotency, retry logic, monitoring
   - **Contingency:** Manual intervention tools

3. **Service Dependencies**
   - **Risk:** Cascading failures
   - **Mitigation:** Circuit breakers, timeouts, fallbacks
   - **Contingency:** Graceful degradation

### Medium Risk Items

4. **Event Ordering**
   - **Risk:** Out-of-order event processing
   - **Mitigation:** Partition by entity ID, sequence numbers
   - **Contingency:** Event replay

5. **Schema Evolution**
   - **Risk:** Breaking changes in events
   - **Mitigation:** Schema registry, versioning
   - **Contingency:** Backward compatibility

---

## Dependencies

### Phase 2 Prerequisites
- ✅ Domain events implemented
- ✅ CQRS pattern working
- ✅ Event bus (in-memory)
- ✅ Clean architecture

### Phase 3 Outputs (for Phase 4)
- Kafka infrastructure
- Extracted services
- API Gateway
- Distributed tracing
- Service mesh

---

## Tools & Technologies

### Messaging
- **Kafka:** Message broker
- **Schema Registry:** Event schema management
- **Kafka Connect:** Data integration

### Service Infrastructure
- **Kong/Express Gateway:** API Gateway
- **Consul:** Service discovery
- **Jaeger:** Distributed tracing
- **Prometheus:** Metrics
- **Grafana:** Dashboards

### Development
- **Docker:** Containerization
- **Docker Compose:** Local development
- **Kubernetes:** Orchestration (Phase 4)

---

## Next Steps

1. **Review Phase 3 overview** with team
2. **Setup Kafka locally** for development
3. **Start with Task 1** (Kafka Infrastructure)
4. **Iterative service extraction**
5. **Continuous monitoring and optimization**

---

**Document Owner:** Tech Lead / Architect  
**Last Updated:** 2026-01-01  
**Version:** 1.0
