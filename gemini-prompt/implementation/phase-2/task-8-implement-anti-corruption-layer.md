# Phase 2 - Task 8: Implement Anti-Corruption Layer

**Duration:** 3-4 days  
**Priority:** Medium  
**Dependencies:** Tasks 2-7 (Domain and Application Layers)

---

## Objective

Create an Anti-Corruption Layer (ACL) to protect the domain model from external systems (Stripe, AWS S3, email services) by translating between external and internal models.

---

## Context

External services have their own models and APIs that don't match our domain. The ACL:
- Translates external models to domain models
- Isolates domain from external changes
- Provides a clean interface for external integrations
- Implements circuit breakers and retry logic

---

## Implementation Steps

### Step 1: Create ACL Interfaces

**Create `src/application/ports/payment-gateway.port.ts`:**

```typescript
import { Money } from '@domain/product/value-objects/money.vo';
import { ID } from '@shared/types/common';
import { AsyncResult } from '@shared/types/result';

export interface PaymentIntent {
  id: string;
  amount: Money;
  status: 'pending' | 'succeeded' | 'failed';
  clientSecret?: string;
}

export interface IPaymentGateway {
  createCustomer(email: string, name: string): AsyncResult<{ customerId: string }>;
  createPaymentIntent(
    amount: Money,
    customerId: string,
    metadata?: Record<string, string>
  ): AsyncResult<PaymentIntent>;
  capturePayment(paymentIntentId: string): AsyncResult<void>;
  refundPayment(paymentIntentId: string, amount?: Money): AsyncResult<{ refundId: string }>;
}
```

**Create `src/application/ports/storage.port.ts`:**

```typescript
import { AsyncResult } from '@shared/types/result';

export interface UploadedFile {
  url: string;
  key: string;
  size: number;
}

export interface IStorageService {
  uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string
  ): AsyncResult<UploadedFile>;
  deleteFile(key: string): AsyncResult<void>;
  getSignedUrl(key: string, expiresIn?: number): AsyncResult<string>;
}
```

**Create `src/application/ports/email.port.ts`:**

```typescript
import { AsyncResult } from '@shared/types/result';

export interface EmailMessage {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface IEmailService {
  send(message: EmailMessage): AsyncResult<{ messageId: string }>;
  sendBulk(messages: EmailMessage[]): AsyncResult<{ messageIds: string[] }>;
}
```

### Step 2: Implement Stripe ACL

**Create `src/infrastructure/adapters/stripe/stripe.adapter.ts`:**

```typescript
import Stripe from 'stripe';
import { IPaymentGateway, PaymentIntent } from '@application/ports/payment-gateway.port';
import { Money } from '@domain/product/value-objects/money.vo';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors';

export class StripeAdapter implements IPaymentGateway {
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
  }

  async createCustomer(email: string, name: string): AsyncResult<{ customerId: string }> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      return success({ customerId: customer.id });
    } catch (error: any) {
      return failure(
        new ExternalServiceError('Stripe', 'Failed to create customer', error)
      );
    }
  }

  async createPaymentIntent(
    amount: Money,
    customerId: string,
    metadata?: Record<string, string>
  ): AsyncResult<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount.amount * 100), // Convert to cents
        currency: amount.currency.toLowerCase(),
        customer: customerId,
        metadata,
      });

      return success(this.toPaymentIntent(paymentIntent, amount.currency));
    } catch (error: any) {
      return failure(
        new ExternalServiceError('Stripe', 'Failed to create payment intent', error)
      );
    }
  }

  async capturePayment(paymentIntentId: string): AsyncResult<void> {
    try {
      await this.stripe.paymentIntents.capture(paymentIntentId);
      return success(undefined);
    } catch (error: any) {
      return failure(
        new ExternalServiceError('Stripe', 'Failed to capture payment', error)
      );
    }
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: Money
  ): AsyncResult<{ refundId: string }> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount.amount * 100) : undefined,
      });

      return success({ refundId: refund.id });
    } catch (error: any) {
      return failure(
        new ExternalServiceError('Stripe', 'Failed to process refund', error)
      );
    }
  }

  private toPaymentIntent(stripeIntent: Stripe.PaymentIntent, currency: string): PaymentIntent {
    return {
      id: stripeIntent.id,
      amount: Money.create(stripeIntent.amount / 100, currency as any),
      status: this.mapStatus(stripeIntent.status),
      clientSecret: stripeIntent.client_secret || undefined,
    };
  }

  private mapStatus(
    stripeStatus: Stripe.PaymentIntent.Status
  ): 'pending' | 'succeeded' | 'failed' {
    switch (stripeStatus) {
      case 'succeeded':
        return 'succeeded';
      case 'canceled':
      case 'payment_failed':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
```

### Step 3: Implement AWS S3 ACL

**Create `src/infrastructure/adapters/aws/s3.adapter.ts`:**

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService, UploadedFile } from '@application/ports/storage.port';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors';

export class S3Adapter implements IStorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(region: string, bucketName: string) {
    this.s3Client = new S3Client({ region });
    this.bucketName = bucketName;
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string
  ): AsyncResult<UploadedFile> {
    try {
      const key = this.generateKey(fileName);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file,
          ContentType: contentType,
        })
      );

      const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

      return success({
        url,
        key,
        size: file.length,
      });
    } catch (error: any) {
      return failure(
        new ExternalServiceError('AWS S3', 'Failed to upload file', error)
      );
    }
  }

  async deleteFile(key: string): AsyncResult<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      return success(undefined);
    } catch (error: any) {
      return failure(
        new ExternalServiceError('AWS S3', 'Failed to delete file', error)
      );
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): AsyncResult<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return success(url);
    } catch (error: any) {
      return failure(
        new ExternalServiceError('AWS S3', 'Failed to generate signed URL', error)
      );
    }
  }

  private generateKey(fileName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = fileName.split('.').pop();
    return `uploads/${timestamp}-${random}.${extension}`;
  }
}
```

### Step 4: Implement Circuit Breaker

**Create `src/infrastructure/resilience/circuit-breaker.ts`:**

```typescript
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly halfOpenSuccessThreshold: number = 2
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successCount = 0;
    }

    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.timeout;
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

### Step 5: Implement Retry Logic

**Create `src/infrastructure/resilience/retry.ts`:**

```typescript
export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: any;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${currentDelay}ms`);
      await sleep(currentDelay);
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Step 6: Resilient Adapter Wrapper

**Create `src/infrastructure/adapters/resilient-payment-gateway.ts`:**

```typescript
import { IPaymentGateway, PaymentIntent } from '@application/ports/payment-gateway.port';
import { Money } from '@domain/product/value-objects/money.vo';
import { AsyncResult } from '@shared/types/result';
import { CircuitBreaker } from '../resilience/circuit-breaker';
import { withRetry } from '../resilience/retry';

export class ResilientPaymentGateway implements IPaymentGateway {
  private circuitBreaker: CircuitBreaker;

  constructor(private readonly innerGateway: IPaymentGateway) {
    this.circuitBreaker = new CircuitBreaker(5, 60000, 2);
  }

  async createCustomer(email: string, name: string): AsyncResult<{ customerId: string }> {
    return this.circuitBreaker.execute(() =>
      withRetry(() => this.innerGateway.createCustomer(email, name), {
        maxAttempts: 3,
        delayMs: 1000,
      })
    );
  }

  async createPaymentIntent(
    amount: Money,
    customerId: string,
    metadata?: Record<string, string>
  ): AsyncResult<PaymentIntent> {
    return this.circuitBreaker.execute(() =>
      withRetry(
        () => this.innerGateway.createPaymentIntent(amount, customerId, metadata),
        {
          maxAttempts: 3,
          delayMs: 1000,
        }
      )
    );
  }

  async capturePayment(paymentIntentId: string): AsyncResult<void> {
    return this.circuitBreaker.execute(() =>
      withRetry(() => this.innerGateway.capturePayment(paymentIntentId), {
        maxAttempts: 3,
        delayMs: 1000,
      })
    );
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: Money
  ): AsyncResult<{ refundId: string }> {
    return this.circuitBreaker.execute(() =>
      withRetry(() => this.innerGateway.refundPayment(paymentIntentId, amount), {
        maxAttempts: 3,
        delayMs: 1000,
      })
    );
  }
}
```

---

## Testing Requirements

**Create `tests/unit/adapters/stripe.adapter.test.ts`:**

```typescript
import { StripeAdapter } from '@infrastructure/adapters/stripe/stripe.adapter';
import { Money } from '@domain/product/value-objects/money.vo';
import { isSuccess } from '@shared/types/result';

describe('StripeAdapter', () => {
  let adapter: StripeAdapter;

  beforeEach(() => {
    adapter = new StripeAdapter(process.env.STRIPE_TEST_KEY || 'test_key');
  });

  it('should create customer', async () => {
    // Mock Stripe SDK
    // Test implementation
  });

  it('should create payment intent', async () => {
    // Test implementation
  });
});
```

---

## Deliverables

- [ ] Port interfaces for external services
- [ ] Stripe adapter with translation
- [ ] AWS S3 adapter
- [ ] Email service adapter
- [ ] Circuit breaker implementation
- [ ] Retry logic
- [ ] Resilient wrappers
- [ ] Unit tests
- [ ] Integration tests
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 9: Testing & Validation**
2. Add monitoring for circuit breakers
3. Implement fallback strategies

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
