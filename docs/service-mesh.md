# Service Mesh & Discovery

## Overview

Consul-based service discovery with automatic registration, health checks, load balancing, and circuit breakers for resilient inter-service communication.

## Architecture

```
┌─────────────────────────────────────────┐
│         Consul Cluster                  │
│  ┌──────────┐  ┌────────┐  ┌────────┐  │
│  │  Server  │  │ Agent1 │  │ Agent2 │  │
│  └──────────┘  └────────┘  └────────┘  │
└─────────────────────────────────────────┘
           ↑                    ↑
           │                    │
    ┌──────┴────────┐    ┌──────┴────────┐
    │  Service A    │    │  Service B    │
    │  (Auto-reg)   │    │  (Auto-reg)   │
    └───────────────┘    └───────────────┘
```

## Features

### ✅ Service Discovery
- Automatic service registration on startup
- Health check monitoring (every 10s)
- Graceful deregistration on shutdown
- Service watching for real-time updates

### ✅ Load Balancing (4 Strategies)
1. **Round Robin** - Distribute evenly
2. **Least Connections** - Route to least busy
3. **Random** - Random selection
4. **Weighted** - Based on instance weights

### ✅ Circuit Breaker
- **States:** CLOSED → OPEN → HALF_OPEN
- **Failure threshold:** 5 failures → OPEN
- **Success threshold:** 2 successes → CLOSED
- **Timeout:** 60s operation timeout
- **Reset timeout:** 30s before retry

### ✅ Health Checks
- HTTP health checks every 10s
- Automatic deregistration after 1 minute critical
- Passive health monitoring

## Setup

### Prerequisites
- Docker & Docker Compose
- Node.js with TypeScript

### Install Dependencies

```bash
npm install consul @types/consul
```

### Start Consul Cluster

```bash
docker-compose -f docker-compose.consul.yml up -d
```

Wait for Consul to be ready (10-20 seconds).

### Verify Consul

```bash
# Check Consul UI
open http://localhost:8500

# Check cluster members
curl http://localhost:8500/v1/agent/members
```

## Usage

### Service Registration

```typescript
import { ServiceRegistry } from '@infrastructure/service-mesh/service-registry';

// In your service bootstrap
const serviceRegistry = new ServiceRegistry();
await serviceRegistry.register('payment-service', 3001, '/health');

console.log('Service registered with Consul');
```

### Service Discovery

```typescript
import { ConsulClient } from '@infrastructure/service-mesh/consul/consul-client';

const consulClient = new ConsulClient();

// Discover healthy instances
const instances = await consulClient.discoverService('payment-service');

console.log('Found instances:', instances);
```

### Service Client (Recommended)

```typescript
import { ServiceClient } from '@infrastructure/service-mesh/service-client';

const serviceClient = new ServiceClient();

// Make a call with automatic load balancing and circuit breaker
const result = await serviceClient.get('payment-service', '/api/payments/123');

// POST request
const payment = await serviceClient.post('payment-service', '/api/payments', {
  amount: 1000,
  currency: 'INR',
});
```

### Load Balancer

```typescript
import { LoadBalancer, LoadBalancingStrategy } from '@infrastructure/service-mesh/load-balancer';
import { ConsulClient } from '@infrastructure/service-mesh/consul/consul-client';

const consulClient = new ConsulClient();
const loadBalancer = new LoadBalancer(consulClient);

// Get instance using round-robin
const instance = await loadBalancer.getServiceInstance(
  'payment-service',
  LoadBalancingStrategy.ROUND_ROBIN
);

// Get instance using least connections
const instance2 = await loadBalancer.getServiceInstance(
  'payment-service',
  LoadBalancingStrategy.LEAST_CONNECTIONS
);
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from '@infrastructure/service-mesh/circuit-breaker';

const breaker = new CircuitBreaker('payment-service');

try {
  const result = await breaker.execute(async () => {
    // Your operation here
    return await makePaymentCall();
  });
} catch (error) {
  console.error('Circuit breaker prevented call:', error);
}

// Get metrics
const metrics = breaker.getMetrics();
console.log('Circuit state:', metrics.state);
console.log('Failure count:', metrics.failureCount);
```

## Service Integration

### Payment Service

```typescript
// payment-service/src/main.ts
import { ServiceRegistry } from '@shared/service-mesh/service-registry';

async function bootstrap() {
  // ... existing setup

  // Register with Consul
  const serviceRegistry = new ServiceRegistry(
    process.env.CONSUL_HOST,
    process.env.CONSUL_PORT
  );

  await serviceRegistry.register('payment-service', 3001, '/health');

  console.log('Payment service registered with Consul');
}
```

### Notification Service

```typescript
// notification-service/src/main.ts
import { ServiceRegistry } from '@shared/service-mesh/service-registry';

async function bootstrap() {
  // ... existing setup

  const serviceRegistry = new ServiceRegistry();
  await serviceRegistry.register('notification-service', 3002, '/health');

  console.log('Notification service registered with Consul');
}
```

## Testing

```bash
# Run integration tests
npm run test:integration -- service-mesh

# Test service registration
curl http://localhost:8500/v1/catalog/services

# Test service health
curl http://localhost:8500/v1/health/service/payment-service
```

## Monitoring

### Consul UI
Access http://localhost:8500 to view:
- Registered services
- Health status
- Service instances
- Key/value store

### Circuit Breaker Metrics

```typescript
const serviceClient = new ServiceClient();

// Get circuit breaker metrics
const metrics = serviceClient.getCircuitBreakerMetrics();

console.log('Circuit breaker states:', metrics);
// {
//   'payment-service': { state: 'CLOSED', failureCount: 0, ... },
//   'notification-service': { state: 'CLOSED', failureCount: 0, ... }
// }
```

### Connection Counts

```typescript
const counts = serviceClient.getConnectionCounts();

console.log('Active connections:', counts);
// Map { 'payment-service-instance-1': 5, ... }
```

## Troubleshooting

### Consul not starting
```bash
# Check logs
docker logs consul-server

# Restart Consul
docker-compose -f docker-compose.consul.yml restart
```

### Service not registering
```bash
# Check Consul is accessible
curl http://localhost:8500/v1/status/leader

# Verify health endpoint
curl http://localhost:3001/health
```

### Circuit breaker stuck OPEN
```bash
# Check service health
curl http://localhost:8500/v1/health/service/payment-service

# Wait for reset timeout (30s default)
# Or restart the service
```

## Configuration

### Environment Variables

```bash
# Consul connection
CONSUL_HOST=localhost
CONSUL_PORT=8500

# Service metadata
SERVICE_VERSION=1.0.0
NODE_ENV=development
```

### Circuit Breaker Config

```typescript
const breaker = new CircuitBreaker('my-service', {
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes
  timeout: 60000,           // 60s operation timeout
  resetTimeout: 30000,      // 30s before retry
});
```

## Production Considerations

1. **Consul Cluster:** Deploy 3+ server nodes for HA
2. **TLS:** Enable TLS for Consul communication
3. **ACLs:** Configure Consul ACLs for security
4. **Monitoring:** Integrate with Prometheus/Grafana
5. **Backup:** Regular backup of Consul data
6. **DNS:** Configure Consul DNS for service discovery

## References

- [Consul Documentation](https://www.consul.io/docs)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Load Balancing Strategies](https://www.nginx.com/blog/choosing-nginx-plus-load-balancing-techniques/)
