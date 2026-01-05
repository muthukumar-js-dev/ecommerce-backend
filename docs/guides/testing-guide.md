# Testing Guide

## Overview

This guide covers our testing strategy, best practices, and examples for the e-commerce backend.

## Testing Philosophy

1. **Test Pyramid**: More unit tests, fewer integration tests, minimal E2E tests
2. **Fast Feedback**: Tests should run quickly
3. **Isolation**: Tests should be independent
4. **Maintainability**: Tests should be easy to understand and modify
5. **Coverage**: Aim for 85%+ overall, 95%+ domain layer

## Testing Strategy

### Test Layers

```
        ┌─────────────┐
        │   E2E Tests │  (Few)
        │  Full Stack │
        └─────────────┘
             ▲
        ┌─────────────┐
        │ Integration │  (Some)
        │    Tests    │
        └─────────────┘
             ▲
        ┌─────────────┐
        │ Unit Tests  │  (Many)
        │   Domain    │
        └─────────────┘
```

### Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Domain | 95% | Critical business logic |
| Application | 85% | Use case orchestration |
| Infrastructure | 70% | Integration points |
| Overall | 85% | Production quality |

## Unit Testing

### Domain Layer Tests

**What to Test:**
- Business rules enforcement
- State transitions
- Domain event emission
- Value object validation
- Aggregate invariants

**Example: User Aggregate Test**

```typescript
// tests/unit/domain/user/user.aggregate.test.ts
import { User } from '@domain/user/aggregates/user.aggregate';
import { Email } from '@domain/user/value-objects/email.vo';
import { Password } from '@domain/user/value-objects/password.vo';
import { UserRole } from '@shared/types/common';

describe('User Aggregate', () => {
  describe('Creation', () => {
    it('should create user with valid data', async () => {
      const user = await User.create(
        {
          name: 'John Doe',
          email: Email.create('john@example.com'),
          password: await Password.create('Password123!'),
          role: UserRole.USER,
        },
        'user-123'
      );

      expect(user.id.value).toBe('user-123');
      expect(user.name).toBe('John Doe');
      expect(user.email.value).toBe('john@example.com');
      expect(user.role).toBe(UserRole.USER);
    });

    it('should raise UserRegistered event', async () => {
      const user = await User.create(
        {
          name: 'John Doe',
          email: Email.create('john@example.com'),
          password: await Password.create('Password123!'),
          role: UserRole.USER,
        },
        'user-123'
      );

      const events = user.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('UserRegistered');
      expect(events[0].payload.userId).toBe('user-123');
    });
  });

  describe('Business Rules', () => {
    it('should enforce maximum order limit', async () => {
      const user = await createTestUser();

      // Place 50 orders (max)
      for (let i = 0; i < 50; i++) {
        user.incrementOrderCount();
      }

      expect(user.currentOrderCount).toBe(50);
      expect(() => user.incrementOrderCount()).toThrow('maximum order limit');
    });

    it('should require shop details for seller role', async () => {
      const user = await createTestUser();

      expect(() => user.changeRole(UserRole.SELLER, 'admin-123')).toThrow(
        'shop details'
      );
    });
  });
});

async function createTestUser(): Promise<User> {
  return User.create(
    {
      name: 'Test User',
      email: Email.create('test@example.com'),
      password: await Password.create('Password123!'),
      role: UserRole.USER,
    },
    'user-123'
  );
}
```

**Example: Value Object Test**

```typescript
// tests/unit/domain/value-objects/money.test.ts
import { Money } from '@domain/shared/value-objects/money.vo';

describe('Money Value Object', () => {
  describe('Creation', () => {
    it('should create money with valid amount', () => {
      const money = Money.create(100, 'USD');

      expect(money.amount).toBe(100);
      expect(money.currency).toBe('USD');
    });

    it('should reject negative amounts', () => {
      expect(() => Money.create(-10, 'USD')).toThrow('negative');
    });
  });

  describe('Operations', () => {
    it('should add money amounts', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');

      const result = money1.add(money2);

      expect(result.amount).toBe(150);
    });

    it('should reject adding different currencies', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'EUR');

      expect(() => money1.add(money2)).toThrow('currency');
    });
  });

  describe('Comparisons', () => {
    it('should compare money amounts', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');

      expect(money1.greaterThan(money2)).toBe(true);
      expect(money2.lessThan(money1)).toBe(true);
    });
  });
});
```

### Application Layer Tests

**What to Test:**
- Command handler logic
- Query handler logic
- Validation
- Error handling

**Example: Command Handler Test**

```typescript
// tests/unit/application/commands/place-order.handler.test.ts
import { PlaceOrderHandler } from '@application/commands/order/place-order.handler';
import { PlaceOrderCommand } from '@application/commands/order/place-order.command';

describe('PlaceOrderHandler', () => {
  let handler: PlaceOrderHandler;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockOrderRepo = {
      save: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockUserRepo = {
      findById: jest.fn(),
    } as any;

    mockProductRepo = {
      findById: jest.fn(),
    } as any;

    handler = new PlaceOrderHandler(
      mockOrderRepo,
      mockUserRepo,
      mockProductRepo
    );
  });

  it('should place order successfully', async () => {
    // Arrange
    const user = await createTestUser();
    const product = createTestProduct();

    mockUserRepo.findById.mockResolvedValue(user);
    mockProductRepo.findById.mockResolvedValue(product);
    mockOrderRepo.save.mockResolvedValue(undefined);

    const command = new PlaceOrderCommand(
      'user-123',
      [{ productId: 'prod-123', quantity: 2 }],
      'addr-123',
      'pay-123'
    );

    // Act
    const result = await handler.handle(command);

    // Assert
    expect(result.success).toBe(true);
    expect(result.value.orderId).toBeDefined();
    expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should reject order if user cannot place order', async () => {
    // Arrange
    const user = await createTestUser();
    for (let i = 0; i < 50; i++) {
      user.incrementOrderCount(); // Max out orders
    }

    mockUserRepo.findById.mockResolvedValue(user);

    const command = new PlaceOrderCommand(
      'user-123',
      [{ productId: 'prod-123', quantity: 2 }],
      'addr-123',
      'pay-123'
    );

    // Act
    const result = await handler.handle(command);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('cannot place order');
  });
});
```

## Integration Testing

### CQRS Flow Tests

**What to Test:**
- Command → Event → Read Model flow
- Eventual consistency
- Event handler execution

**Example: Order Flow Test**

```typescript
// tests/integration/cqrs/order-flow.test.ts
import { CQRSModule } from '@infrastructure/cqrs/cqrs-module';
import { PlaceOrderCommand } from '@application/commands/order/place-order.command';
import { GetOrderHistoryQuery } from '@application/queries/order/get-order-history.query';

describe('Order CQRS Flow', () => {
  let cqrsModule: CQRSModule;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    cqrsModule = new CQRSModule(/* dependencies */);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should handle complete order placement flow', async () => {
    // 1. Place order (Command)
    const command = new PlaceOrderCommand(
      'user-123',
      [{ productId: 'prod-123', quantity: 2 }],
      'addr-123',
      'pay-123'
    );

    const commandResult = await cqrsModule.commandBus.execute(command);
    expect(commandResult.success).toBe(true);

    const orderId = commandResult.value.orderId;

    // 2. Wait for event processing
    await sleep(500);

    // 3. Query order history (Query - Read Model)
    const query = new GetOrderHistoryQuery('user-123');
    const queryResult = await cqrsModule.queryBus.execute(query);

    expect(queryResult.success).toBe(true);
    expect(queryResult.value.orders).toHaveLength(1);
    expect(queryResult.value.orders[0].id).toBe(orderId);
  });
});
```

### Repository Tests

**What to Test:**
- Data persistence
- Data retrieval
- Event publishing

**Example: Repository Test**

```typescript
// tests/integration/repositories/order.repository.test.ts
import { OrderRepository } from '@infrastructure/database/mongodb/repositories/order.repository';
import { Order } from '@domain/order/aggregates/order.aggregate';

describe('OrderRepository', () => {
  let repository: OrderRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    repository = new OrderRepository(/* dependencies */);
  });

  afterEach(async () => {
    await clearDatabase();
  });

  it('should save and retrieve order', async () => {
    // Arrange
    const order = createTestOrder();

    // Act
    await repository.save(order);
    const retrieved = await repository.findById(order.id.value);

    // Assert
    expect(retrieved).toBeDefined();
    expect(retrieved!.id.value).toBe(order.id.value);
    expect(retrieved!.totalAmount.amount).toBe(order.totalAmount.amount);
  });

  it('should publish domain events on save', async () => {
    // Arrange
    const order = createTestOrder();
    const mockEventBus = jest.fn();

    // Act
    await repository.save(order);

    // Assert
    expect(mockEventBus).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'OrderPlaced' })
    );
  });
});
```

## Performance Testing

### Query Performance Tests

```typescript
// tests/performance/query-performance.test.ts
import { performance } from 'perf_hooks';

describe('Query Performance', () => {
  it('should execute user profile query in < 100ms (P95)', async () => {
    const durations: number[] = [];

    // Run query 100 times
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await queryBus.execute(new GetUserProfileQuery('user-123'));
      const end = performance.now();
      durations.push(end - start);
    }

    // Calculate P95
    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = durations[p95Index];

    expect(p95Duration).toBeLessThan(100);
  });
});
```

## Contract Testing

### External Service Tests

```typescript
// tests/contract/stripe.contract.test.ts
describe('Stripe Contract Tests', () => {
  let adapter: StripeAdapter;

  beforeAll(() => {
    adapter = new StripeAdapter(new Stripe(process.env.STRIPE_TEST_KEY!));
  });

  it('should create customer with expected response structure', async () => {
    const result = await adapter.createCustomer(
      'test@example.com',
      'Test User'
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.customerId).toMatch(/^cus_/);
      expect(result.value.email).toBe('test@example.com');
    }
  });
});
```

## Running Tests

### Test Scripts

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:domain        # Domain unit tests
npm run test:cqrs          # CQRS integration tests
npm run test:performance   # Performance tests
npm run test:contract      # Contract tests

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch

# Run specific file
npm test -- path/to/test.ts

# Run tests matching pattern
npm test -- --testNamePattern="User Aggregate"
```

## Best Practices

### 1. Test Naming
```typescript
// Good
it('should reject order if user has reached maximum order limit', () => {});

// Bad
it('test order limit', () => {});
```

### 2. Arrange-Act-Assert Pattern
```typescript
it('should add item to order', () => {
  // Arrange
  const order = createTestOrder();
  const item = createTestOrderItem();

  // Act
  order.addItem(item);

  // Assert
  expect(order.items).toHaveLength(1);
  expect(order.items[0]).toBe(item);
});
```

### 3. Test Data Builders
```typescript
// Create reusable test data builders
function createTestUser(overrides?: Partial<UserProps>): User {
  return User.create(
    {
      name: 'Test User',
      email: Email.create('test@example.com'),
      password: Password.create('Password123!'),
      role: UserRole.USER,
      ...overrides,
    },
    'user-123'
  );
}
```

### 4. Mock External Dependencies
```typescript
// Mock repositories, external services
const mockRepo = {
  save: jest.fn(),
  findById: jest.fn().mockResolvedValue(testUser),
} as jest.Mocked<IUserRepository>;
```

### 5. Clean Up After Tests
```typescript
afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});
```

## Coverage Reports

### Generating Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Reading Coverage Reports

- **Statements**: % of statements executed
- **Branches**: % of if/else branches taken
- **Functions**: % of functions called
- **Lines**: % of lines executed

### Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  './src/domain/**/*.ts': {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95,
  },
}
```

## Continuous Integration

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

## Troubleshooting

### Common Issues

**Tests timing out:**
```bash
# Increase timeout
npm test -- --testTimeout=10000
```

**MongoDB connection issues:**
```bash
# Check MongoDB Memory Server
# Ensure proper cleanup in afterAll
```

**Flaky tests:**
```bash
# Run test multiple times
npm test -- --testNamePattern="flaky test" --runInBand
```

## Related Documentation

- [Developer Guide](./developer-guide.md)
- [Architecture Overview](../architecture/overview.md)
- [CQRS Implementation](../architecture/cqrs.md)
