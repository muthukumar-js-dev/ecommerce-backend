# Phase 3 - Task 2: Implement Event Publishing

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Task 1 (Kafka Infrastructure)

---

## Objective

Implement reliable event publishing to Kafka using the Transactional Outbox pattern to ensure at-least-once delivery and maintain data consistency.

---

## Context

Event publishing must be:
- **Reliable:** No message loss
- **Consistent:** Atomic with database writes
- **Ordered:** Events published in correct sequence
- **Idempotent:** Safe to retry

---

## Implementation Steps

### Step 1: Transactional Outbox Pattern

**Create outbox table schema:**

**Create `src/infrastructure/database/mongodb/models/outbox.model.ts`:**

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IOutboxEvent extends Document {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  topic: string;
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
}

const outboxSchema = new Schema<IOutboxEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    aggregateId: { type: String, required: true, index: true },
    aggregateType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    topic: { type: String, required: true },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    retryCount: { type: Number, default: 0 },
    lastError: { type: String },
  },
  {
    timestamps: true,
    collection: 'outbox_events',
  }
);

// Index for efficient polling
outboxSchema.index({ published: 1, createdAt: 1 });

export const OutboxModel = mongoose.model<IOutboxEvent>('OutboxEvent', outboxSchema);
```

### Step 2: Outbox Repository

**Create `src/infrastructure/database/mongodb/repositories/outbox.repository.ts`:**

```typescript
import { OutboxModel, IOutboxEvent } from '../models/outbox.model';
import { DomainEvent } from '@shared/domain/domain-event';
import { KafkaTopic } from '@infrastructure/messaging/kafka/topics';

export class OutboxRepository {
  async save(event: DomainEvent<any>, topic: KafkaTopic, session?: any): Promise<void> {
    await OutboxModel.create(
      [
        {
          eventId: event.eventId,
          eventType: event.eventName,
          aggregateId: this.extractAggregateId(event),
          aggregateType: this.extractAggregateType(event),
          payload: event.payload,
          topic,
          published: false,
          retryCount: 0,
        },
      ],
      { session }
    );
  }

  async findUnpublished(limit: number = 100): Promise<IOutboxEvent[]> {
    return OutboxModel.find({ published: false })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  async markPublished(eventId: string): Promise<void> {
    await OutboxModel.updateOne(
      { eventId },
      {
        $set: {
          published: true,
          publishedAt: new Date(),
        },
      }
    );
  }

  async incrementRetry(eventId: string, error: string): Promise<void> {
    await OutboxModel.updateOne(
      { eventId },
      {
        $inc: { retryCount: 1 },
        $set: { lastError: error },
      }
    );
  }

  async deleteOldEvents(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await OutboxModel.deleteMany({
      published: true,
      publishedAt: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  private extractAggregateId(event: DomainEvent<any>): string {
    const payload = event.payload as any;
    return payload.userId || payload.orderId || payload.productId || payload.id || 'unknown';
  }

  private extractAggregateType(event: DomainEvent<any>): string {
    if (event.eventName.includes('User')) return 'User';
    if (event.eventName.includes('Order')) return 'Order';
    if (event.eventName.includes('Product')) return 'Product';
    if (event.eventName.includes('Payment')) return 'Payment';
    return 'Unknown';
  }
}
```

### Step 3: Kafka Producer

**Create `src/infrastructure/messaging/kafka/kafka-producer.ts`:**

```typescript
import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { KafkaTopic } from './topics';

export class KafkaProducer {
  private producer: Producer;
  private connected: boolean = false;

  constructor(private kafka: Kafka) {
    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      transactionalId: `ecommerce-producer-${process.pid}`,
      maxInFlightRequests: 5,
      idempotent: true,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        multiplier: 2,
      },
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
      console.log('Kafka producer connected');
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
      console.log('Kafka producer disconnected');
    }
  }

  async send(
    topic: KafkaTopic,
    key: string,
    value: any,
    headers?: Record<string, string>
  ): Promise<RecordMetadata[]> {
    if (!this.connected) {
      await this.connect();
    }

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          headers: this.serializeHeaders(headers),
          timestamp: Date.now().toString(),
        },
      ],
    };

    const metadata = await this.producer.send(record);
    return metadata;
  }

  async sendBatch(
    topic: KafkaTopic,
    messages: Array<{ key: string; value: any; headers?: Record<string, string> }>
  ): Promise<RecordMetadata[]> {
    if (!this.connected) {
      await this.connect();
    }

    const record: ProducerRecord = {
      topic,
      messages: messages.map((msg) => ({
        key: msg.key,
        value: JSON.stringify(msg.value),
        headers: this.serializeHeaders(msg.headers),
        timestamp: Date.now().toString(),
      })),
    };

    return this.producer.send(record);
  }

  private serializeHeaders(headers?: Record<string, string>): Record<string, Buffer> | undefined {
    if (!headers) return undefined;

    const serialized: Record<string, Buffer> = {};
    for (const [key, value] of Object.entries(headers)) {
      serialized[key] = Buffer.from(value);
    }
    return serialized;
  }
}
```

### Step 4: Outbox Publisher (Background Worker)

**Create `src/infrastructure/messaging/outbox/outbox-publisher.ts`:**

```typescript
import { OutboxRepository } from '@infrastructure/database/mongodb/repositories/outbox.repository';
import { KafkaProducer } from '../kafka/kafka-producer';
import { KafkaTopic } from '../kafka/topics';

export class OutboxPublisher {
  private isRunning: boolean = false;
  private intervalMs: number;

  constructor(
    private outboxRepository: OutboxRepository,
    private kafkaProducer: KafkaProducer,
    intervalMs: number = 1000
  ) {
    this.intervalMs = intervalMs;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Outbox publisher already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting outbox publisher...');

    await this.kafkaProducer.connect();
    this.poll();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.kafkaProducer.disconnect();
    console.log('Outbox publisher stopped');
  }

  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.publishPendingEvents();
      } catch (error) {
        console.error('Error in outbox publisher:', error);
      }

      await this.sleep(this.intervalMs);
    }
  }

  private async publishPendingEvents(): Promise<void> {
    const events = await this.outboxRepository.findUnpublished(100);

    if (events.length === 0) {
      return;
    }

    console.log(`Publishing ${events.length} events from outbox`);

    for (const event of events) {
      try {
        await this.kafkaProducer.send(
          event.topic as KafkaTopic,
          event.aggregateId,
          event.payload,
          {
            eventId: event.eventId,
            eventType: event.eventType,
            aggregateType: event.aggregateType,
          }
        );

        await this.outboxRepository.markPublished(event.eventId);
        console.log(`Published event ${event.eventId} to ${event.topic}`);
      } catch (error: any) {
        console.error(`Failed to publish event ${event.eventId}:`, error);
        await this.outboxRepository.incrementRetry(event.eventId, error.message);

        // Move to DLQ after 5 retries
        if (event.retryCount >= 5) {
          console.error(`Event ${event.eventId} exceeded retry limit, moving to DLQ`);
          await this.moveToDeadLetterQueue(event);
        }
      }
    }
  }

  private async moveToDeadLetterQueue(event: any): Promise<void> {
    try {
      await this.kafkaProducer.send(
        KafkaTopic.DLQ_EVENTS,
        event.eventId,
        {
          originalTopic: event.topic,
          originalEvent: event.payload,
          error: event.lastError,
          retryCount: event.retryCount,
        },
        {
          eventId: event.eventId,
          eventType: event.eventType,
        }
      );

      await this.outboxRepository.markPublished(event.eventId);
    } catch (error) {
      console.error(`Failed to move event ${event.eventId} to DLQ:`, error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Step 5: Integration with Domain Events

**Update repository to use outbox:**

**Create `src/infrastructure/database/mongodb/repositories/user.repository.ts`:**

```typescript
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User } from '@domain/user/aggregates/user.aggregate';
import { UserModel } from '../models/user.model';
import { OutboxRepository } from './outbox.repository';
import { KafkaTopic } from '@infrastructure/messaging/kafka/topics';
import { AsyncResult, success, failure } from '@shared/types/result';
import mongoose from 'mongoose';

export class UserRepository implements IUserRepository {
  constructor(private outboxRepository: OutboxRepository) {}

  async save(user: User): AsyncResult<User> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Save user to database
      await UserModel.create(
        [
          {
            id: user.id,
            name: user.name,
            email: user.email.value,
            // ... other fields
          },
        ],
        { session }
      );

      // 2. Save events to outbox
      for (const event of user.domainEvents) {
        await this.outboxRepository.save(event, KafkaTopic.USER_EVENTS, session);
      }

      await session.commitTransaction();
      return success(user);
    } catch (error: any) {
      await session.abortTransaction();
      return failure(error);
    } finally {
      session.endSession();
    }
  }

  // ... other methods
}
```

### Step 6: Event Metadata

**Create `src/infrastructure/messaging/kafka/event-metadata.ts`:**

```typescript
export interface EventMetadata {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  correlationId?: string;
  causationId?: string;
  userId?: string;
  timestamp: string;
  version: number;
}

export function createEventMetadata(
  event: any,
  correlationId?: string,
  causationId?: string
): EventMetadata {
  return {
    eventId: event.eventId,
    eventType: event.eventName,
    aggregateId: extractAggregateId(event),
    aggregateType: extractAggregateType(event),
    correlationId: correlationId || event.eventId,
    causationId: causationId,
    userId: event.payload.userId,
    timestamp: new Date().toISOString(),
    version: event.version,
  };
}

function extractAggregateId(event: any): string {
  const payload = event.payload;
  return payload.userId || payload.orderId || payload.productId || 'unknown';
}

function extractAggregateType(event: any): string {
  if (event.eventName.includes('User')) return 'User';
  if (event.eventName.includes('Order')) return 'Order';
  if (event.eventName.includes('Product')) return 'Product';
  return 'Unknown';
}
```

---

## Testing

**Create `tests/integration/messaging/outbox-publisher.test.ts`:**

```typescript
import { OutboxPublisher } from '@infrastructure/messaging/outbox/outbox-publisher';
import { OutboxRepository } from '@infrastructure/database/mongodb/repositories/outbox.repository';
import { KafkaProducer } from '@infrastructure/messaging/kafka/kafka-producer';
import { connectTestDatabase, disconnectTestDatabase } from '../../utils/test-helpers';

describe('Outbox Publisher', () => {
  let outboxRepository: OutboxRepository;
  let kafkaProducer: KafkaProducer;
  let publisher: OutboxPublisher;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('should publish events from outbox to Kafka', async () => {
    // Test implementation
  });

  it('should retry failed events', async () => {
    // Test implementation
  });

  it('should move to DLQ after max retries', async () => {
    // Test implementation
  });
});
```

---

## Deliverables

- [ ] Outbox table schema
- [ ] Outbox repository
- [ ] Kafka producer
- [ ] Outbox publisher (background worker)
- [ ] Integration with repositories
- [ ] Event metadata
- [ ] Dead letter queue handling
- [ ] Tests
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 3: Implement Event Consumption**
2. Monitor outbox lag
3. Setup alerts for DLQ

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
