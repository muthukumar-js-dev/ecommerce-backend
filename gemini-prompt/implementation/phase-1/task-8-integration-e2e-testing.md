# Phase 1 - Task 8: Integration & End-to-End Testing

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Tasks 1-7 (All implementation complete)

---

## Objective

Create comprehensive integration and end-to-end test suites to validate the entire TypeScript migration and ensure system reliability.

---

## Testing Strategy

### Test Pyramid
- **E2E Tests:** 10% (Critical user flows)
- **Integration Tests:** 30% (API + Database)
- **Unit Tests:** 60% (Domain + Application logic)

---

## Implementation Steps

### Step 1: Integration Test Setup

**Create `tests/integration/setup.ts`:**

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@infrastructure/http/app';
import { Application } from 'express';

let mongoServer: MongoMemoryServer;
let app: Application;

export async function setupIntegrationTests(): Promise<Application> {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);

  // Create app with test dependencies
  app = createApp(/* test dependencies */);

  return app;
}

export async function teardownIntegrationTests(): Promise<void> {
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
```

### Step 2: API Integration Tests

**Create `tests/integration/api/user-flow.test.ts`:**

```typescript
import request from 'supertest';
import { Application } from 'express';
import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';

describe('User Flow Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Complete User Journey', () => {
    it('should complete registration -> login -> profile flow', async () => {
      // 1. Register
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;

      // 2. Login
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(200);

      expect(loginResponse.body.data.token).toBeDefined();

      // 3. Get Profile
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.data.id).toBe(userId);
      expect(profileResponse.body.data.email).toBe('test@example.com');
    });
  });
});
```

**Create `tests/integration/api/order-flow.test.ts`:**

```typescript
describe('Order Flow Integration Tests', () => {
  it('should complete full order placement flow', async () => {
    // 1. Register user
    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
      });

    const token = userResponse.body.data.token;

    // 2. Create product
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Product',
        description: 'Test Description',
        price: 1000,
        currency: 'INR',
        category: 'Electronics',
        inventory: 10,
        images: [],
      });

    const productId = productResponse.body.data.id;

    // 3. Add to cart
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        quantity: 2,
      })
      .expect(200);

    // 4. Get cart
    const cartResponse = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(cartResponse.body.data.items).toHaveLength(1);
    expect(cartResponse.body.data.items[0].quantity).toBe(2);

    // 5. Place order
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

    expect(orderResponse.body.data.orderNumber).toBeDefined();

    // 6. Verify inventory updated
    const updatedProduct = await request(app)
      .get(`/api/products/${productId}`)
      .expect(200);

    expect(updatedProduct.body.data.inventory).toBe(8); // 10 - 2
  });
});
```

### Step 3: Performance Testing

**Install Artillery:**

```bash
npm install --save-dev artillery
```

**Create `tests/performance/load-test.yml`:**

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 120
      arrivalRate: 50
      name: 'Ramp up'
    - duration: 300
      arrivalRate: 100
      name: 'Sustained load'

scenarios:
  - name: 'User Registration and Login'
    flow:
      - post:
          url: '/api/users/register'
          json:
            name: 'Load Test User'
            email: '{{ $randomEmail }}'
            password: 'Password123'
          capture:
            - json: '$.data.token'
              as: 'token'

      - post:
          url: '/api/users/login'
          json:
            email: '{{ email }}'
            password: 'Password123'

  - name: 'Product Browsing'
    flow:
      - get:
          url: '/api/products?page=1&limit=20'
      
      - get:
          url: '/api/products/{{ $randomString }}'
```

**Run performance tests:**

```bash
artillery run tests/performance/load-test.yml
```

### Step 4: Security Testing

**Create `tests/security/auth.test.ts`:**

```typescript
describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: "admin' OR '1'='1",
        password: 'anything',
      });

    expect(response.status).toBe(401);
  });

  it('should prevent XSS attacks', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'Password123',
      });

    expect(response.body.data.user.name).not.toContain('<script>');
  });

  it('should enforce rate limiting', async () => {
    const requests = Array.from({ length: 10 }, () =>
      request(app).post('/api/users/login').send({
        email: 'test@example.com',
        password: 'wrong',
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some((r) => r.status === 429);

    expect(rateLimited).toBe(true);
  });
});
```

---

## Deliverables

- [ ] Integration test suite (30%+ coverage)
- [ ] E2E test suite for critical flows
- [ ] Performance test scenarios
- [ ] Security tests
- [ ] Load test reports
- [ ] Test documentation

---

**Task Owner:** QA + Development Team  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
