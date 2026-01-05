# Kafka Event Consumption Guide

## Overview

This guide explains how Kafka event consumption works in the e-commerce backend using consumer groups, idempotent processing, and automatic retry logic.

## Architecture

```
Kafka Topic (user.events)
         ↓
Consumer Group (user-service-group)
         ↓
KafkaConsumer
         ↓
UserRegisteredConsumerHandler
         ↓
1. Check if processed (idempotency)
2. Process event
3. Update read model
4. Mark as processed
```

## Components

### 1. Processed Events Tracking

**Purpose:** Ensure idempotent event processing (exactly-once semantics)

**Model:** `processed-event.model.ts`
- Stores: eventId, eventType, processedAt, handler
- TTL: Auto-deletes after 30 days

**Repository:** `processed-event.repository.ts`
- `save(event)` - Mark event as processed
- `exists(eventId)` - Check if already processed

### 2. Kafka Consumer

**File:** `kafka-consumer.ts`

**Features:**
- Consumer group support
- Handler registration per topic
- Graceful shutdown
- Automatic retries

**Configuration:**
```typescript
{
  groupId: 'user-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  }
}
```

### 3. Base Event Handler

**File:** `base-event-handler.ts`

**Flow:**
1. Extract event ID from headers
2. Check if already processed
3. If processed → skip
4. If not → process event
5. Mark as processed

**Example:**
```typescript
export class MyEventHandler extends BaseEventHandler {
  protected async processEvent(payload: EachMessagePayload): Promise<void> {
    const event = this.parseMessage<MyEventType>(payload);
    // Process event logic here
  }
}
```

### 4. Concrete Handlers

#### UserRegisteredConsumerHandler
- Listens to: `user.events`
- Updates: User read model
- Creates: User profile data

#### OrderPlacedConsumerHandler
- Listens to: `order.events`
- Updates: Order read model
- Creates: Order history

#### ProductCreatedConsumerHandler
- Listens to: `product.events`
- Updates: Product read model
- Creates: Product catalog

### 5. Retry and DLQ

**Retry Strategy:**
- Max retries: 3
- Exponential backoff: 2^retryCount * 1000ms
- Retry 1: 2s delay
- Retry 2: 4s delay
- Retry 3: 8s delay

**Dead Letter Queue:**
- After 3 failed retries → send to `dlq.events`
- DLQ message includes:
  - Original message
  - Error details
  - Retry count
  - Timestamp

## Consumer Groups

**File:** `consumer-groups.module.ts`

**Groups:**
1. `user-service-group` → USER_EVENTS
2. `order-service-group` → ORDER_EVENTS
3. `product-service-group` → PRODUCT_EVENTS

**Scaling:**
- Each group can have multiple consumers
- Kafka automatically distributes partitions
- Horizontal scaling supported

## Usage

### Start Consumers

Consumers start automatically with the application:

```typescript
// In main.ts
await initializeConsumerGroups();
```

### Add New Handler

1. **Create Handler:**
```typescript
export class MyEventHandler extends BaseEventHandler {
  constructor(
    processedEventRepo: ProcessedEventRepository,
    private myRepo: MyRepository
  ) {
    super(processedEventRepo);
  }

  protected async processEvent(payload: EachMessagePayload): Promise<void> {
    const event = this.parseMessage<MyEvent>(payload);
    await this.myRepo.update(event);
  }
}
```

2. **Register in Consumer Groups:**
```typescript
const consumer = new KafkaConsumer(kafka, 'my-service-group');
consumer.registerHandler(
  KafkaTopic.MY_EVENTS,
  new MyEventHandler(processedEventRepo, myRepo)
);
await consumer.start();
```

## Monitoring

### Check Consumer Status

```typescript
const module = getConsumerGroupsModule();
const activeCount = module.getActiveCount();
console.log(`Active consumers: ${activeCount}`);
```

### View Processed Events

```typescript
const stats = await processedEventRepo.getStats();
console.log({
  total: stats.total,
  byType: stats.byType,
  byHandler: stats.byHandler,
});
```

### Monitor Consumer Lag

```bash
# Check consumer lag
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group user-service-group \
  --describe
```

## Troubleshooting

### Events Not Being Consumed

1. **Check if consumers are running:**
   ```bash
   # Look for consumer startup logs
   grep "Kafka consumer started" logs/app.log
   ```

2. **Verify topic subscription:**
   ```bash
   docker exec kafka kafka-consumer-groups \
     --bootstrap-server localhost:9092 \
     --list
   ```

3. **Check for errors:**
   ```bash
   grep "Error processing message" logs/app.log
   ```

### Duplicate Processing

1. **Check processed_events collection:**
   ```javascript
   db.processed_events.find({ eventId: "your-event-id" })
   ```

2. **Verify idempotency check:**
   - Ensure event ID is unique
   - Check if handler extends BaseEventHandler

### High Consumer Lag

1. **Increase consumer instances:**
   - Add more consumers to the group
   - Kafka will rebalance partitions

2. **Optimize handler performance:**
   - Add database indexes
   - Batch operations
   - Async processing

### Messages in DLQ

1. **View DLQ messages:**
   ```bash
   docker exec kafka kafka-console-consumer \
     --bootstrap-server localhost:9092 \
     --topic dlq.events \
     --from-beginning
   ```

2. **Replay from DLQ:**
   - Fix the issue
   - Republish to original topic
   - Delete from DLQ

## Best Practices

### 1. Idempotency

Always extend `BaseEventHandler` to get automatic idempotency:

```typescript
export class MyHandler extends BaseEventHandler {
  // Idempotency handled automatically
}
```

### 2. Error Handling

Let errors bubble up for automatic retry:

```typescript
protected async processEvent(payload: EachMessagePayload): Promise<void> {
  // Don't catch errors - let retry handler deal with them
  await this.repository.update(data);
}
```

### 3. Logging

Log important events:

```typescript
console.log(`Processing event: ${eventId}`);
console.log(`Updated read model for: ${userId}`);
```

### 4. Testing

Test handlers in isolation:

```typescript
const handler = new MyHandler(processedEventRepo, myRepo);
const payload = createMockPayload(eventId, data);
await handler.handle(payload);
```

## Related Documentation

- [Kafka Setup Guide](../../KAFKA-SETUP.md)
- [Outbox Pattern](./outbox-pattern.md)
- [Event Catalog](../events/event-catalog.md)
