# ADR 004: Anti-Corruption Layer (ACL)

## Status
**Accepted** - January 2024

## Context

Our e-commerce system integrates with multiple external services:
- **Stripe** for payment processing
- **AWS S3** for file storage
- **Email service** for notifications

Challenges:
- External APIs change without our control
- External models don't match our domain model
- External service failures affect our system
- Testing requires actual API calls
- Vendor lock-in risk

Direct integration would pollute our domain with external concerns and create tight coupling.

## Decision

We will implement an **Anti-Corruption Layer (ACL)** to protect our domain from external service complexities.

### Implementation Details:

1. **Port Interfaces**
   - Define contracts in our domain language
   - `IPaymentGateway`, `IStorageService`, `IEmailService`
   - Domain-centric, not vendor-specific

2. **Adapters**
   - Implement port interfaces
   - Translate between domain and external models
   - `StripeAdapter`, `S3Adapter`, `EmailAdapter`
   - Handle vendor-specific logic

3. **Resilience Patterns**
   - Circuit Breaker for fault tolerance
   - Retry logic with exponential backoff
   - Timeout handling
   - Fallback strategies

4. **Error Translation**
   - Convert external errors to domain errors
   - Consistent error handling
   - Hide implementation details

## Consequences

### Positive

✅ **Domain Protection**
- Domain remains pure and focused
- No external dependencies in domain layer
- Business logic independent of vendors
- Clean domain model

✅ **Flexibility**
- Easy to switch vendors
- Can support multiple vendors
- A/B testing different providers
- Gradual migration

✅ **Testability**
- Mock adapters for testing
- No need for actual API calls in tests
- Faster test execution
- Deterministic tests

✅ **Resilience**
- Circuit breaker prevents cascading failures
- Retry logic handles transient errors
- System continues despite external failures
- Graceful degradation

✅ **Maintainability**
- External changes isolated to adapters
- Clear separation of concerns
- Easier to understand and modify
- Single responsibility

### Negative

❌ **Additional Code**
- Port interfaces to define
- Adapters to implement
- More classes and files
- Translation logic

❌ **Performance Overhead**
- Translation between models
- Additional abstraction layers
- Potential latency
- Memory for translations

❌ **Complexity**
- More moving parts
- Resilience patterns to understand
- Error handling complexity
- Learning curve

### Neutral

⚖️ **Development Time**
- Slower initially (setup)
- Faster when changing vendors
- Easier to add new vendors

## Alternatives Considered

### 1. Direct Integration
**Pros:** Simple, less code, faster initially
**Cons:** Tight coupling, vendor lock-in, domain pollution
**Verdict:** ❌ Violates clean architecture

### 2. Service Layer Abstraction
**Pros:** Some decoupling, simpler than ACL
**Cons:** Still couples domain to external models, limited protection
**Verdict:** ❌ Insufficient protection

### 3. Backend for Frontend (BFF)
**Pros:** Additional layer of protection
**Cons:** Overkill for current needs, operational overhead
**Verdict:** ❌ Too complex for current scale

## Implementation Plan

### Phase 1: Port Interfaces
- [x] Define IPaymentGateway
- [x] Define IStorageService
- [x] Define IEmailService
- [x] Define domain models (PaymentIntent, UploadedFile, etc.)

### Phase 2: Adapters
- [x] Implement StripeAdapter
- [x] Implement S3Adapter
- [x] Implement ConsoleEmailAdapter
- [x] Handle error translation

### Phase 3: Resilience
- [x] Implement Circuit Breaker
- [x] Implement Retry logic
- [x] Create ResilientPaymentGateway
- [x] Create ResilientStorageService

### Phase 4: Integration
- [x] Wire adapters in DI container
- [x] Update application services
- [x] Add configuration
- [x] Create tests

## Validation

### Success Criteria
- ✅ Domain layer has no external dependencies
- ✅ Can swap vendors without domain changes
- ✅ Circuit breaker prevents cascading failures
- ✅ Retry logic handles transient errors
- ✅ Tests don't require actual API calls

### Metrics
- External service uptime: 99.9%
- Circuit breaker trips: < 5/day
- Retry success rate: > 90%
- Test execution time: < 30s (no API calls)

## Resilience Configuration

### Circuit Breaker
```typescript
{
  failureThreshold: 5,      // Open after 5 failures
  timeout: 60000,           // Stay open for 60s
  halfOpenRequests: 3       // Test with 3 requests
}
```

### Retry Policy
```typescript
{
  maxAttempts: 3,
  initialDelay: 1000,       // 1 second
  backoffMultiplier: 2,     // Exponential backoff
  shouldRetry: (error) => isTransient(error)
}
```

## Examples

### Port Interface
```typescript
export interface IPaymentGateway {
  createCustomer(email: string, name: string): AsyncResult<Customer>;
  createPaymentIntent(amount: Money, customerId: string): AsyncResult<PaymentIntent>;
  capturePayment(paymentIntentId: string): AsyncResult<Payment>;
  refundPayment(paymentIntentId: string): AsyncResult<Refund>;
}
```

### Adapter Implementation
```typescript
export class StripeAdapter implements IPaymentGateway {
  constructor(private stripe: Stripe) {}

  async createPaymentIntent(
    amount: Money,
    customerId: string
  ): AsyncResult<PaymentIntent> {
    try {
      // Translate domain model to Stripe model
      const stripeIntent = await this.stripe.paymentIntents.create({
        amount: this.toStripeCents(amount),
        currency: amount.currency.toLowerCase(),
        customer: customerId
      });

      // Translate Stripe model to domain model
      return success({
        id: stripeIntent.id,
        amount: Money.create(amount.amount, amount.currency),
        status: this.mapStatus(stripeIntent.status),
        clientSecret: stripeIntent.client_secret
      });
    } catch (error) {
      // Translate Stripe error to domain error
      return failure(new ExternalServiceError(
        'Payment gateway error',
        'PAYMENT_FAILED',
        error
      ));
    }
  }

  private toStripeCents(money: Money): number {
    // Stripe expects cents
    return Math.round(money.amount * 100);
  }

  private mapStatus(stripeStatus: string): PaymentStatus {
    // Map Stripe statuses to our domain statuses
    switch (stripeStatus) {
      case 'requires_payment_method': return 'pending';
      case 'succeeded': return 'completed';
      default: return 'failed';
    }
  }
}
```

### Usage in Application
```typescript
export class PlaceOrderHandler {
  constructor(
    private paymentGateway: IPaymentGateway  // Port, not adapter
  ) {}

  async handle(command: PlaceOrderCommand): AsyncResult<OrderResult> {
    // Use port interface, don't know about Stripe
    const paymentResult = await this.paymentGateway.createPaymentIntent(
      order.totalAmount,
      user.stripeCustomerId
    );

    if (!paymentResult.success) {
      return failure(paymentResult.error);
    }

    // Continue with order processing...
  }
}
```

## Vendor Switching Example

To switch from Stripe to another payment provider:

1. Implement new adapter (e.g., `PayPalAdapter`)
2. Update DI container configuration
3. **No changes to domain or application layer**

```typescript
// Before
container.register('IPaymentGateway', new StripeAdapter(stripeClient));

// After
container.register('IPaymentGateway', new PayPalAdapter(paypalClient));
```

## Testing Benefits

### Before ACL
```typescript
// Requires actual Stripe API call
test('should process payment', async () => {
  const stripe = new Stripe(process.env.STRIPE_KEY);
  const result = await processPayment(stripe, amount);
  expect(result).toBeDefined();
});
```

### After ACL
```typescript
// Mock the port interface
test('should process payment', async () => {
  const mockGateway: IPaymentGateway = {
    createPaymentIntent: jest.fn().mockResolvedValue(success({...}))
  };
  const result = await processPayment(mockGateway, amount);
  expect(result.success).toBe(true);
});
```

## References

- [Hexagonal Architecture by Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Anti-Corruption Layer Pattern by Microsoft](https://docs.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)

## Related ADRs

- [ADR 001: Adopt DDD](./001-adopt-ddd.md)
- [ADR 002: Implement CQRS](./002-implement-cqrs.md)
- [ADR 003: Event-Driven Architecture](./003-event-driven-architecture.md)
