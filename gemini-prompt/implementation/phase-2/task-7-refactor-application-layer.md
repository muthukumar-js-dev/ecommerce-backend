# Phase 2 - Task 7: Refactor Application Layer with CQRS

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Tasks 2-6 (Domain Layers, CQRS, Events)

---

## Objective

Refactor the application layer to fully leverage CQRS, domain events, and clean architecture principles. Implement cross-cutting concerns, transaction management, and the Saga pattern for distributed transactions.

---

## Context

The application layer orchestrates:
- Command and query execution
- Transaction boundaries
- Event publishing
- Cross-cutting concerns (logging, validation, authorization)
- Saga coordination for complex workflows

---

## Implementation Steps

### Step 1: Create Application Service Base Classes

**Create `src/application/services/base-application.service.ts`:**

```typescript
import { CommandBus } from '../commands/command-bus';
import { QueryBus } from '../queries/query-bus';
import { EventBus } from '@infrastructure/events/event-bus';

export abstract class BaseApplicationService {
  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly queryBus: QueryBus,
    protected readonly eventBus: EventBus
  ) {}

  protected async executeCommand<TResult>(command: any): Promise<TResult> {
    return this.commandBus.execute(command);
  }

  protected async executeQuery<TResult>(query: any): Promise<TResult> {
    return this.queryBus.execute(query);
  }
}
```

### Step 2: Implement Transaction Management

**Create `src/application/decorators/transactional.decorator.ts`:**

```typescript
import mongoose from 'mongoose';

export function Transactional() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Commit transaction
        await session.commitTransaction();
        return result;
      } catch (error) {
        // Rollback on error
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    };

    return descriptor;
  };
}
```

### Step 3: Implement Unit of Work Pattern

**Create `src/application/patterns/unit-of-work.ts`:**

```typescript
import { AggregateRoot } from '@shared/domain/aggregate-root';
import { EventBus } from '@infrastructure/events/event-bus';

export class UnitOfWork {
  private aggregates: AggregateRoot<any>[] = [];

  constructor(private readonly eventBus: EventBus) {}

  registerAggregate(aggregate: AggregateRoot<any>): void {
    this.aggregates.push(aggregate);
  }

  async commit(): Promise<void> {
    // Collect all events
    const allEvents = this.aggregates.flatMap((agg) => agg.domainEvents);

    // Publish events
    await this.eventBus.publishAll(allEvents);

    // Clear events from aggregates
    this.aggregates.forEach((agg) => agg.clearDomainEvents());

    // Clear registered aggregates
    this.aggregates = [];
  }

  rollback(): void {
    // Clear events without publishing
    this.aggregates.forEach((agg) => agg.clearDomainEvents());
    this.aggregates = [];
  }
}
```

### Step 4: Implement Saga Pattern

**Create `src/application/sagas/saga.interface.ts`:**

```typescript
export interface Saga {
  execute(): Promise<void>;
  compensate(): Promise<void>;
}

export abstract class BaseSaga implements Saga {
  protected steps: SagaStep[] = [];
  protected executedSteps: SagaStep[] = [];

  abstract execute(): Promise<void>;

  async compensate(): Promise<void> {
    // Execute compensation in reverse order
    for (const step of this.executedSteps.reverse()) {
      try {
        await step.compensate();
      } catch (error) {
        console.error(`Compensation failed for step ${step.name}:`, error);
        // Continue with other compensations
      }
    }
  }

  protected async executeStep(step: SagaStep): Promise<void> {
    await step.execute();
    this.executedSteps.push(step);
  }
}

export interface SagaStep {
  name: string;
  execute(): Promise<void>;
  compensate(): Promise<void>;
}
```

**Create `src/application/sagas/place-order.saga.ts`:**

```typescript
import { BaseSaga, SagaStep } from './saga.interface';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { Order } from '@domain/order/aggregates/order.aggregate';
import { ID } from '@shared/types/common';

export class PlaceOrderSaga extends BaseSaga {
  private order?: Order;
  private reservedProducts: Array<{ productId: ID; quantity: number }> = [];

  constructor(
    private readonly userId: ID,
    private readonly orderData: any,
    private readonly userRepository: IUserRepository,
    private readonly productRepository: IProductRepository,
    private readonly orderRepository: IOrderRepository
  ) {
    super();
  }

  async execute(): Promise<void> {
    // Step 1: Validate user can place order
    await this.executeStep(new ValidateUserStep(this.userId, this.userRepository));

    // Step 2: Reserve inventory
    await this.executeStep(
      new ReserveInventoryStep(
        this.orderData.items,
        this.productRepository,
        this.reservedProducts
      )
    );

    // Step 3: Create order
    await this.executeStep(
      new CreateOrderStep(this.orderData, this.orderRepository, (order) => {
        this.order = order;
      })
    );

    // Step 4: Update user order count
    await this.executeStep(
      new UpdateUserOrderCountStep(this.userId, this.orderData.items.length, this.userRepository)
    );
  }
}

class ValidateUserStep implements SagaStep {
  name = 'ValidateUser';

  constructor(
    private userId: ID,
    private userRepository: IUserRepository
  ) {}

  async execute(): Promise<void> {
    const user = await this.userRepository.findById(this.userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.canPlaceOrder) {
      throw new Error('User cannot place order');
    }
  }

  async compensate(): Promise<void> {
    // No compensation needed
  }
}

class ReserveInventoryStep implements SagaStep {
  name = 'ReserveInventory';

  constructor(
    private items: any[],
    private productRepository: IProductRepository,
    private reservedProducts: Array<{ productId: ID; quantity: number }>
  ) {}

  async execute(): Promise<void> {
    for (const item of this.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      product.reserveInventory(item.quantity);
      await this.productRepository.update(product);

      this.reservedProducts.push({
        productId: item.productId,
        quantity: item.quantity.value,
      });
    }
  }

  async compensate(): Promise<void> {
    // Restore inventory
    for (const reserved of this.reservedProducts) {
      const product = await this.productRepository.findById(reserved.productId);
      if (product) {
        product.restockInventory(reserved.quantity as any);
        await this.productRepository.update(product);
      }
    }
  }
}

class CreateOrderStep implements SagaStep {
  name = 'CreateOrder';

  constructor(
    private orderData: any,
    private orderRepository: IOrderRepository,
    private onOrderCreated: (order: Order) => void
  ) {}

  async execute(): Promise<void> {
    const order = Order.create(
      this.orderData.userId,
      this.orderData.items,
      this.orderData.shippingAddress,
      this.generateId()
    );

    const result = await this.orderRepository.save(order);
    if (!result.success) {
      throw result.error;
    }

    this.onOrderCreated(result.data);
  }

  async compensate(): Promise<void> {
    // Delete order if created
    // In production, mark as cancelled instead
  }

  private generateId(): ID {
    return new Date().getTime().toString();
  }
}

class UpdateUserOrderCountStep implements SagaStep {
  name = 'UpdateUserOrderCount';

  constructor(
    private userId: ID,
    private itemCount: number,
    private userRepository: IUserRepository
  ) {}

  async execute(): Promise<void> {
    const user = await this.userRepository.findById(this.userId);
    if (user) {
      for (let i = 0; i < this.itemCount; i++) {
        user.incrementOrderCount();
      }
      await this.userRepository.update(user);
    }
  }

  async compensate(): Promise<void> {
    const user = await this.userRepository.findById(this.userId);
    if (user) {
      for (let i = 0; i < this.itemCount; i++) {
        user.decrementOrderCount();
      }
      await this.userRepository.update(user);
    }
  }
}
```

### Step 5: Cross-Cutting Concerns

**Create `src/application/decorators/logging.decorator.ts`:**

```typescript
export function LogExecution() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      console.log(`[${propertyKey}] Starting execution`);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        console.log(`[${propertyKey}] Completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${propertyKey}] Failed after ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
```

**Create `src/application/decorators/authorization.decorator.ts`:**

```typescript
import { UserRole } from '@shared/types/common';
import { AuthorizationError } from '@shared/errors';

export function RequireRole(...roles: UserRole[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // First argument should be the user or context with user info
      const context = args[0];
      const userRole = context?.user?.role;

      if (!userRole || !roles.includes(userRole)) {
        throw new AuthorizationError('Insufficient permissions');
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
```

### Step 6: Refactored Application Services

**Create `src/application/services/order-application.service.ts`:**

```typescript
import { BaseApplicationService } from './base-application.service';
import { PlaceOrderCommand } from '../commands/order/place-order.command';
import { GetOrderQuery } from '../queries/order/get-order.query';
import { PlaceOrderSaga } from '../sagas/place-order.saga';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { LogExecution } from '../decorators/logging.decorator';
import { Transactional } from '../decorators/transactional.decorator';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ID } from '@shared/types/common';

export class OrderApplicationService extends BaseApplicationService {
  constructor(
    commandBus: any,
    queryBus: any,
    eventBus: any,
    private readonly userRepository: IUserRepository,
    private readonly productRepository: IProductRepository,
    private readonly orderRepository: IOrderRepository
  ) {
    super(commandBus, queryBus, eventBus);
  }

  @LogExecution()
  @Transactional()
  async placeOrder(command: PlaceOrderCommand): AsyncResult<{ orderId: ID }> {
    const saga = new PlaceOrderSaga(
      command.userId!,
      command,
      this.userRepository,
      this.productRepository,
      this.orderRepository
    );

    try {
      await saga.execute();
      return success({ orderId: 'generated-id' });
    } catch (error) {
      // Compensate on failure
      await saga.compensate();
      return failure(error as any);
    }
  }

  async getOrder(orderId: ID): AsyncResult<any> {
    const query = new GetOrderQuery(orderId);
    return this.executeQuery(query);
  }
}
```

---

## Testing Requirements

**Create `tests/integration/sagas/place-order.saga.test.ts`:**

```typescript
import { PlaceOrderSaga } from '@application/sagas/place-order.saga';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../utils/test-helpers';

describe('PlaceOrderSaga', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should execute all steps successfully', async () => {
    // Test implementation
  });

  it('should compensate on failure', async () => {
    // Test compensation logic
  });
});
```

---

## Deliverables

- [ ] Base application service
- [ ] Transaction management
- [ ] Unit of Work pattern
- [ ] Saga pattern implementation
- [ ] Cross-cutting concern decorators
- [ ] Refactored application services
- [ ] Integration tests
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 8: Implement Anti-Corruption Layer**
2. Add retry mechanisms
3. Implement circuit breakers

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
