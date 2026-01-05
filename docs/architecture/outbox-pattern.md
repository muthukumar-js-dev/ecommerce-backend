# Transactional Outbox Pattern

## Overview

The Transactional Outbox pattern ensures reliable event publishing by storing events in a database table (outbox) within the same transaction as the business data. A background worker then publishes these events to Kafka.

## Benefits

- **At-least-once delivery** guaranteed
- **Transactional consistency** between database and events
- **No event loss** even if Kafka is down
- **Automatic retries** with exponential backoff
- **Dead letter queue** for permanently failed events

## Architecture

```
┌─────────────┐
│  Aggregate  │
│             │
│ 1. Change   │
│    State    │
│             │
│ 2. Raise    │
│    Events   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│   Repository     │
│                  │
│ 3. Start TX      │
│ 4. Save Agg      │
│ 5. Save Events   │
│    to Outbox     │
│ 6. Commit TX     │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Outbox Table    │
│                  │
│ [Unpublished]    │
│ [Events]         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Outbox Publisher │
│  (Background)    │
│                  │
│ 7. Poll Outbox   │
│ 8. Publish to    │
│    Kafka         │
│ 9. Mark Published│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Kafka Topic    │
└──────────────────┘
```

## Components

### 1. Outbox Model

MongoDB schema for storing unpublished events:

```typescript
{
  eventId: string;        // Unique event identifier
  eventType: string;      // Event name (e.g., "UserRegistered")
  aggregateId: string;    // ID of the aggregate
  aggregateType: string;  // Type of aggregate (e.g., "User")
  payload: any;           // Event data
  topic: string;          // Kafka topic
  published: boolean;     // Publication status
  publishedAt?: Date;     // When published
  retryCount: number;     // Number of retry attempts
  lastError?: string;     // Last error message
}
```

### 2. Outbox Repository

Manages outbox events:

- `save()` - Save event to outbox (within transaction)
- `findUnpublished()` - Get unpublished events
- `markPublished()` - Mark event as published
- `incrementRetry()` - Increment retry count
- `deleteOldEvents()` - Cleanup old events

### 3. Kafka Producer

Publishes events to Kafka:

- Idempotent producer configuration
- GZIP compression
- Automatic retries
- Batch publishing support

### 4. Outbox Publisher

Background worker that:

- Polls outbox for unpublished events
- Publishes to Kafka
- Handles retries
- Moves to DLQ after max retries

## Usage

### Step 1: Update Repository

```typescript
import { OutboxRepository } from './outbox.repository';
import { KafkaTopic } from '../../../messaging/kafka/topics';
import mongoose from 'mongoose';

export class UserRepository {
  constructor(private outboxRepository: OutboxRepository) {}

  async save(user: User): Promise<Result<User>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Save user
      const doc = new UserModel(this.toPersistence(user));
      await doc.save({ session });

      // 2. Save events to outbox
      for (const event of user.domainEvents) {
        await this.outboxRepository.save(
          event,
          KafkaTopic.USER_EVENTS,
          session
        );
      }

      // 3. Commit transaction
      await session.commitTransaction();

      // 4. Clear events
      user.clearDomainEvents();

      return success(user);
    } catch (error) {
      await session.abortTransaction();
      return failure(error);
    } finally {
      session.endSession();
    }
  }
}
```

### Step 2: Start Outbox Publisher

```typescript
import { OutboxPublisher } from './messaging/outbox/outbox-publisher';
import { OutboxRepository } from './database/repositories/outbox.repository';
import { KafkaProducer } from './messaging/kafka/kafka-producer';
import { getKafkaInstance } from './messaging/kafka/kafka.config';

// Initialize components
const outboxRepository = new OutboxRepository();
const kafka = getKafkaInstance();
const kafkaProducer = new KafkaProducer(kafka);

// Create and start publisher
const publisher = new OutboxPublisher(outboxRepository, kafkaProducer, {
  pollingIntervalMs: 1000,  // Poll every second
  batchSize: 100,           // Process 100 events per batch
  maxRetries: 5,            // Max retry attempts
});

await publisher.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await publisher.stop();
});
```

## Configuration

### Environment Variables

```bash
# Outbox Publisher
OUTBOX_POLLING_INTERVAL_MS=1000
OUTBOX_BATCH_SIZE=100
OUTBOX_MAX_RETRIES=5

# Cleanup
OUTBOX_CLEANUP_DAYS=30
```

### Monitoring

Monitor outbox statistics:

```typescript
const stats = await outboxRepository.getStats();

console.log({
  unpublished: stats.unpublished,
  published: stats.published,
  failed: stats.failed,
  oldestUnpublished: stats.oldestUnpublished,
});
```

## Error Handling

### Retry Strategy

1. **Initial failure**: Increment retry count, record error
2. **Subsequent failures**: Continue retrying with exponential backoff
3. **Max retries exceeded**: Move to Dead Letter Queue (DLQ)

### Dead Letter Queue

Failed events are moved to `dlq.events` topic:

```json
{
  "originalTopic": "user.events",
  "originalEvent": { ... },
  "error": "Connection timeout",
  "retryCount": 5,
  "failedAt": "2024-01-04T20:00:00Z"
}
```

## Best Practices

### 1. Transaction Scope

Always save aggregate and events in the same transaction:

```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  await saveAggregate(session);
  await saveEvents(session);
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

### 2. Event Ordering

Events are published in FIFO order (sorted by `createdAt`).

### 3. Idempotency

Kafka producer is configured as idempotent to prevent duplicates.

### 4. Cleanup

Regularly clean up old published events:

```typescript
// Delete events older than 30 days
const deleted = await outboxRepository.deleteOldEvents(30);
console.log(`Deleted ${deleted} old events`);
```

### 5. Monitoring

Set up alerts for:
- High unpublished event count
- Events in DLQ
- Old unpublished events (lag)

## Troubleshooting

### Events not being published

1. Check if outbox publisher is running
2. Check Kafka connectivity
3. Check for errors in logs
4. Verify topic exists

### High retry count

1. Check Kafka broker health
2. Verify topic configuration
3. Check network connectivity
4. Review error messages

### Events in DLQ

1. Review error messages
2. Check if topic exists
3. Verify event payload format
4. Consider replaying from DLQ

## Testing

See `tests/integration/messaging/outbox-publisher.test.ts` for comprehensive test examples.

## Related Documentation

- [Kafka Setup Guide](../../../KAFKA-SETUP.md)
- [Event Catalog](../../docs/events/event-catalog.md)
- [CQRS Implementation](../../docs/architecture/cqrs.md)
