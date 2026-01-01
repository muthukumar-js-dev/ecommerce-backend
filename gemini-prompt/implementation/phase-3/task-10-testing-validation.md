# Phase 3 - Task 10: Testing & Validation

**Duration:** 5-6 days  
**Priority:** Critical  
**Dependencies:** Tasks 1-9 (All Phase 3 Complete)

---

## Objective

Comprehensive testing of the distributed system including integration tests, contract tests, chaos engineering, performance testing, and end-to-end validation.

---

## Context

Testing Strategy:
- **Integration Tests:** Service-to-service communication
- **Contract Tests:** API and event contracts
- **Chaos Engineering:** Resilience testing
- **Performance Tests:** Load, stress, and endurance
- **E2E Tests:** Complete user flows

---

## Implementation Steps

### Step 1: Integration Testing Framework

**Install dependencies:**

```bash
npm install --save-dev jest supertest @types/jest @types/supertest
npm install --save-dev testcontainers
```

**Create `tests/integration/setup.ts`:**

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

let mongoServer: MongoMemoryServer;
let kafkaContainer: StartedTestContainer;

export async function setupTestEnvironment(): Promise<void> {
  // Start MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Start Kafka
  kafkaContainer = await new GenericContainer('confluentinc/cp-kafka:7.5.0')
    .withExposedPorts(9092)
    .withEnvironment({
      KAFKA_BROKER_ID: '1',
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092',
    })
    .start();

  console.log('Test environment setup complete');
}

export async function teardownTestEnvironment(): Promise<void> {
  await mongoose.disconnect();
  await mongoServer.stop();
  await kafkaContainer.stop();
  console.log('Test environment teardown complete');
}

export async function clearDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
```

### Step 2: Service Integration Tests

**Create `tests/integration/order-placement-flow.test.ts`:**

```typescript
import request from 'supertest';
import { app } from '@src/main';
import { setupTestEnvironment, teardownTestEnvironment, clearDatabase } from './setup';

describe('Order Placement Flow', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should complete full order placement flow', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(201);

    const { token, userId } = registerResponse.body;

    // 2. Create product
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Product',
        price: 1000,
        inventory: 10,
      })
      .expect(201);

    const { productId } = productResponse.body;

    // 3. Add to cart
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        quantity: 2,
      })
      .expect(200);

    // 4. Place order
    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
        },
        paymentMethodId: 'pm_test',
      })
      .expect(201);

    const { orderId, orderNumber } = orderResponse.body;

    // 5. Verify order created
    expect(orderId).toBeDefined();
    expect(orderNumber).toBeDefined();

    // 6. Wait for events to be processed
    await sleep(2000);

    // 7. Verify payment initiated
    const paymentResponse = await request(app)
      .get(`/api/payments/order/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(paymentResponse.body.status).toBe('AUTHORIZED');

    // 8. Verify inventory reserved
    const productCheck = await request(app)
      .get(`/api/products/${productId}`)
      .expect(200);

    expect(productCheck.body.inventory).toBe(8); // 10 - 2

    // 9. Verify notification sent (check outbox or mock)
    // Implementation depends on notification service setup
  });

  it('should handle payment failure gracefully', async () => {
    // Test saga compensation when payment fails
  });

  it('should handle out of stock scenario', async () => {
    // Test when product is out of stock
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Step 3: Contract Testing

**Install Pact:**

```bash
npm install --save-dev @pact-foundation/pact
```

**Create `tests/contract/payment-service.contract.test.ts`:**

```typescript
import { Pact, Matchers } from '@pact-foundation/pact';
import path from 'path';
import { PaymentServiceClient } from '@infrastructure/clients/payment-service.client';

const { like, eachLike } = Matchers;

describe('Payment Service Contract', () => {
  const provider = new Pact({
    consumer: 'core-service',
    provider: 'payment-service',
    port: 8989,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('Initiate Payment', () => {
    it('should initiate payment for valid order', async () => {
      await provider.addInteraction({
        state: 'order exists and user has valid payment method',
        uponReceiving: 'a request to initiate payment',
        withRequest: {
          method: 'POST',
          path: '/api/payments/initiate',
          headers: {
            'Content-Type': 'application/json',
            Authorization: like('Bearer token'),
          },
          body: {
            orderId: like('order-123'),
            userId: like('user-123'),
            amount: like(1000),
            currency: 'INR',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            paymentId: like('pay-123'),
            status: 'AUTHORIZED',
            amount: like(1000),
          },
        },
      });

      const client = new PaymentServiceClient('http://localhost:8989');
      const result = await client.initiatePayment({
        orderId: 'order-123',
        userId: 'user-123',
        amount: 1000,
        currency: 'INR',
      });

      expect(result.paymentId).toBeDefined();
      expect(result.status).toBe('AUTHORIZED');
    });
  });

  describe('Get Payment Status', () => {
    it('should return payment status', async () => {
      await provider.addInteraction({
        state: 'payment exists',
        uponReceiving: 'a request for payment status',
        withRequest: {
          method: 'GET',
          path: '/api/payments/pay-123',
          headers: {
            Authorization: like('Bearer token'),
          },
        },
        willRespondWith: {
          status: 200,
          body: {
            paymentId: 'pay-123',
            status: like('CAPTURED'),
            amount: like(1000),
            createdAt: like('2026-01-01T00:00:00Z'),
          },
        },
      });

      const client = new PaymentServiceClient('http://localhost:8989');
      const result = await client.getPaymentStatus('pay-123');

      expect(result.paymentId).toBe('pay-123');
      expect(result.status).toBeDefined();
    });
  });
});
```

**Create event contract tests:**

```typescript
describe('Order Events Contract', () => {
  it('should publish OrderPlaced event with correct schema', () => {
    const event = {
      eventId: 'evt-123',
      eventName: 'OrderPlaced',
      version: 1,
      payload: {
        orderId: 'order-123',
        orderNumber: 'ORD-001',
        userId: 'user-123',
        totalAmount: 1000,
        itemCount: 2,
        placedAt: new Date().toISOString(),
      },
    };

    // Validate against schema
    expect(event).toMatchSchema(OrderPlacedSchema);
  });
});
```

### Step 4: Chaos Engineering

**Install Chaos Toolkit:**

```bash
pip install chaostoolkit chaostoolkit-kubernetes
```

**Create `chaos/experiments/kill-payment-service.yaml`:**

```yaml
version: 1.0.0
title: Payment Service Failure
description: Test system behavior when payment service fails

steady-state-hypothesis:
  title: System is healthy
  probes:
    - type: probe
      name: core-service-is-healthy
      tolerance: 200
      provider:
        type: http
        url: http://localhost:3000/health

    - type: probe
      name: payment-service-is-healthy
      tolerance: 200
      provider:
        type: http
        url: http://localhost:3001/health

method:
  - type: action
    name: kill-payment-service
    provider:
      type: process
      path: docker
      arguments: stop payment-service

  - type: probe
    name: verify-circuit-breaker-opens
    tolerance: true
    provider:
      type: http
      url: http://localhost:3000/metrics
      expected_status: 200

  - type: action
    name: wait-for-recovery
    provider:
      type: process
      path: sleep
      arguments: "30"

  - type: action
    name: restart-payment-service
    provider:
      type: process
      path: docker
      arguments: start payment-service

rollbacks:
  - type: action
    name: ensure-payment-service-running
    provider:
      type: process
      path: docker
      arguments: start payment-service
```

**Create Node.js chaos tests:**

```typescript
describe('Chaos Engineering', () => {
  it('should handle payment service failure', async () => {
    // Stop payment service
    await exec('docker stop payment-service');

    try {
      // Attempt to place order
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData);

      // Should fail gracefully
      expect(response.status).toBe(503);
      expect(response.body.error).toContain('Payment service unavailable');

      // Verify circuit breaker opened
      const metrics = await request(app).get('/metrics');
      expect(metrics.text).toContain('circuit_breaker_state{service="payment-service"} 1');
    } finally {
      // Restart service
      await exec('docker start payment-service');
      await sleep(5000); // Wait for service to be healthy
    }
  });

  it('should handle Kafka broker failure', async () => {
    // Stop Kafka broker
    await exec('docker stop kafka');

    try {
      // Place order (should succeed but events stored in outbox)
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData);

      expect(response.status).toBe(201);

      // Verify events in outbox
      const outboxEvents = await OutboxModel.find({ published: false });
      expect(outboxEvents.length).toBeGreaterThan(0);
    } finally {
      // Restart Kafka
      await exec('docker start kafka');
      await sleep(10000);

      // Verify events published
      await sleep(5000);
      const remainingEvents = await OutboxModel.find({ published: false });
      expect(remainingEvents.length).toBe(0);
    }
  });

  it('should handle database connection loss', async () => {
    // Test database failover
  });

  it('should handle network partition', async () => {
    // Test split-brain scenarios
  });
});
```

### Step 5: Performance Testing

**Install Artillery:**

```bash
npm install --save-dev artillery
```

**Create `performance/order-placement.yml`:**

```yaml
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 300
      arrivalRate: 50
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 100
      name: 'Spike'
  processor: './processor.js'

scenarios:
  - name: 'Complete Order Flow'
    flow:
      - post:
          url: '/api/users/login'
          json:
            email: '{{ $randomEmail }}'
            password: 'Password123'
          capture:
            - json: '$.token'
              as: 'token'

      - get:
          url: '/api/products'
          headers:
            Authorization: 'Bearer {{ token }}'
          capture:
            - json: '$.products[0].id'
              as: 'productId'

      - post:
          url: '/api/cart/add'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            productId: '{{ productId }}'
            quantity: 2

      - post:
          url: '/api/orders'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            shippingAddress:
              street: '123 Test St'
              city: 'Test City'
              state: 'TS'
              postalCode: '12345'
            paymentMethodId: 'pm_test'
```

**Run performance tests:**

```bash
artillery run performance/order-placement.yml --output report.json
artillery report report.json
```

### Step 6: End-to-End Tests

**Create `tests/e2e/user-journey.test.ts`:**

```typescript
import { chromium, Browser, Page } from 'playwright';

describe('E2E User Journey', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it('should complete full shopping journey', async () => {
    // 1. Navigate to homepage
    await page.goto('http://localhost:3000');

    // 2. Register
    await page.click('text=Sign Up');
    await page.fill('[name=name]', 'Test User');
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'Password123');
    await page.click('button[type=submit]');

    // 3. Browse products
    await page.waitForSelector('.product-list');
    await page.click('.product-card:first-child');

    // 4. Add to cart
    await page.click('text=Add to Cart');
    await page.waitForSelector('.cart-badge');

    // 5. View cart
    await page.click('.cart-icon');
    await page.waitForSelector('.cart-items');

    // 6. Checkout
    await page.click('text=Proceed to Checkout');

    // 7. Fill shipping info
    await page.fill('[name=street]', '123 Test St');
    await page.fill('[name=city]', 'Test City');
    await page.fill('[name=postalCode]', '12345');

    // 8. Complete payment
    await page.click('text=Place Order');

    // 9. Verify order confirmation
    await page.waitForSelector('.order-confirmation');
    const orderNumber = await page.textContent('.order-number');
    expect(orderNumber).toBeDefined();
  });
});
```

---

## Test Coverage Requirements

### Coverage Targets

| Test Type | Target Coverage |
|-----------|----------------|
| Unit Tests | 90%+ |
| Integration Tests | 80%+ |
| E2E Tests | Critical paths |
| Contract Tests | All service APIs |
| Chaos Tests | All failure scenarios |

### Performance Targets

| Metric | Target |
|--------|--------|
| P50 Latency | < 100ms |
| P95 Latency | < 500ms |
| P99 Latency | < 1000ms |
| Throughput | 1000 req/s |
| Error Rate | < 0.1% |

---

## Deliverables

- [ ] Integration test suite (90%+ coverage)
- [ ] Contract tests for all services
- [ ] Chaos engineering experiments
- [ ] Performance test scenarios
- [ ] E2E test suite
- [ ] Load test reports
- [ ] Test documentation
- [ ] CI/CD integration

---

## Validation Checklist

### Functional
- [ ] All user flows working
- [ ] Event flow validated
- [ ] Saga compensation verified
- [ ] Circuit breakers functioning
- [ ] Service discovery working

### Performance
- [ ] Load tests passing
- [ ] Latency targets met
- [ ] Throughput targets met
- [ ] No memory leaks
- [ ] Kafka lag < 1s

### Resilience
- [ ] Service failures handled
- [ ] Kafka failures handled
- [ ] Database failures handled
- [ ] Network partitions handled
- [ ] Graceful degradation working

---

## Phase 3 Completion Criteria

- [ ] All 10 tasks complete
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Chaos tests passing
- [ ] Documentation complete
- [ ] Team trained
- [ ] Production ready

---

**Phase 3 Complete!** 🎉

Ready for **Phase 4: Scale & Infrastructure Hardening**

---

**Task Owner:** QA + Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
