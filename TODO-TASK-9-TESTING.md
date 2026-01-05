# TODO: Complete Task 9 - Testing & Validation

## Current Status: 40% Complete

**Working:** Circuit Breaker (7 tests), Retry Logic (6 tests)  
**Blocked:** Domain tests, Integration tests, Performance tests

---

## Phase 1: Fix Domain Unit Tests (Priority: HIGH)

### User Aggregate Tests
**File:** `tests/unit/domain/user/user.aggregate.test.ts`

- [ ] Remove `stripeCustomerId` property access (no public getter)
- [ ] Remove `shopName` and `shopAddress` property access (no public getters)
- [ ] Fix: `incrementReturnedOrderCount()` → `incrementReturnCount()`
- [ ] Verify all 13 tests compile
- [ ] Run: `npm test -- tests/unit/domain/user`
- [ ] Target: 13/13 tests passing

### Product Aggregate Tests
**File:** `tests/unit/domain/product/product.aggregate.test.ts`

- [ ] Check Product.create() signature matches test
- [ ] Verify `reserveInventory()` method exists
- [ ] Verify `restockInventory()` method exists
- [ ] Verify `getDiscountPercentage()` method exists
- [ ] Check property getters: `images`, `isActive`
- [ ] Run: `npm test -- tests/unit/domain/product`
- [ ] Target: 18/18 tests passing

### Order Aggregate Tests
**File:** `tests/unit/domain/order/order.aggregate.test.ts`

- [ ] Check Order.create() signature (userId, items, shippingAddress, id)
- [ ] Verify state transition methods: `confirm()`, `ship()`, `deliver()`, `cancel()`
- [ ] Verify item management: `addItem()`, `removeItem()`, `updateItemQuantity()`
- [ ] Verify calculation methods: `setShippingCost()`, `setTax()`
- [ ] Check OrderItem.create() signature
- [ ] Run: `npm test -- tests/unit/domain/order`
- [ ] Target: 24/24 tests passing

### Value Object Tests
**File:** `tests/unit/domain/value-objects.test.ts`

- [ ] Email: Verify `create()`, `equals()` methods
- [ ] Password: Verify `create()`, `compare()` methods
- [ ] Money: Verify `add()`, `subtract()`, `multiply()`, `equals()`, `greaterThan()`, `lessThan()`
- [ ] SKU: Verify `create()`, `equals()` methods
- [ ] Quantity: Verify `add()`, `subtract()`, `equals()`, `greaterThan()`, `lessThan()`, `isSufficient()`
- [ ] Run: `npm test -- tests/unit/domain/value-objects`
- [ ] Target: 50+/50+ tests passing

---

## Phase 2: Verify Integration Tests (Priority: MEDIUM)

### CQRS Order Flow
**File:** `tests/integration/cqrs/order-flow.test.ts`

- [ ] Verify MongoDB connection in test environment
- [ ] Check PlaceOrderCommand signature
- [ ] Check GetOrderHistoryQuery signature
- [ ] Verify event handlers are registered
- [ ] Verify read model updates
- [ ] Run: `npm run test:cqrs`
- [ ] Target: 3/3 tests passing

### Event Flow Tests (NOT CREATED)
**File:** `tests/integration/events/event-flow.test.ts`

- [ ] Create event persistence test
- [ ] Create multiple handler test
- [ ] Create event replay test
- [ ] Run: `npm test -- tests/integration/events`

---

## Phase 3: Verify Performance Tests (Priority: LOW)

### Query Performance
**File:** `tests/performance/query-performance.test.ts`

- [ ] Verify GetUserProfileQuery exists
- [ ] Verify ListProductsQuery exists
- [ ] Run performance tests
- [ ] Record P95 latencies
- [ ] Document baseline metrics
- [ ] Run: `npm run test:performance`
- [ ] Target: P95 < 100ms for user profile, P95 < 150ms for product list

---

## Phase 4: Set Up Contract Tests (Priority: LOW)

### Stripe Contract Tests
**File:** `tests/contract/stripe.contract.test.ts`

- [ ] Add `STRIPE_TEST_KEY=sk_test_...` to `.env.test`
- [ ] Run: `npm run test:contract`
- [ ] Verify customer creation works
- [ ] Verify payment intent creation works
- [ ] Target: 8/8 tests passing

### S3 Contract Tests (NOT CREATED)
**File:** `tests/contract/s3.contract.test.ts`

- [ ] Create S3 upload test
- [ ] Create S3 download test
- [ ] Create signed URL test
- [ ] Add AWS credentials to test environment

---

## Phase 5: Generate Coverage Report

- [ ] Fix all domain tests (Phase 1)
- [ ] Run: `npm run test:coverage`
- [ ] Open: `coverage/index.html`
- [ ] Review coverage by file
- [ ] Identify uncovered branches
- [ ] Add tests for uncovered paths
- [ ] Verify: 85%+ overall coverage
- [ ] Verify: 95%+ domain coverage

---

## Success Criteria

### Minimum (60% Complete)
- [x] Test infrastructure configured
- [x] Working tests: Circuit Breaker, Retry
- [ ] Domain tests: User, Product passing
- [ ] Coverage: 50%+

### Target (80% Complete)
- [ ] All domain tests passing (User, Product, Order, Value Objects)
- [ ] CQRS integration tests passing
- [ ] Coverage: 70%+

### Complete (100%)
- [ ] All 123+ tests passing
- [ ] Performance benchmarks recorded
- [ ] Contract tests verified
- [ ] Coverage: 85%+ overall, 95%+ domain
- [ ] Coverage report generated and reviewed

---

## Estimated Time

- **Phase 1 (Domain Tests):** 2-3 hours
- **Phase 2 (Integration):** 1 hour
- **Phase 3 (Performance):** 30 minutes
- **Phase 4 (Contract):** 30 minutes
- **Phase 5 (Coverage):** 30 minutes

**Total:** 4.5-5.5 hours

---

## Notes

- Start with User Aggregate (simplest)
- Use existing tests in `src/domain/user/__tests__/` as reference
- Run tests frequently to catch issues early
- Focus on getting tests passing, not perfecting them
- Coverage will improve as tests pass
