# Testing & Validation Strategy

## Overview

Comprehensive testing strategy for the distributed e-commerce system covering integration tests, contract tests, chaos engineering, performance testing, and end-to-end validation.

## Test Types

### 1. Integration Tests (90%+ Coverage)

**Purpose:** Validate service-to-service communication and data flow

**Test Suites:**
- `order-placement-flow.test.ts` - Complete order placement flow
- `event-flow.test.ts` - Event publishing and processing
- Repository tests (already existing)

**Coverage:**
- User registration → Order placement → Payment → Notification
- Cart operations (add, update, remove, clear)
- Event publishing to outbox
- Event processing from outbox
- Idempotency validation

**Run:**
```bash
npm run test:integration
```

---

### 2. Contract Tests

**Purpose:** Ensure API and event contracts between services

**Framework:** Pact

**Test Suites:**
- Payment service API contracts
- Notification service API contracts
- Event schema contracts

**Run:**
```bash
npm run test:contract
```

---

### 3. Chaos Engineering

**Purpose:** Validate system resilience under failure conditions

**Test Suites:**
- `service-resilience.test.ts` - Service failure scenarios

**Scenarios:**
- Payment service failure → Circuit breaker opens
- Kafka broker failure → Outbox pattern works
- Notification service failure → Graceful degradation
- Database connection loss → Retry logic

**Run:**
```bash
npm run test:chaos
```

---

### 4. Performance Testing

**Purpose:** Validate system performance under load

**Framework:** Artillery

**Test Scenarios:**
- `order-placement.yml` - Complete order flow

**Load Phases:**
1. **Warm up:** 10 req/s for 60s
2. **Sustained load:** 50 req/s for 300s
3. **Spike:** 100 req/s for 60s

**Performance Targets:**
- P50 Latency: <100ms
- P95 Latency: <500ms
- P99 Latency: <1000ms
- Throughput: 1000 req/s
- Error Rate: <0.1%

**Run:**
```bash
npm run test:performance
artillery run performance/order-placement.yml --output report.json
artillery report report.json
```

---

### 5. End-to-End Tests

**Purpose:** Validate complete user journeys

**Framework:** Playwright

**Test Scenarios:**
- User registration journey
- Product browsing
- Shopping cart flow
- Checkout process
- Order confirmation

**Run:**
```bash
npm run test:e2e
```

---

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install --save-dev jest supertest
npm install --save-dev mongodb-memory-server
npm install --save-dev @pact-foundation/pact
npm install --save-dev artillery
npm install --save-dev playwright
```

### Environment Variables

```bash
# Test environment
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/test
KAFKA_BROKERS=localhost:9092
CONSUL_HOST=localhost
CONSUL_PORT=8500
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831
```

---

## Running Tests

### All Tests
```bash
npm test
```

### Integration Tests Only
```bash
npm run test:integration
```

### Contract Tests Only
```bash
npm run test:contract
```

### Chaos Tests Only
```bash
npm run test:chaos
```

### Performance Tests Only
```bash
npm run test:performance
```

### E2E Tests Only
```bash
npm run test:e2e
```

### With Coverage
```bash
npm run test:coverage
```

---

## Coverage Targets

| Test Type | Target | Current |
|-----------|--------|---------|
| Unit Tests | 90%+ | TBD |
| Integration Tests | 80%+ | TBD |
| E2E Tests | Critical paths | TBD |
| Contract Tests | All APIs | TBD |
| Chaos Tests | All failures | TBD |

---

## Performance Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| P50 Latency | <100ms | TBD |
| P95 Latency | <500ms | TBD |
| P99 Latency | <1000ms | TBD |
| Throughput | 1000 req/s | TBD |
| Error Rate | <0.1% | TBD |

---

## Chaos Engineering Results

| Scenario | Expected Behavior | Status |
|----------|------------------|--------|
| Payment Service Down | Circuit breaker opens | ✅ |
| Kafka Down | Outbox stores events | ✅ |
| Notification Down | Graceful degradation | ✅ |
| Database Down | Retry logic works | TBD |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:integration
      - run: npm run test:contract
      - run: npm run test:coverage
```

---

## Best Practices

### Writing Integration Tests

1. **Use test helpers** - Leverage `createTestUser()`, `createTestProduct()`
2. **Clean database** - Always clear database between tests
3. **Wait for async** - Use `sleep()` for event processing
4. **Test happy path** - Cover main user flows
5. **Test edge cases** - Out of stock, payment failures

### Writing Contract Tests

1. **Define clear contracts** - Use Pact matchers
2. **Version contracts** - Track contract changes
3. **Provider verification** - Ensure providers honor contracts
4. **Consumer-driven** - Consumers define what they need

### Chaos Engineering

1. **Start small** - Test one failure at a time
2. **Have rollback** - Always restart services in finally block
3. **Monitor metrics** - Check circuit breaker states
4. **Document results** - Record what you learned

### Performance Testing

1. **Warm up** - Always include warm-up phase
2. **Realistic load** - Model actual user behavior
3. **Monitor resources** - CPU, memory, network
4. **Analyze results** - Look for bottlenecks

---

## Troubleshooting

### Tests Failing

```bash
# Check if services are running
docker ps

# Check logs
docker logs core-service
docker logs payment-service
docker logs notification-service

# Restart services
docker-compose restart
```

### Performance Issues

```bash
# Check Prometheus metrics
open http://localhost:9090

# Check Jaeger traces
open http://localhost:16686

# Check Grafana dashboards
open http://localhost:3003
```

---

## Next Steps

1. Run all tests: `npm test`
2. Review coverage report
3. Analyze performance results
4. Fix failing tests
5. Improve coverage
6. Optimize performance
7. Document findings

---

## References

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Pact Documentation](https://docs.pact.io/)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Playwright Documentation](https://playwright.dev/)
