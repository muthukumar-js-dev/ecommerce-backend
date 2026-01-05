# Saga Pattern Implementation

## Overview

The Saga pattern provides distributed transaction coordination across microservices with automatic compensation on failure.

## Architecture

### Components

1. **Base Saga Framework**
   - `SagaStep` interface - Define execute and compensate logic
   - `BaseSaga` class - Orchestrates step execution
   - `SagaRepository` - Persists saga state in MongoDB

2. **Order Placement Saga**
   - 5 steps executed sequentially
   - Automatic compensation on failure
   - Retry logic with exponential backoff

3. **Monitoring**
   - Saga metrics and statistics
   - Stuck saga detection
   - Failed saga tracking

## Order Placement Flow

```
1. ValidateUser
   ├─ Execute: Check user exists and can order
   └─ Compensate: No-op

2. ReserveInventory
   ├─ Execute: Reserve stock for all items
   └─ Compensate: Release reserved stock

3. ProcessPayment
   ├─ Execute: Initiate payment via payment-service
   └─ Compensate: Refund payment

4. CreateOrder
   ├─ Execute: Create order in database
   └─ Compensate: Cancel order

5. UpdateUserStats
   ├─ Execute: Increment user order count
   └─ Compensate: Decrement user order count
```

## Compensation Strategy

When a step fails:
1. All completed steps are compensated in **reverse order**
2. Each compensation is attempted even if previous ones fail
3. Saga status is set to `COMPENSATED`
4. Original error is preserved

## Retry Logic

- **Max retries:** 3 attempts per step
- **Backoff:** Exponential (2^n * 1000ms)
  - Attempt 1: Immediate
  - Attempt 2: 2 seconds
  - Attempt 3: 4 seconds
- **Failure:** After 3 failed attempts, trigger compensation

## State Management

Saga state is persisted in MongoDB after each step:

```typescript
{
  sagaId: string,
  type: 'ORDER_PLACEMENT',
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'COMPENSATED',
  currentStep: number,
  steps: [
    {
      stepName: string,
      status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED',
      retryCount: number,
      executedAt?: Date,
      error?: string
    }
  ],
  context: { sagaId, data, stepData },
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Get Saga Status
```http
GET /api/sagas/:id
```

### List Failed Sagas
```http
GET /api/sagas/failed/list?limit=100
```

### Retry Failed Saga
```http
POST /api/sagas/:id/retry
```

### Get Metrics
```http
GET /api/sagas/metrics/summary
```

### Get Detailed Stats
```http
GET /api/sagas/stats/detailed
```

## Usage Example

```typescript
// Initialize saga
const saga = new OrderPlacementSaga(
  sagaRepository,
  userRepository,
  productRepository,
  orderRepository,
  paymentClient
);

// Execute saga
try {
  const sagaId = await saga.execute({
    userId: 'user-123',
    items: [
      { productId: 'prod-1', quantity: 2, price: 100 }
    ],
    shippingAddress: { ... },
    paymentMethodId: 'pm_xxx'
  });
  
  console.log(`Order placed successfully: ${sagaId}`);
} catch (error) {
  console.error('Order placement failed:', error);
  // Compensation has already run
}
```

## Monitoring

### Check Stuck Sagas
```typescript
const monitor = new SagaMonitor(sagaRepository);
await monitor.checkStuckSagas(30); // 30 minutes threshold
```

### Get Metrics
```typescript
const metrics = await monitor.getMetrics();
// {
//   total: 5,
//   byStatus: { IN_PROGRESS: 3, COMPLETED: 2 },
//   byType: { ORDER_PLACEMENT: 5 },
//   oldestInProgress: Date
// }
```

## Error Handling

### Transient Errors
- Automatically retried up to 3 times
- Examples: Network timeouts, temporary service unavailability

### Permanent Errors
- Trigger immediate compensation
- Examples: Invalid data, business rule violations

### Compensation Failures
- Logged but don't stop other compensations
- Require manual intervention
- Tracked in saga state

## Best Practices

1. **Idempotency:** All steps should be idempotent
2. **Compensation:** Always implement compensation logic
3. **Timeouts:** Set appropriate timeouts for external calls
4. **Monitoring:** Monitor saga execution metrics
5. **Logging:** Log all step executions and compensations

## Future Enhancements

1. Saga recovery worker for stuck sagas
2. More saga types (cancellation, refund)
3. Saga visualization dashboard
4. Distributed tracing integration
5. Event sourcing for saga state

## References

- [Saga Pattern (Microsoft)](https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)
- [Microservices Patterns (Chris Richardson)](https://microservices.io/patterns/data/saga.html)
