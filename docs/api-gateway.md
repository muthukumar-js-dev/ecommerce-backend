# Kong API Gateway

## Overview

Kong API Gateway provides centralized routing, authentication, rate limiting, and monitoring for all microservices in the e-commerce platform.

## Architecture

```
Client → Kong Gateway (port 8000) → Microservices
                ↓
         Kong Admin API (port 8001)
                ↓
         Konga UI (port 1337)
```

### Services Registered
1. **core-service** (port 3000) - Users, Products, Orders, Cart
2. **payment-service** (port 3001) - Payments
3. **notification-service** (port 3002) - Notifications

## Setup

### Prerequisites
- Docker & Docker Compose
- Running microservices (core, payment, notification)

### Start Kong

```bash
# Start Kong stack
docker-compose -f docker-compose.kong.yml up -d

# Wait for Kong to be ready (30-60 seconds)
docker logs kong -f

# Verify Kong is running
curl http://localhost:8001/status
```

### Configure Kong

Run configuration scripts in order:

```bash
# 1. Register services and routes
bash scripts/kong/configure-services.sh

# 2. Configure rate limiting
bash scripts/kong/configure-rate-limiting.sh

# 3. Configure JWT authentication
bash scripts/kong/configure-auth.sh

# 4. Configure CORS
bash scripts/kong/configure-cors.sh

# 5. Configure request/response transformations
bash scripts/kong/configure-transformations.sh

# 6. Configure logging
bash scripts/kong/configure-logging.sh

# 7. Configure health checks
bash scripts/kong/configure-health-checks.sh
```

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Kong Proxy | http://localhost:8000 | API Gateway entry point |
| Kong Admin API | http://localhost:8001 | Configuration API |
| Konga UI | http://localhost:1337 | Web-based admin interface |

## API Routes

### Core Service
- `GET/POST/PUT/DELETE /api/users` → core-service
- `GET/POST/PUT/DELETE /api/products` → core-service
- `GET/POST/PUT/DELETE /api/orders` → core-service
- `GET/POST/PUT/DELETE /api/cart` → core-service

### Payment Service
- `GET/POST /api/payments` → payment-service

### Notification Service
- `GET/POST /api/notifications` → notification-service

## Features

### Rate Limiting
- **Global:** 1000 requests/minute, 10000/hour
- **Auth endpoints:** 100 requests/minute
- **Payment endpoints:** 50 requests/minute

### JWT Authentication
All services require JWT authentication.

**Generate JWT Token:**
1. Use test credentials: `key=test-key`, `secret=test-secret`
2. Generate at https://jwt.io
3. Include in requests: `Authorization: Bearer <token>`

### CORS
- **Allowed origins:** http://localhost:3000, https://yourdomain.com
- **Allowed methods:** GET, POST, PUT, DELETE, OPTIONS
- **Credentials:** Enabled

### Request Transformation
All requests include:
- `X-Gateway-Version: 1.0`
- `X-Request-ID: <uuid>`

All responses include:
- `X-Powered-By: Kong`

### Logging
Logs written to `/tmp/kong-requests.log` inside Kong container.

**View logs:**
```bash
docker exec kong tail -f /tmp/kong-requests.log
```

### Health Checks
- **Active checks:** Every 10 seconds
- **Passive monitoring:** Enabled
- **Failure threshold:** 3 failures

## Testing

```bash
# Test routing
curl http://localhost:8000/api/products

# Test rate limiting (make 150+ requests)
for i in {1..150}; do curl http://localhost:8000/api/products; done

# Test CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:8000/api/products

# Run integration tests
npm run test:integration -- gateway
```

## Konga Admin UI

1. Access http://localhost:1337
2. Create admin account
3. Connect to Kong Admin API: http://kong:8001
4. View services, routes, plugins

## TypeScript Client

```typescript
import { KongClient } from '@infrastructure/gateway/kong-client';
import { GatewayMetrics } from '@infrastructure/gateway/gateway-metrics';

// Initialize client
const kong = new KongClient('http://localhost:8001');

// Create service
await kong.createService({
  name: 'my-service',
  url: 'http://localhost:4000',
  retries: 5,
});

// Get metrics
const metrics = new GatewayMetrics(kong);
const health = await metrics.getServiceHealth();
const stats = await metrics.getGatewayStats();
```

## Troubleshooting

### Kong not starting
```bash
# Check logs
docker logs kong

# Restart Kong
docker-compose -f docker-compose.kong.yml restart kong
```

### Services not routing
```bash
# Verify services registered
curl http://localhost:8001/services

# Verify routes configured
curl http://localhost:8001/routes

# Check service health
curl http://localhost:8001/services/core-service/health
```

### Rate limiting not working
```bash
# Check plugins
curl http://localhost:8001/plugins

# Verify rate-limiting plugin
curl http://localhost:8001/plugins | grep rate-limiting
```

## Production Considerations

1. **SSL/TLS:** Configure SSL certificates for HTTPS
2. **Database:** Use managed PostgreSQL (not Docker)
3. **Clustering:** Deploy multiple Kong instances
4. **Monitoring:** Integrate with Prometheus/Grafana
5. **Caching:** Add caching plugins
6. **Circuit Breaker:** Add circuit breaker for resilience

## References

- [Kong Documentation](https://docs.konghq.com/)
- [Kong Plugins](https://docs.konghq.com/hub/)
- [Konga](https://github.com/pantsel/konga)
