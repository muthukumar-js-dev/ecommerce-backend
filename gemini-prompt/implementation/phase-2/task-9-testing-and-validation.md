# Phase 2 - Task 9: Testing & Validation

**Duration:** 5-6 days  
**Priority:** Critical  
**Dependencies:** Tasks 1-8 (All Phase 2 Tasks)

---

## Objective

Comprehensive testing of the refactored architecture including domain models, CQRS, events, and integration testing to ensure 85%+ code coverage and validate all business rules.

---

## Context

Testing strategy for DDD and CQRS:
- Unit tests for domain models (aggregates, value objects, domain services)
- Integration tests for repositories and event handlers
- E2E tests for complete workflows
- Performance tests for CQRS queries
- Contract tests for external services

---

## Testing Strategy

### 1. Domain Layer Testing (Unit Tests)

**Test Coverage Goals:**
- Aggregates: 95%
- Value Objects: 95%
- Domain Services: 90%
- Specifications: 90%

**Create `tests/unit/domain/user/user.aggregate.test.ts`:**

```typescript
import { User } from '@domain/user/aggregates/user.aggregate';
import { Email } from '@domain/user/value-objects/email.vo';
import { Password } from '@domain/user/value-objects/password.vo';
import { UserRole } from '@shared/types/common';

describe('User Aggregate', () => {
  describe('Business Rules', () => {
    it('should enforce maximum order limit', async () => {
      const user = await createTestUser();
      
      // Place 50 orders (max)
      for (let i = 0; i < 50; i++) {
        user.incrementOrderCount();
      }
      
      expect(() => user.incrementOrderCount()).toThrow('maximum order limit');
    });

    it('should require shop details for seller role', async () => {
      const user = await createTestUser();
      
      expect(() => user.changeRole(UserRole.SELLER, 'admin-123')).toThrow(
        'shop details'
      );
    });

    it('should calculate trust score correctly', () => {
      const user = createUserWithOrders(10, 2); // 10 orders, 2 returned
      const service = new UserDomainService(mockRepository);
      
      const trustScore = service.calculateUserTrustScore(user);
      expect(trustScore).toBe(80); // 20% return rate
    });
  });

  describe('Domain Events', () => {
    it('should raise UserRegistered on creation', async () => {
      const user = await createTestUser();
      
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventName).toBe('UserRegistered');
      expect(user.domainEvents[0].payload.email).toBe('test@example.com');
    });

    it('should raise UserRoleChanged when role changes', async () => {
      const user = await createTestUser();
      user.updateSellerDetails('Shop', 'Address');
      user.clearDomainEvents();
      
      user.changeRole(UserRole.SELLER, 'admin-123');
      
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventName).toBe('UserRoleChanged');
    });
  });
});

async function createTestUser(): Promise<User> {
  return User.create(
    {
      name: 'Test User',
      email: Email.create('test@example.com'),
      password: await Password.create('Password123'),
      role: UserRole.USER,
    },
    'user-123'
  );
}
```

### 2. CQRS Testing

**Create `tests/integration/cqrs/order-flow.test.ts`:**

```typescript
import { CQRSModule } from '@infrastructure/cqrs/cqrs-module';
import { PlaceOrderCommand } from '@application/commands/order/place-order.command';
import { GetOrderQuery } from '@application/queries/order/get-order.query';
import { isSuccess } from '@shared/types/result';

describe('CQRS Order Flow', () => {
  let cqrsModule: CQRSModule;

  beforeAll(async () => {
    await connectTestDatabase();
    cqrsModule = new CQRSModule();
  });

  it('should handle complete order placement flow', async () => {
    // 1. Place order (Command)
    const command = new PlaceOrderCommand(
      'user-123',
      [{ productId: 'prod-123', quantity: 2, price: 100 }],
      'address-123',
      'payment-123'
    );

    const commandResult = await cqrsModule.commandBus.execute(command);
    expect(isSuccess(commandResult)).toBe(true);

    if (!isSuccess(commandResult)) return;
    const orderId = commandResult.data.orderId;

    // 2. Wait for event processing
    await sleep(100);

    // 3. Query order (Query)
    const query = new GetOrderQuery(orderId);
    const queryResult = await cqrsModule.queryBus.execute(query);

    expect(isSuccess(queryResult)).toBe(true);
    if (isSuccess(queryResult)) {
      expect(queryResult.data.orderId).toBe(orderId);
      expect(queryResult.data.status).toBe('PENDING');
    }
  });

  it('should update read model when order status changes', async () => {
    // Test eventual consistency
  });
});
```

### 3. Event Testing

**Create `tests/integration/events/event-flow.test.ts`:**

```typescript
import { EventBus } from '@infrastructure/events/event-bus';
import { MongoDBEventStore } from '@infrastructure/events/mongodb-event-store';
import { OrderPlaced } from '@domain/order/events/order-placed.event';

describe('Event Flow', () => {
  let eventBus: EventBus;
  let eventStore: MongoDBEventStore;

  beforeAll(async () => {
    await connectTestDatabase();
    eventStore = new MongoDBEventStore();
    eventBus = new EventBus(eventStore);
  });

  it('should store events in event store', async () => {
    const event = new OrderPlaced({
      orderId: 'order-123',
      orderNumber: 'ORD-001',
      userId: 'user-123',
      totalAmount: 1000,
      itemCount: 2,
      placedAt: new Date(),
    });

    await eventBus.publish(event);

    const storedEvents = await eventStore.getByEventName('OrderPlaced');
    expect(storedEvents.length).toBeGreaterThan(0);
    expect(storedEvents[0].eventName).toBe('OrderPlaced');
  });

  it('should handle multiple event handlers', async () => {
    const handler1 = jest.fn().mockResolvedValue(undefined);
    const handler2 = jest.fn().mockResolvedValue(undefined);

    eventBus.subscribe('OrderPlaced', { handle: handler1 });
    eventBus.subscribe('OrderPlaced', { handle: handler2 });

    const event = new OrderPlaced({
      orderId: 'order-123',
      orderNumber: 'ORD-001',
      userId: 'user-123',
      totalAmount: 1000,
      itemCount: 2,
      placedAt: new Date(),
    });

    await eventBus.publish(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
```

### 4. Saga Testing

**Create `tests/integration/sagas/place-order.saga.test.ts`:**

```typescript
import { PlaceOrderSaga } from '@application/sagas/place-order.saga';

describe('PlaceOrderSaga', () => {
  it('should execute all steps successfully', async () => {
    const saga = createTestSaga();
    
    await expect(saga.execute()).resolves.not.toThrow();
  });

  it('should compensate on failure', async () => {
    const saga = createFailingSaga();
    
    try {
      await saga.execute();
    } catch (error) {
      await saga.compensate();
    }

    // Verify compensation (inventory restored, user count decremented)
    const product = await productRepository.findById('prod-123');
    expect(product.inventory.value).toBe(100); // Original value
  });

  it('should handle partial failure', async () => {
    // Test compensation when step 3 fails but steps 1-2 succeeded
  });
});
```

### 5. Performance Testing

**Create `tests/performance/query-performance.test.ts`:**

```typescript
import { performance } from 'perf_hooks';

describe('Query Performance', () => {
  it('should execute user profile query in < 100ms', async () => {
    const start = performance.now();
    
    const query = new GetUserProfileQuery('user-123');
    await queryBus.execute(query);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle 100 concurrent queries', async () => {
    const queries = Array.from({ length: 100 }, (_, i) =>
      queryBus.execute(new GetUserProfileQuery(`user-${i}`))
    );

    const start = performance.now();
    await Promise.all(queries);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5000); // 5 seconds for 100 queries
  });
});
```

### 6. Contract Testing (External Services)

**Create `tests/contract/stripe.contract.test.ts`:**

```typescript
import { StripeAdapter } from '@infrastructure/adapters/stripe/stripe.adapter';
import { Money } from '@domain/product/value-objects/money.vo';

describe('Stripe Contract Tests', () => {
  let adapter: StripeAdapter;

  beforeAll(() => {
    adapter = new StripeAdapter(process.env.STRIPE_TEST_KEY!);
  });

  it('should create customer with expected response', async () => {
    const result = await adapter.createCustomer('test@example.com', 'Test User');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerId).toMatch(/^cus_/);
    }
  });

  it('should create payment intent with correct amount', async () => {
    const customerResult = await adapter.createCustomer('test@example.com', 'Test');
    if (!customerResult.success) return;

    const result = await adapter.createPaymentIntent(
      Money.create(1000, 'INR'),
      customerResult.data.customerId
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount.amount).toBe(1000);
      expect(result.data.amount.currency).toBe('INR');
    }
  });
});
```

---

## Test Coverage Requirements

### Coverage Targets

| Layer | Target Coverage |
|-------|----------------|
| Domain Layer | 95% |
| Application Layer | 85% |
| Infrastructure Layer | 75% |
| Overall | 85% |

### Coverage Report

```bash
npm run test:coverage
```

Expected output:
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   87.5  |   82.3   |   89.1  |   87.8  |
 domain/            |   95.2  |   91.4   |   96.3  |   95.5  |
 application/       |   86.7  |   80.2   |   88.4  |   87.1  |
 infrastructure/    |   78.3  |   72.8   |   79.6  |   78.9  |
--------------------|---------|----------|---------|---------|
```

---

## Validation Checklist

### Functional Validation
- [ ] All business rules enforced
- [ ] State transitions validated
- [ ] Domain events published correctly
- [ ] CQRS read/write separation working
- [ ] Saga compensation working

### Non-Functional Validation
- [ ] Query performance < 100ms (P95)
- [ ] Command performance < 500ms (P95)
- [ ] Event processing < 1s
- [ ] 85%+ code coverage
- [ ] No memory leaks

### Integration Validation
- [ ] External services working (Stripe, AWS)
- [ ] Circuit breakers functioning
- [ ] Retry logic working
- [ ] Event store persisting events
- [ ] Read models updating correctly

---

## Testing Tools

```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.12",
    "mongodb-memory-server": "^8.12.0",
    "artillery": "^2.0.0"
  }
}
```

---

## Deliverables

- [ ] Unit tests for all domain models (95%+ coverage)
- [ ] Integration tests for CQRS
- [ ] Event flow tests
- [ ] Saga tests with compensation
- [ ] Performance tests
- [ ] Contract tests for external services
- [ ] Load tests
- [ ] Coverage reports
- [ ] Test documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 10: Documentation & Knowledge Transfer**
2. Set up CI/CD with test automation
3. Implement continuous performance monitoring

---

**Task Owner:** QA + Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
