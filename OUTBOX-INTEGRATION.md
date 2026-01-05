# Outbox Publisher Integration Guide

## Overview

The outbox publisher has been integrated into the application to provide reliable event publishing using the Transactional Outbox pattern.

## What Was Integrated

### 1. Repository Updates

**User Repository** (`src/infrastructure/database/mongodb/repositories/user.repository.ts`)
- ✅ Updated to use MongoDB transactions
- ✅ Saves events to outbox atomically with user data
- ✅ Clears domain events after successful save

### 2. CQRS Module

**CQRS Module** (`src/infrastructure/cqrs/cqrs-module.ts`)
- ✅ Injects `OutboxRepository` into `UserRepository`
- ✅ Creates outbox repository instances
- ✅ Maintains transactional consistency

### 3. Outbox Publisher Module

**Outbox Publisher Module** (`src/infrastructure/outbox-publisher.module.ts`)
- ✅ Manages outbox publisher lifecycle
- ✅ Configurable via environment variables
- ✅ Automatic cleanup of old events (daily)
- ✅ Graceful shutdown handling

## How to Use

### 1. Start the Application with Outbox Publisher

In your `main.ts` or application startup file:

```typescript
import { initializeOutboxPublisher } from './infrastructure/outbox-publisher.module';

async function bootstrap() {
  // ... other initialization

  // Start outbox publisher
  await initializeOutboxPublisher();

  // ... start server
}

bootstrap();
```

### 2. Environment Variables

Add to your `.env` file:

```bash
# Outbox Publisher Configuration
OUTBOX_POLLING_INTERVAL_MS=1000  # Poll every 1 second
OUTBOX_BATCH_SIZE=100            # Process 100 events per batch
OUTBOX_MAX_RETRIES=5             # Max 5 retry attempts
OUTBOX_CLEANUP_DAYS=30           # Delete events older than 30 days
```

### 3. Using in Repositories

The pattern is already integrated. When you save an aggregate:

```typescript
// In your command handler
const user = await User.create({ ... });

// Save user - events automatically go to outbox
const result = await userRepository.save(user);

// Events are now in outbox, will be published by background worker
```

## How It Works

```
1. Command Handler calls repository.save(aggregate)
   ↓
2. Repository starts MongoDB transaction
   ↓
3. Save aggregate to database
   ↓
4. Save domain events to outbox table
   ↓
5. Commit transaction (atomic!)
   ↓
6. Clear domain events from aggregate
   ↓
7. Outbox Publisher polls outbox (every 1 second)
   ↓
8. Publishes events to Kafka
   ↓
9. Marks events as published
```

## Monitoring

### Get Statistics

```typescript
import { getOutboxPublisherModule } from './infrastructure/outbox-publisher.module';

const module = getOutboxPublisherModule();
const stats = await module.getStats();

console.log(stats);
// {
//   isRunning: true,
//   outboxStats: {
//     unpublished: 5,
//     published: 1000,
//     failed: 2,
//     oldestUnpublished: Date
//   }
// }
```

### Health Check Endpoint

Add to your health check:

```typescript
app.get('/health', async (req, res) => {
  const outboxModule = getOutboxPublisherModule();
  const outboxStats = await outboxModule.getStats();

  res.json({
    status: 'ok',
    outbox: outboxStats,
  });
});
```

## Troubleshooting

### Events not being published

1. Check if outbox publisher is running:
   ```typescript
   const stats = await getOutboxPublisherModule().getStats();
   console.log(stats.isRunning); // Should be true
   ```

2. Check Kafka connectivity:
   ```bash
   docker ps | grep kafka
   ```

3. Check outbox table:
   ```javascript
   db.outbox_events.find({ published: false }).count()
   ```

### High unpublished count

1. Check Kafka broker health
2. Increase batch size: `OUTBOX_BATCH_SIZE=200`
3. Decrease polling interval: `OUTBOX_POLLING_INTERVAL_MS=500`

### Events in DLQ

Check dead letter queue topic:
```bash
docker exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic dlq.events \
  --from-beginning
```

## Next Steps

### Integrate More Repositories

Apply the same pattern to Order and Product repositories:

```typescript
export class OrderRepository {
  constructor(private outboxRepository: OutboxRepository) {}

  async save(order: Order): Promise<Result<Order>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await OrderModel.create([...], { session });

      for (const event of order.domainEvents) {
        await this.outboxRepository.save(
          event,
          KafkaTopic.ORDER_EVENTS,
          session
        );
      }

      await session.commitTransaction();
      order.clearDomainEvents();
      return success(order);
    } catch (error) {
      await session.abortTransaction();
      return failure(error);
    } finally {
      session.endSession();
    }
  }
}
```

### Add Monitoring

- Set up alerts for high unpublished count
- Monitor DLQ for failed events
- Track publishing latency

### Performance Tuning

- Adjust polling interval based on load
- Increase batch size for high throughput
- Add more publisher instances if needed

## Related Documentation

- [Outbox Pattern Guide](../docs/architecture/outbox-pattern.md)
- [Kafka Setup](../KAFKA-SETUP.md)
- [Event Catalog](../docs/events/event-catalog.md)
