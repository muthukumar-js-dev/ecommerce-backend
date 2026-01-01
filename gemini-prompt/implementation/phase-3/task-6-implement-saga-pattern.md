# Phase 3 - Task 6: Implement Saga Pattern

**Duration:** 6-7 days  
**Priority:** High  
**Dependencies:** Tasks 1-5 (Kafka + Services)

---

## Objective

Implement comprehensive Saga pattern for distributed transaction coordination with compensation logic, state management, monitoring, and recovery mechanisms.

---

## Context

The Saga pattern provides:
- **Distributed Transactions:** Coordinate transactions across multiple services
- **Compensation:** Rollback completed steps on failure
- **State Management:** Track saga execution state
- **Recovery:** Resume failed sagas
- **Monitoring:** Visibility into saga execution

---

## Implementation Steps

### Step 1: Base Saga Framework

**Create `src/infrastructure/saga/saga.interface.ts`:**

```typescript
import { ID } from '@shared/types/common';

export interface SagaStep {
  name: string;
  execute(context: SagaContext): Promise<void>;
  compensate(context: SagaContext): Promise<void>;
}

export interface SagaContext {
  sagaId: ID;
  data: Record<string, any>;
  stepData: Map<string, any>;
}

export enum SagaStatus {
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPENSATING = 'COMPENSATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATED = 'COMPENSATED',
}

export interface SagaState {
  sagaId: ID;
  type: string;
  status: SagaStatus;
  currentStep: number;
  steps: SagaStepState[];
  context: SagaContext;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SagaStepState {
  stepName: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'COMPENSATING' | 'COMPENSATED' | 'FAILED';
  executedAt?: Date;
  compensatedAt?: Date;
  error?: string;
  retryCount: number;
}
```

**Create `src/infrastructure/saga/base-saga.ts`:**

```typescript
import { SagaStep, SagaContext, SagaStatus } from './saga.interface';
import { SagaRepository } from './saga.repository';
import { ID } from '@shared/types/common';

export abstract class BaseSaga {
  protected steps: SagaStep[] = [];
  protected context!: SagaContext;

  constructor(
    protected sagaRepository: SagaRepository,
    protected sagaType: string
  ) {}

  async execute(data: Record<string, any>): Promise<ID> {
    const sagaId = this.generateId();
    
    this.context = {
      sagaId,
      data,
      stepData: new Map(),
    };

    // Initialize saga state
    await this.sagaRepository.create({
      sagaId,
      type: this.sagaType,
      status: SagaStatus.STARTED,
      currentStep: 0,
      steps: this.steps.map((step) => ({
        stepName: step.name,
        status: 'PENDING',
        retryCount: 0,
      })),
      context: this.context,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await this.sagaRepository.updateStatus(sagaId, SagaStatus.IN_PROGRESS);

      // Execute steps sequentially
      for (let i = 0; i < this.steps.length; i++) {
        await this.executeStep(i);
      }

      // Mark saga as completed
      await this.sagaRepository.complete(sagaId);
      console.log(`Saga ${sagaId} completed successfully`);
      
      return sagaId;
    } catch (error: any) {
      console.error(`Saga ${sagaId} failed:`, error);
      
      // Compensate in reverse order
      await this.compensate();
      
      // Mark saga as failed
      await this.sagaRepository.fail(sagaId, error.message);
      
      throw error;
    }
  }

  private async executeStep(stepIndex: number): Promise<void> {
    const step = this.steps[stepIndex];
    const maxRetries = 3;
    let retryCount = 0;

    await this.sagaRepository.updateStepStatus(
      this.context.sagaId,
      step.name,
      'EXECUTING'
    );

    while (retryCount < maxRetries) {
      try {
        console.log(`Executing step ${step.name} (attempt ${retryCount + 1}/${maxRetries})`);
        
        await step.execute(this.context);
        
        await this.sagaRepository.updateStepStatus(
          this.context.sagaId,
          step.name,
          'COMPLETED',
          { executedAt: new Date() }
        );

        console.log(`Step ${step.name} completed successfully`);
        return;
      } catch (error: any) {
        retryCount++;
        
        await this.sagaRepository.incrementStepRetry(
          this.context.sagaId,
          step.name
        );

        if (retryCount >= maxRetries) {
          await this.sagaRepository.updateStepStatus(
            this.context.sagaId,
            step.name,
            'FAILED',
            { error: error.message }
          );
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Step ${step.name} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  private async compensate(): Promise<void> {
    const sagaId = this.context.sagaId;
    
    await this.sagaRepository.updateStatus(sagaId, SagaStatus.COMPENSATING);

    // Get completed steps in reverse order
    const saga = await this.sagaRepository.findById(sagaId);
    const completedSteps = saga.steps
      .filter((s) => s.status === 'COMPLETED')
      .reverse();

    console.log(`Compensating ${completedSteps.length} completed steps`);

    for (const stepState of completedSteps) {
      const step = this.steps.find((s) => s.name === stepState.stepName);
      if (!step) continue;

      try {
        console.log(`Compensating step ${step.name}`);
        
        await this.sagaRepository.updateStepStatus(
          sagaId,
          step.name,
          'COMPENSATING'
        );

        await step.compensate(this.context);

        await this.sagaRepository.updateStepStatus(
          sagaId,
          step.name,
          'COMPENSATED',
          { compensatedAt: new Date() }
        );

        console.log(`Step ${step.name} compensated successfully`);
      } catch (error: any) {
        console.error(`Compensation failed for step ${step.name}:`, error);
        // Continue with other compensations even if one fails
      }
    }

    await this.sagaRepository.updateStatus(sagaId, SagaStatus.COMPENSATED);
  }

  protected generateId(): ID {
    return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Step 2: Saga Repository

**Create MongoDB model:**

**Create `src/infrastructure/saga/models/saga.model.ts`:**

```typescript
import mongoose, { Schema, Document } from 'mongoose';
import { SagaState, SagaStatus } from '../saga.interface';

export interface ISagaDocument extends Document, SagaState {}

const sagaStepSchema = new Schema({
  stepName: { type: String, required: true },
  status: { type: String, required: true },
  executedAt: { type: Date },
  compensatedAt: { type: Date },
  error: { type: String },
  retryCount: { type: Number, default: 0 },
});

const sagaSchema = new Schema<ISagaDocument>(
  {
    sagaId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    status: { type: String, required: true, enum: Object.values(SagaStatus), index: true },
    currentStep: { type: Number, default: 0 },
    steps: [sagaStepSchema],
    context: { type: Schema.Types.Mixed, required: true },
    error: { type: String },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'sagas',
  }
);

// Index for querying failed sagas
sagaSchema.index({ status: 1, createdAt: -1 });

export const SagaModel = mongoose.model<ISagaDocument>('Saga', sagaSchema);
```

**Create `src/infrastructure/saga/saga.repository.ts`:**

```typescript
import { SagaModel } from './models/saga.model';
import { SagaState, SagaStatus } from './saga.interface';
import { ID } from '@shared/types/common';

export class SagaRepository {
  async create(saga: SagaState): Promise<void> {
    await SagaModel.create(saga);
  }

  async findById(sagaId: ID): Promise<SagaState> {
    const saga = await SagaModel.findOne({ sagaId }).lean();
    if (!saga) {
      throw new Error(`Saga not found: ${sagaId}`);
    }
    return saga as SagaState;
  }

  async updateStatus(sagaId: ID, status: SagaStatus): Promise<void> {
    await SagaModel.updateOne(
      { sagaId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );
  }

  async updateStepStatus(
    sagaId: ID,
    stepName: string,
    status: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const updateData: any = {
      'steps.$.status': status,
      updatedAt: new Date(),
    };

    if (additionalData) {
      Object.keys(additionalData).forEach((key) => {
        updateData[`steps.$.${key}`] = additionalData[key];
      });
    }

    await SagaModel.updateOne(
      { sagaId, 'steps.stepName': stepName },
      { $set: updateData }
    );
  }

  async incrementStepRetry(sagaId: ID, stepName: string): Promise<void> {
    await SagaModel.updateOne(
      { sagaId, 'steps.stepName': stepName },
      {
        $inc: { 'steps.$.retryCount': 1 },
        $set: { updatedAt: new Date() },
      }
    );
  }

  async complete(sagaId: ID): Promise<void> {
    await SagaModel.updateOne(
      { sagaId },
      {
        $set: {
          status: SagaStatus.COMPLETED,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  async fail(sagaId: ID, error: string): Promise<void> {
    await SagaModel.updateOne(
      { sagaId },
      {
        $set: {
          status: SagaStatus.FAILED,
          error,
          updatedAt: new Date(),
        },
      }
    );
  }

  async findFailedSagas(limit: number = 100): Promise<SagaState[]> {
    return SagaModel.find({ status: SagaStatus.FAILED })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as Promise<SagaState[]>;
  }

  async findInProgressSagas(): Promise<SagaState[]> {
    return SagaModel.find({
      status: { $in: [SagaStatus.IN_PROGRESS, SagaStatus.COMPENSATING] },
    })
      .sort({ createdAt: 1 })
      .lean() as Promise<SagaState[]>;
  }
}
```

### Step 3: Order Placement Saga Implementation

**Create `src/application/sagas/order-placement/order-placement.saga.ts`:**

```typescript
import { BaseSaga } from '@infrastructure/saga/base-saga';
import { SagaRepository } from '@infrastructure/saga/saga.repository';
import { ValidateUserStep } from './steps/validate-user.step';
import { ReserveInventoryStep } from './steps/reserve-inventory.step';
import { ProcessPaymentStep } from './steps/process-payment.step';
import { CreateOrderStep } from './steps/create-order.step';
import { UpdateUserStatsStep } from './steps/update-user-stats.step';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { PaymentServiceClient } from '@infrastructure/clients/payment-service.client';

export interface OrderPlacementData {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: any;
  paymentMethodId: string;
}

export class OrderPlacementSaga extends BaseSaga {
  constructor(
    sagaRepository: SagaRepository,
    private userRepository: IUserRepository,
    private productRepository: IProductRepository,
    private orderRepository: IOrderRepository,
    private paymentClient: PaymentServiceClient
  ) {
    super(sagaRepository, 'ORDER_PLACEMENT');

    // Register steps in order
    this.steps = [
      new ValidateUserStep(this.userRepository),
      new ReserveInventoryStep(this.productRepository),
      new ProcessPaymentStep(this.paymentClient),
      new CreateOrderStep(this.orderRepository),
      new UpdateUserStatsStep(this.userRepository),
    ];
  }
}
```

**Create saga steps:**

**Create `src/application/sagas/order-placement/steps/validate-user.step.ts`:**

```typescript
import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';

export class ValidateUserStep implements SagaStep {
  name = 'ValidateUser';

  constructor(private userRepository: IUserRepository) {}

  async execute(context: SagaContext): Promise<void> {
    const { userId } = context.data;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.canPlaceOrder) {
      throw new Error('User cannot place order');
    }

    // Store user in context for later steps
    context.stepData.set('user', user);
  }

  async compensate(context: SagaContext): Promise<void> {
    // No compensation needed for validation
  }
}
```

**Create `src/application/sagas/order-placement/steps/reserve-inventory.step.ts`:**

```typescript
import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';

export class ReserveInventoryStep implements SagaStep {
  name = 'ReserveInventory';

  constructor(private productRepository: IProductRepository) {}

  async execute(context: SagaContext): Promise<void> {
    const { items } = context.data;
    const reservedItems: Array<{ productId: string; quantity: number }> = [];

    for (const item of items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      // Reserve inventory
      product.reserveInventory(item.quantity);
      await this.productRepository.update(product);

      reservedItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // Store reserved items for compensation
    context.stepData.set('reservedItems', reservedItems);
  }

  async compensate(context: SagaContext): Promise<void> {
    const reservedItems = context.stepData.get('reservedItems') || [];

    for (const item of reservedItems) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.restockInventory(item.quantity as any);
        await this.productRepository.update(product);
      }
    }
  }
}
```

**Create `src/application/sagas/order-placement/steps/process-payment.step.ts`:**

```typescript
import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { PaymentServiceClient } from '@infrastructure/clients/payment-service.client';

export class ProcessPaymentStep implements SagaStep {
  name = 'ProcessPayment';

  constructor(private paymentClient: PaymentServiceClient) {}

  async execute(context: SagaContext): Promise<void> {
    const { userId, items, paymentMethodId } = context.data;
    
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    // Initiate payment
    const result = await this.paymentClient.initiatePayment({
      userId,
      amount: totalAmount,
      currency: 'INR',
      paymentMethodId,
    });

    if (!result.success) {
      throw new Error(`Payment failed: ${result.error}`);
    }

    // Store payment ID for compensation
    context.stepData.set('paymentId', result.data.paymentId);
  }

  async compensate(context: SagaContext): Promise<void> {
    const paymentId = context.stepData.get('paymentId');
    
    if (paymentId) {
      await this.paymentClient.refundPayment(paymentId);
    }
  }
}
```

**Create `src/application/sagas/order-placement/steps/create-order.step.ts`:**

```typescript
import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { Order } from '@domain/order/aggregates/order.aggregate';

export class CreateOrderStep implements SagaStep {
  name = 'CreateOrder';

  constructor(private orderRepository: IOrderRepository) {}

  async execute(context: SagaContext): Promise<void> {
    const { userId, items, shippingAddress } = context.data;
    const paymentId = context.stepData.get('paymentId');

    const order = Order.create(
      userId,
      items,
      shippingAddress,
      this.generateId()
    );

    const result = await this.orderRepository.save(order);
    if (!result.success) {
      throw result.error;
    }

    // Store order ID
    context.stepData.set('orderId', result.data.id);
  }

  async compensate(context: SagaContext): Promise<void> {
    const orderId = context.stepData.get('orderId');
    
    if (orderId) {
      const order = await this.orderRepository.findById(orderId);
      if (order) {
        order.cancel('Saga compensation');
        await this.orderRepository.update(order);
      }
    }
  }

  private generateId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Create `src/application/sagas/order-placement/steps/update-user-stats.step.ts`:**

```typescript
import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';

export class UpdateUserStatsStep implements SagaStep {
  name = 'UpdateUserStats';

  constructor(private userRepository: IUserRepository) {}

  async execute(context: SagaContext): Promise<void> {
    const { userId, items } = context.data;
    
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Increment order count
    for (let i = 0; i < items.length; i++) {
      user.incrementOrderCount();
    }

    await this.userRepository.update(user);
  }

  async compensate(context: SagaContext): Promise<void> {
    const { userId, items } = context.data;
    
    const user = await this.userRepository.findById(userId);
    if (user) {
      // Decrement order count
      for (let i = 0; i < items.length; i++) {
        user.decrementOrderCount();
      }
      await this.userRepository.update(user);
    }
  }
}
```

### Step 4: Saga Orchestrator

**Create `src/infrastructure/saga/saga-orchestrator.ts`:**

```typescript
import { SagaRepository } from './saga.repository';
import { OrderPlacementSaga, OrderPlacementData } from '@application/sagas/order-placement/order-placement.saga';
import { ID } from '@shared/types/common';

export class SagaOrchestrator {
  constructor(
    private sagaRepository: SagaRepository,
    private orderPlacementSaga: OrderPlacementSaga
  ) {}

  async executeOrderPlacement(data: OrderPlacementData): Promise<ID> {
    return this.orderPlacementSaga.execute(data);
  }

  async getSagaStatus(sagaId: ID) {
    return this.sagaRepository.findById(sagaId);
  }

  async getFailedSagas() {
    return this.sagaRepository.findFailedSagas();
  }

  async retryFailedSaga(sagaId: ID): Promise<void> {
    // Implementation for retrying failed sagas
    const saga = await this.sagaRepository.findById(sagaId);
    
    // Recreate and retry saga
    // This is a simplified version
    console.log(`Retrying saga ${sagaId}`);
  }
}
```

### Step 5: Saga Monitoring

**Create `src/infrastructure/saga/saga-monitor.ts`:**

```typescript
import { SagaRepository } from './saga.repository';
import { SagaStatus } from './saga.interface';

export class SagaMonitor {
  constructor(private sagaRepository: SagaRepository) {}

  async getMetrics() {
    const sagas = await this.sagaRepository.findInProgressSagas();
    
    const metrics = {
      total: sagas.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      oldestInProgress: null as Date | null,
    };

    for (const saga of sagas) {
      // Count by status
      metrics.byStatus[saga.status] = (metrics.byStatus[saga.status] || 0) + 1;
      
      // Count by type
      metrics.byType[saga.type] = (metrics.byType[saga.type] || 0) + 1;
      
      // Track oldest
      if (!metrics.oldestInProgress || saga.createdAt < metrics.oldestInProgress) {
        metrics.oldestInProgress = saga.createdAt;
      }
    }

    return metrics;
  }

  async checkStuckSagas(thresholdMinutes: number = 30): Promise<void> {
    const sagas = await this.sagaRepository.findInProgressSagas();
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const stuckSagas = sagas.filter((saga) => saga.createdAt < threshold);

    if (stuckSagas.length > 0) {
      console.warn(`Found ${stuckSagas.length} stuck sagas`);
      // Send alert or trigger recovery
    }
  }
}
```

---

## Testing

**Create `tests/integration/sagas/order-placement.saga.test.ts`:**

```typescript
import { OrderPlacementSaga } from '@application/sagas/order-placement/order-placement.saga';
import { SagaRepository } from '@infrastructure/saga/saga.repository';
import { setupTestEnvironment, teardownTestEnvironment } from '../../setup';

describe('Order Placement Saga', () => {
  let saga: OrderPlacementSaga;
  let sagaRepository: SagaRepository;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('should execute all steps successfully', async () => {
    const data = {
      userId: 'user-123',
      items: [
        { productId: 'prod-1', quantity: 2, price: 100 },
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
      },
      paymentMethodId: 'pm_test',
    };

    const sagaId = await saga.execute(data);

    const sagaState = await sagaRepository.findById(sagaId);
    expect(sagaState.status).toBe('COMPLETED');
    expect(sagaState.steps.every((s) => s.status === 'COMPLETED')).toBe(true);
  });

  it('should compensate on payment failure', async () => {
    // Mock payment failure
    // Test compensation logic
  });

  it('should compensate on order creation failure', async () => {
    // Test compensation when order creation fails
  });
});
```

---

## Deliverables

- [ ] Base saga framework
- [ ] Saga repository with MongoDB
- [ ] Order placement saga
- [ ] All saga steps with compensation
- [ ] Saga orchestrator
- [ ] Saga monitoring
- [ ] Retry mechanism
- [ ] Tests
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 7: Implement API Gateway**
2. Add more saga types (cancellation, refund)
3. Implement saga recovery worker

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 6-7 days  
**Status:** Not Started
