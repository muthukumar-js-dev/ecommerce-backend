# Phase 3 - Task 3: Implement Event Consumption

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Tasks 1, 2 (Kafka + Event Publishing)

---

## Objective

Implement reliable event consumption from Kafka with idempotent processing, error handling, and dead letter queue support.

---

## Implementation Steps

### Step 1: Kafka Consumer

**Create `src/infrastructure/messaging/kafka/kafka-consumer.ts`:**

```typescript
import { Kafka, Consumer, EachMessagePayload, ConsumerConfig } from 'kafkajs';
import { KafkaTopic } from './topics';

export interface MessageHandler {
  handle(payload: EachMessagePayload): Promise<void>;
}

export class KafkaConsumer {
  private consumer: Consumer;
  private connected: boolean = false;
  private handlers = new Map<KafkaTopic, MessageHandler>();

  constructor(
    private kafka: Kafka,
    private groupId: string
  ) {
    const config: ConsumerConfig = {
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    };

    this.consumer = kafka.consumer(config);
  }

  registerHandler(topic: KafkaTopic, handler: MessageHandler): void {
    this.handlers.set(topic, handler);
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    this.connected = true;

    const topics = Array.from(this.handlers.keys());
    await this.consumer.subscribe({ topics, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async (payload) => {
        const handler = this.handlers.get(payload.topic as KafkaTopic);
        if (handler) {
          await handler.handle(payload);
        }
      },
    });

    console.log(`Kafka consumer started for group: ${this.groupId}`);
  }

  async stop(): Promise<void> {
    if (this.connected) {
      await this.consumer.disconnect();
      this.connected = false;
      console.log('Kafka consumer stopped');
    }
  }
}
```

### Step 2: Idempotent Event Handler

**Create `src/infrastructure/messaging/handlers/base-event-handler.ts`:**

```typescript
import { EachMessagePayload } from 'kafkajs';
import { MessageHandler } from '../kafka/kafka-consumer';
import { ProcessedEventRepository } from '@infrastructure/database/mongodb/repositories/processed-event.repository';

export abstract class BaseEventHandler implements MessageHandler {
  constructor(protected processedEventRepo: ProcessedEventRepository) {}

  async handle(payload: EachMessagePayload): Promise<void> {
    const eventId = this.extractEventId(payload);

    // Check if already processed
    const isProcessed = await this.processedEventRepo.exists(eventId);
    if (isProcessed) {
      console.log(`Event ${eventId} already processed, skipping`);
      return;
    }

    try {
      // Process event
      await this.processEvent(payload);

      // Mark as processed
      await this.processedEventRepo.save({
        eventId,
        eventType: this.extractEventType(payload),
        processedAt: new Date(),
        handler: this.constructor.name,
      });

      console.log(`Event ${eventId} processed successfully`);
    } catch (error: any) {
      console.error(`Error processing event ${eventId}:`, error);
      throw error; // Kafka will retry
    }
  }

  protected abstract processEvent(payload: EachMessagePayload): Promise<void>;

  protected extractEventId(payload: EachMessagePayload): string {
    const headers = payload.message.headers || {};
    return headers.eventId?.toString() || payload.message.key?.toString() || 'unknown';
  }

  protected extractEventType(payload: EachMessagePayload): string {
    const headers = payload.message.headers || {};
    return headers.eventType?.toString() || 'unknown';
  }

  protected parseMessage<T>(payload: EachMessagePayload): T {
    return JSON.parse(payload.message.value?.toString() || '{}');
  }
}
```

### Step 3: Event Handlers

**Create `src/infrastructure/messaging/handlers/user-registered.handler.ts`:**

```typescript
import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from './base-event-handler';
import { ProcessedEventRepository } from '@infrastructure/database/mongodb/repositories/processed-event.repository';
import { WishlistRepository } from '@infrastructure/database/mongodb/repositories/wishlist.repository';

export class UserRegisteredHandler extends BaseEventHandler {
  constructor(
    processedEventRepo: ProcessedEventRepository,
    private wishlistRepo: WishlistRepository
  ) {
    super(processedEventRepo);
  }

  protected async processEvent(payload: EachMessagePayload): Promise<void> {
    const event = this.parseMessage<{
      userId: string;
      email: string;
      name: string;
    }>(payload);

    // Create wishlist for new user
    await this.wishlistRepo.create({
      userId: event.userId,
      items: [],
      createdAt: new Date(),
    });

    console.log(`Created wishlist for user ${event.userId}`);
  }
}
```

### Step 4: Retry and DLQ

**Create `src/infrastructure/messaging/handlers/retry-handler.ts`:**

```typescript
import { EachMessagePayload } from 'kafkajs';
import { KafkaProducer } from '../kafka/kafka-producer';
import { KafkaTopic } from '../kafka/topics';

export class RetryHandler {
  private static readonly MAX_RETRIES = 3;

  constructor(private kafkaProducer: KafkaProducer) {}

  async handleWithRetry(
    handler: (payload: EachMessagePayload) => Promise<void>,
    payload: EachMessagePayload
  ): Promise<void> {
    const retryCount = this.getRetryCount(payload);

    try {
      await handler(payload);
    } catch (error: any) {
      if (retryCount >= RetryHandler.MAX_RETRIES) {
        await this.sendToDLQ(payload, error);
        return;
      }

      // Retry with exponential backoff
      const delayMs = Math.pow(2, retryCount) * 1000;
      await this.sleep(delayMs);

      // Re-publish with incremented retry count
      await this.republishWithRetry(payload, retryCount + 1);
    }
  }

  private async sendToDLQ(payload: EachMessagePayload, error: Error): Promise<void> {
    await this.kafkaProducer.send(
      KafkaTopic.DLQ_EVENTS,
      payload.message.key?.toString() || 'unknown',
      {
        originalTopic: payload.topic,
        originalPartition: payload.partition,
        originalOffset: payload.message.offset,
        originalMessage: payload.message.value?.toString(),
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }
    );

    console.log(`Message sent to DLQ: ${payload.message.key}`);
  }

  private async republishWithRetry(
    payload: EachMessagePayload,
    retryCount: number
  ): Promise<void> {
    const headers = payload.message.headers || {};
    headers.retryCount = Buffer.from(retryCount.toString());

    await this.kafkaProducer.send(
      payload.topic as KafkaTopic,
      payload.message.key?.toString() || 'unknown',
      JSON.parse(payload.message.value?.toString() || '{}'),
      this.deserializeHeaders(headers)
    );
  }

  private getRetryCount(payload: EachMessagePayload): number {
    const headers = payload.message.headers || {};
    const retryCountHeader = headers.retryCount?.toString();
    return retryCountHeader ? parseInt(retryCountHeader, 10) : 0;
  }

  private deserializeHeaders(headers: any): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      result[key] = value?.toString() || '';
    }
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Step 5: Consumer Groups

**Create `src/infrastructure/messaging/consumer-groups.ts`:**

```typescript
import { KafkaConsumer } from './kafka/kafka-consumer';
import { Kafka } from 'kafkajs';
import { KafkaTopic } from './kafka/topics';
import { UserRegisteredHandler } from './handlers/user-registered.handler';
import { OrderPlacedHandler } from './handlers/order-placed.handler';
import { ProcessedEventRepository } from '@infrastructure/database/mongodb/repositories/processed-event.repository';

export class ConsumerGroups {
  private consumers: KafkaConsumer[] = [];

  constructor(private kafka: Kafka) {}

  async startAll(): Promise<void> {
    // User events consumer
    const userConsumer = new KafkaConsumer(this.kafka, 'user-service-group');
    userConsumer.registerHandler(
      KafkaTopic.USER_EVENTS,
      new UserRegisteredHandler(new ProcessedEventRepository())
    );
    await userConsumer.start();
    this.consumers.push(userConsumer);

    // Order events consumer
    const orderConsumer = new KafkaConsumer(this.kafka, 'order-service-group');
    orderConsumer.registerHandler(
      KafkaTopic.ORDER_EVENTS,
      new OrderPlacedHandler(new ProcessedEventRepository())
    );
    await orderConsumer.start();
    this.consumers.push(orderConsumer);

    console.log('All consumer groups started');
  }

  async stopAll(): Promise<void> {
    for (const consumer of this.consumers) {
      await consumer.stop();
    }
    console.log('All consumer groups stopped');
  }
}
```

---

## Deliverables

- [ ] Kafka consumer implementation
- [ ] Idempotent event handlers
- [ ] Retry mechanism with exponential backoff
- [ ] Dead letter queue handling
- [ ] Consumer groups setup
- [ ] Processed events tracking
- [ ] Tests
- [ ] Documentation

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
