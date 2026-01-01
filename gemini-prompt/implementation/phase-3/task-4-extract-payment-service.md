# Phase 3 - Task 4: Extract Payment Service

**Duration:** 6-7 days  
**Priority:** High  
**Dependencies:** Tasks 1-3 (Kafka Infrastructure + Events)

---

## Objective

Extract payment processing into a standalone microservice with its own database, domain model, and Kafka integration for event-driven communication.

---

## Context

The Payment Service will:
- Handle all payment-related operations
- Integrate with Stripe via Anti-Corruption Layer
- Publish payment events to Kafka
- Consume order events
- Maintain its own database

---

## Implementation Steps

### Step 1: Create Payment Service Structure

**Create new service directory:**

```
payment-service/
├── src/
│   ├── domain/
│   │   ├── payment.aggregate.ts
│   │   ├── payment-method.vo.ts
│   │   └── events/
│   ├── application/
│   │   ├── commands/
│   │   └── queries/
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── messaging/
│   │   └── stripe/
│   ├── api/
│   │   ├── routes/
│   │   └── controllers/
│   └── main.ts
├── tests/
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Step 2: Payment Domain Model

**Create `payment-service/src/domain/payment.aggregate.ts`:**

```typescript
import { AggregateRoot } from '@shared/domain/aggregate-root';
import { ID, Timestamp } from '@shared/types/common';
import { Money } from '@shared/value-objects/money.vo';
import { PaymentInitiated } from './events/payment-initiated.event';
import { PaymentSucceeded } from './events/payment-succeeded.event';
import { PaymentFailed } from './events/payment-failed.event';
import { BusinessRuleError } from '@shared/errors';

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface PaymentProps {
  orderId: ID;
  userId: ID;
  amount: Money;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeCustomerId: string;
  failureReason?: string;
  refundId?: string;
  metadata: Record<string, string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Payment extends AggregateRoot<PaymentProps> {
  private constructor(props: PaymentProps, id: ID) {
    super(props, id);
  }

  static initiate(
    orderId: ID,
    userId: ID,
    amount: Money,
    stripeCustomerId: string,
    id: ID
  ): Payment {
    const now = new Date();
    const payment = new Payment(
      {
        orderId,
        userId,
        amount,
        status: PaymentStatus.PENDING,
        stripeCustomerId,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      },
      id
    );

    payment.addDomainEvent(
      new PaymentInitiated({
        paymentId: id,
        orderId,
        userId,
        amount: amount.amount,
        currency: amount.currency,
        initiatedAt: now,
      })
    );

    return payment;
  }

  authorize(stripePaymentIntentId: string): void {
    if (this.props.status !== PaymentStatus.PENDING) {
      throw new BusinessRuleError(
        'Can only authorize pending payments',
        'INVALID_PAYMENT_STATE'
      );
    }

    this.props.status = PaymentStatus.AUTHORIZED;
    this.props.stripePaymentIntentId = stripePaymentIntentId;
    this.props.updatedAt = new Date();
  }

  capture(): void {
    if (this.props.status !== PaymentStatus.AUTHORIZED) {
      throw new BusinessRuleError(
        'Can only capture authorized payments',
        'INVALID_PAYMENT_STATE'
      );
    }

    this.props.status = PaymentStatus.CAPTURED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new PaymentSucceeded({
        paymentId: this.id,
        orderId: this.props.orderId,
        userId: this.props.userId,
        amount: this.props.amount.amount,
        stripePaymentIntentId: this.props.stripePaymentIntentId!,
        capturedAt: new Date(),
      })
    );
  }

  fail(reason: string): void {
    this.props.status = PaymentStatus.FAILED;
    this.props.failureReason = reason;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new PaymentFailed({
        paymentId: this.id,
        orderId: this.props.orderId,
        userId: this.props.userId,
        reason,
        failedAt: new Date(),
      })
    );
  }

  refund(refundId: string): void {
    if (this.props.status !== PaymentStatus.CAPTURED) {
      throw new BusinessRuleError(
        'Can only refund captured payments',
        'INVALID_PAYMENT_STATE'
      );
    }

    this.props.status = PaymentStatus.REFUNDED;
    this.props.refundId = refundId;
    this.props.updatedAt = new Date();
  }

  get orderId(): ID {
    return this.props.orderId;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get status(): PaymentStatus {
    return this.props.status;
  }
}
```

### Step 3: Payment Commands

**Create `payment-service/src/application/commands/initiate-payment.command.ts`:**

```typescript
import { BaseCommand } from '@shared/cqrs/command.interface';
import { ID } from '@shared/types/common';

export class InitiatePaymentCommand extends BaseCommand {
  constructor(
    public readonly orderId: ID,
    public readonly userId: ID,
    public readonly amount: number,
    public readonly currency: string,
    public readonly stripeCustomerId: string
  ) {
    super('InitiatePaymentCommand');
  }
}
```

**Create `payment-service/src/application/commands/initiate-payment.handler.ts`:**

```typescript
import { CommandHandler } from '@shared/cqrs/command-handler.interface';
import { InitiatePaymentCommand } from './initiate-payment.command';
import { IPaymentRepository } from '@domain/repositories/payment.repository.interface';
import { Payment } from '@domain/payment.aggregate';
import { Money } from '@shared/value-objects/money.vo';
import { StripeAdapter } from '@infrastructure/stripe/stripe.adapter';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ID } from '@shared/types/common';

export class InitiatePaymentHandler
  implements CommandHandler<InitiatePaymentCommand, { paymentId: ID }>
{
  constructor(
    private paymentRepository: IPaymentRepository,
    private stripeAdapter: StripeAdapter
  ) {}

  async handle(command: InitiatePaymentCommand): AsyncResult<{ paymentId: ID }> {
    // Create payment aggregate
    const paymentId = this.generateId();
    const amount = Money.create(command.amount, command.currency as any);

    const payment = Payment.initiate(
      command.orderId,
      command.userId,
      amount,
      command.stripeCustomerId,
      paymentId
    );

    // Create Stripe payment intent
    const intentResult = await this.stripeAdapter.createPaymentIntent(
      amount,
      command.stripeCustomerId,
      {
        orderId: command.orderId,
        paymentId,
      }
    );

    if (!intentResult.success) {
      return failure(intentResult.error);
    }

    // Authorize payment
    payment.authorize(intentResult.data.id);

    // Save payment
    const saveResult = await this.paymentRepository.save(payment);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success({ paymentId });
  }

  private generateId(): ID {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Step 4: Event Handlers

**Create `payment-service/src/infrastructure/messaging/handlers/order-placed.handler.ts`:**

```typescript
import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from '@shared/messaging/base-event-handler';
import { CommandBus } from '@shared/cqrs/command-bus';
import { InitiatePaymentCommand } from '@application/commands/initiate-payment.command';

export class OrderPlacedHandler extends BaseEventHandler {
  constructor(
    processedEventRepo: any,
    private commandBus: CommandBus
  ) {
    super(processedEventRepo);
  }

  protected async processEvent(payload: EachMessagePayload): Promise<void> {
    const event = this.parseMessage<{
      orderId: string;
      userId: string;
      totalAmount: number;
      stripeCustomerId: string;
    }>(payload);

    // Initiate payment for the order
    const command = new InitiatePaymentCommand(
      event.orderId,
      event.userId,
      event.totalAmount,
      'INR',
      event.stripeCustomerId
    );

    const result = await this.commandBus.execute(command);

    if (!result.success) {
      console.error(`Failed to initiate payment for order ${event.orderId}:`, result.error);
      throw result.error;
    }

    console.log(`Payment initiated for order ${event.orderId}`);
  }
}
```

### Step 5: Payment Service API

**Create `payment-service/src/api/routes/payment.routes.ts`:**

```typescript
import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '@shared/middleware/auth.middleware';

export function createPaymentRoutes(controller: PaymentController): Router {
  const router = Router();

  router.post('/initiate', authMiddleware, (req, res) =>
    controller.initiatePayment(req, res)
  );

  router.post('/:paymentId/capture', authMiddleware, (req, res) =>
    controller.capturePayment(req, res)
  );

  router.post('/:paymentId/refund', authMiddleware, (req, res) =>
    controller.refundPayment(req, res)
  );

  router.get('/:paymentId', authMiddleware, (req, res) =>
    controller.getPayment(req, res)
  );

  router.post('/webhook/stripe', (req, res) =>
    controller.handleStripeWebhook(req, res)
  );

  return router;
}
```

### Step 6: Service Bootstrap

**Create `payment-service/src/main.ts`:**

```typescript
import express from 'express';
import { createKafkaClient, getKafkaConfig } from '@shared/messaging/kafka/kafka.config';
import { ConsumerGroups } from './infrastructure/messaging/consumer-groups';
import { OutboxPublisher } from '@shared/messaging/outbox/outbox-publisher';
import { createPaymentRoutes } from './api/routes/payment.routes';
import { PaymentController } from './api/controllers/payment.controller';
import mongoose from 'mongoose';

async function bootstrap() {
  // Connect to database
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-service');
  console.log('Connected to MongoDB');

  // Setup Kafka
  const kafkaConfig = getKafkaConfig();
  const kafka = createKafkaClient(kafkaConfig);

  // Start outbox publisher
  const outboxPublisher = new OutboxPublisher(/* dependencies */);
  await outboxPublisher.start();

  // Start consumer groups
  const consumerGroups = new ConsumerGroups(kafka);
  await consumerGroups.startAll();

  // Setup Express
  const app = express();
  app.use(express.json());

  // Routes
  const paymentController = new PaymentController(/* dependencies */);
  app.use('/api/payments', createPaymentRoutes(paymentController));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'payment-service' });
  });

  // Start server
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Payment service listening on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await outboxPublisher.stop();
    await consumerGroups.stopAll();
    await mongoose.disconnect();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start payment service:', error);
  process.exit(1);
});
```

### Step 7: Docker Configuration

**Create `payment-service/Dockerfile`:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

**Create `payment-service/docker-compose.yml`:**

```yaml
version: '3.8'

services:
  payment-service:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=mongodb://mongo:27017/payment-service
      - KAFKA_BROKERS=kafka:29092
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - mongo
      - kafka

  mongo:
    image: mongo:6
    volumes:
      - payment-db:/data/db

volumes:
  payment-db:
```

---

## Testing

**Create `payment-service/tests/integration/payment-flow.test.ts`:**

```typescript
import { InitiatePaymentCommand } from '@application/commands/initiate-payment.command';
import { CommandBus } from '@shared/cqrs/command-bus';

describe('Payment Flow', () => {
  let commandBus: CommandBus;

  beforeAll(async () => {
    // Setup test environment
  });

  it('should initiate payment for order', async () => {
    const command = new InitiatePaymentCommand(
      'order-123',
      'user-123',
      1000,
      'INR',
      'cus_stripe123'
    );

    const result = await commandBus.execute(command);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentId).toBeDefined();
    }
  });

  it('should publish PaymentSucceeded event on capture', async () => {
    // Test implementation
  });
});
```

---

## Deliverables

- [ ] Payment service application
- [ ] Payment domain model
- [ ] Payment commands and handlers
- [ ] Event handlers (OrderPlaced)
- [ ] Payment events (PaymentSucceeded, PaymentFailed)
- [ ] API endpoints
- [ ] Stripe integration
- [ ] Docker configuration
- [ ] Tests
- [ ] Documentation

---

## Migration Strategy

1. **Phase 1:** Deploy payment service alongside monolith
2. **Phase 2:** Dual-write to both systems
3. **Phase 3:** Verify data consistency
4. **Phase 4:** Switch reads to payment service
5. **Phase 5:** Remove payment code from monolith

---

## Next Steps

After completing this task:
1. Proceed to **Task 5: Extract Notification Service**
2. Monitor payment service metrics
3. Setup alerts for payment failures

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 6-7 days  
**Status:** Not Started
