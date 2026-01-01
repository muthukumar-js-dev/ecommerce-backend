# Phase 3 - Task 7: Implement API Gateway

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Tasks 1-6 (Services Extracted)

---

## Objective

Setup Kong API Gateway for centralized routing, authentication, rate limiting, and request transformation to manage all microservices through a single entry point.

---

## Context

The API Gateway will:
- Route requests to appropriate services
- Handle authentication/authorization
- Implement rate limiting
- Transform requests/responses
- Provide SSL termination
- Enable CORS
- Log all requests
- Provide metrics

---

## Implementation Steps

### Step 1: Kong Setup with Docker

**Create `docker-compose.kong.yml`:**

```yaml
version: '3.8'

services:
  kong-database:
    image: postgres:13-alpine
    container_name: kong-database
    environment:
      POSTGRES_USER: kong
      POSTGRES_DB: kong
      POSTGRES_PASSWORD: kong_password
    volumes:
      - kong-db:/var/lib/postgresql/data
    networks:
      - kong-net
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "kong"]
      interval: 10s
      timeout: 5s
      retries: 5

  kong-migrations:
    image: kong:3.4-alpine
    container_name: kong-migrations
    command: kong migrations bootstrap
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong_password
      KONG_PG_DATABASE: kong
    networks:
      - kong-net
    depends_on:
      kong-database:
        condition: service_healthy
    restart: on-failure

  kong:
    image: kong:3.4-alpine
    container_name: kong
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong_password
      KONG_PG_DATABASE: kong
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
      KONG_ADMIN_GUI_URL: http://localhost:8002
      KONG_PROXY_LISTEN: 0.0.0.0:8000, 0.0.0.0:8443 ssl
    ports:
      - "8000:8000"   # Proxy HTTP
      - "8443:8443"   # Proxy HTTPS
      - "8001:8001"   # Admin API
      - "8444:8444"   # Admin API HTTPS
    networks:
      - kong-net
    depends_on:
      kong-database:
        condition: service_healthy
      kong-migrations:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 10s
      timeout: 5s
      retries: 5

  konga:
    image: pantsel/konga:latest
    container_name: konga
    environment:
      NODE_ENV: production
      DB_ADAPTER: postgres
      DB_HOST: kong-database
      DB_USER: kong
      DB_PASSWORD: kong_password
      DB_DATABASE: konga
    ports:
      - "1337:1337"
    networks:
      - kong-net
    depends_on:
      kong-database:
        condition: service_healthy

networks:
  kong-net:
    driver: bridge

volumes:
  kong-db:
```

**Start Kong:**

```bash
docker-compose -f docker-compose.kong.yml up -d
```

### Step 2: Service Configuration Script

**Create `scripts/kong/configure-services.sh`:**

```bash
#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "Configuring Kong services and routes..."

# 1. Add Core Service
curl -i -X POST ${KONG_ADMIN_URL}/services \
  --data name=core-service \
  --data url=http://host.docker.internal:3000 \
  --data retries=5 \
  --data connect_timeout=60000 \
  --data write_timeout=60000 \
  --data read_timeout=60000

# 2. Add Payment Service
curl -i -X POST ${KONG_ADMIN_URL}/services \
  --data name=payment-service \
  --data url=http://host.docker.internal:3001 \
  --data retries=5

# 3. Add Notification Service
curl -i -X POST ${KONG_ADMIN_URL}/services \
  --data name=notification-service \
  --data url=http://host.docker.internal:3002 \
  --data retries=5

# 4. Add routes for Core Service
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/routes \
  --data 'name=users-route' \
  --data 'paths[]=/api/users' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE'

curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/routes \
  --data 'name=products-route' \
  --data 'paths[]=/api/products' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE'

curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/routes \
  --data 'name=orders-route' \
  --data 'paths[]=/api/orders' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE'

curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/routes \
  --data 'name=cart-route' \
  --data 'paths[]=/api/cart' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE'

# 5. Add routes for Payment Service
curl -i -X POST ${KONG_ADMIN_URL}/services/payment-service/routes \
  --data 'name=payments-route' \
  --data 'paths[]=/api/payments' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST'

# 6. Add routes for Notification Service
curl -i -X POST ${KONG_ADMIN_URL}/services/notification-service/routes \
  --data 'name=notifications-route' \
  --data 'paths[]=/api/notifications' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST'

echo "Services and routes configured successfully!"
```

### Step 3: Rate Limiting Configuration

**Create `scripts/kong/configure-rate-limiting.sh`:**

```bash
#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "Configuring rate limiting..."

# Global rate limiting (applies to all services)
curl -i -X POST ${KONG_ADMIN_URL}/plugins \
  --data name=rate-limiting \
  --data config.minute=1000 \
  --data config.hour=10000 \
  --data config.policy=local \
  --data config.fault_tolerant=true

# Stricter rate limiting for authentication endpoints
curl -i -X POST ${KONG_ADMIN_URL}/routes/users-route/plugins \
  --data name=rate-limiting \
  --data config.minute=100 \
  --data config.hour=1000 \
  --data config.policy=local

# Payment endpoints - even stricter
curl -i -X POST ${KONG_ADMIN_URL}/routes/payments-route/plugins \
  --data name=rate-limiting \
  --data config.minute=50 \
  --data config.hour=500 \
  --data config.policy=local

echo "Rate limiting configured!"
```

### Step 4: Authentication Configuration

**Create `scripts/kong/configure-auth.sh`:**

```bash
#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "Configuring JWT authentication..."

# Add JWT plugin to core service
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/plugins \
  --data name=jwt \
  --data config.key_claim_name=kid \
  --data config.secret_is_base64=false

# Add JWT plugin to payment service
curl -i -X POST ${KONG_ADMIN_URL}/services/payment-service/plugins \
  --data name=jwt

# Add JWT plugin to notification service
curl -i -X POST ${KONG_ADMIN_URL}/services/notification-service/plugins \
  --data name=jwt

# Create a consumer (example)
curl -i -X POST ${KONG_ADMIN_URL}/consumers \
  --data username=test-user

# Create JWT credentials for consumer
curl -i -X POST ${KONG_ADMIN_URL}/consumers/test-user/jwt \
  --data key=test-key \
  --data secret=test-secret

echo "JWT authentication configured!"
```

### Step 5: CORS Configuration

**Create `scripts/kong/configure-cors.sh`:**

```bash
#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "Configuring CORS..."

# Add CORS plugin globally
curl -i -X POST ${KONG_ADMIN_URL}/plugins \
  --data name=cors \
  --data config.origins=http://localhost:3000,https://yourdomain.com \
  --data config.methods=GET,POST,PUT,DELETE,OPTIONS \
  --data config.headers=Accept,Authorization,Content-Type,X-Requested-With \
  --data config.exposed_headers=X-Auth-Token \
  --data config.credentials=true \
  --data config.max_age=3600

echo "CORS configured!"
```

### Step 6: Request/Response Transformation

**Create `scripts/kong/configure-transformations.sh`:**

```bash
#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "Configuring request/response transformations..."

# Add request transformer to add headers
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/plugins \
  --data name=request-transformer \
  --data config.add.headers=X-Gateway-Version:1.0 \
  --data config.add.headers=X-Request-ID:\$(uuid)

# Add response transformer to add headers
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/plugins \
  --data name=response-transformer \
  --data config.add.headers=X-Powered-By:Kong

echo "Transformations configured!"
```

### Step 7: Logging Configuration

**Create `scripts/kong/configure-logging.sh`:**

```bash
#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "Configuring logging..."

# Add HTTP log plugin
curl -i -X POST ${KONG_ADMIN_URL}/plugins \
  --data name=http-log \
  --data config.http_endpoint=http://logstash:5000 \
  --data config.method=POST \
  --data config.timeout=10000 \
  --data config.keepalive=60000

# Add file log plugin (for local development)
curl -i -X POST ${KONG_ADMIN_URL}/plugins \
  --data name=file-log \
  --data config.path=/tmp/kong-requests.log

echo "Logging configured!"
```

### Step 8: Health Checks and Circuit Breaker

**Create `scripts/kong/configure-health-checks.sh`:**

```bash
#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "Configuring health checks..."

# Update core service with health checks
curl -i -X PATCH ${KONG_ADMIN_URL}/services/core-service \
  --data healthchecks.active.healthy.interval=10 \
  --data healthchecks.active.healthy.successes=2 \
  --data healthchecks.active.unhealthy.interval=5 \
  --data healthchecks.active.unhealthy.http_failures=3 \
  --data healthchecks.active.unhealthy.timeouts=3 \
  --data healthchecks.passive.healthy.successes=2 \
  --data healthchecks.passive.unhealthy.http_failures=3

echo "Health checks configured!"
```

### Step 9: Kong Configuration via Code

**Create `src/infrastructure/gateway/kong-client.ts`:**

```typescript
import axios, { AxiosInstance } from 'axios';

export interface KongService {
  name: string;
  url: string;
  retries?: number;
  connect_timeout?: number;
  write_timeout?: number;
  read_timeout?: number;
}

export interface KongRoute {
  name: string;
  paths: string[];
  methods?: string[];
  service: { id: string };
}

export class KongClient {
  private client: AxiosInstance;

  constructor(adminUrl: string = 'http://localhost:8001') {
    this.client = axios.create({
      baseURL: adminUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createService(service: KongService): Promise<any> {
    const response = await this.client.post('/services', service);
    return response.data;
  }

  async createRoute(serviceId: string, route: Omit<KongRoute, 'service'>): Promise<any> {
    const response = await this.client.post(`/services/${serviceId}/routes`, {
      ...route,
      service: { id: serviceId },
    });
    return response.data;
  }

  async addPlugin(
    entityType: 'services' | 'routes',
    entityId: string,
    pluginName: string,
    config: Record<string, any>
  ): Promise<any> {
    const response = await this.client.post(`/${entityType}/${entityId}/plugins`, {
      name: pluginName,
      config,
    });
    return response.data;
  }

  async listServices(): Promise<any[]> {
    const response = await this.client.get('/services');
    return response.data.data;
  }

  async listRoutes(): Promise<any[]> {
    const response = await this.client.get('/routes');
    return response.data.data;
  }

  async deleteService(serviceId: string): Promise<void> {
    await this.client.delete(`/services/${serviceId}`);
  }
}
```

### Step 10: Gateway Monitoring

**Create `src/infrastructure/gateway/gateway-metrics.ts`:**

```typescript
import { KongClient } from './kong-client';

export class GatewayMetrics {
  constructor(private kongClient: KongClient) {}

  async getServiceHealth(): Promise<Record<string, any>> {
    const services = await this.kongClient.listServices();
    
    const health: Record<string, any> = {};
    
    for (const service of services) {
      health[service.name] = {
        id: service.id,
        url: service.url,
        enabled: service.enabled,
        // Additional health metrics
      };
    }

    return health;
  }

  async getRouteMetrics(): Promise<any[]> {
    const routes = await this.kongClient.listRoutes();
    return routes.map((route) => ({
      name: route.name,
      paths: route.paths,
      methods: route.methods,
      service: route.service.id,
    }));
  }
}
```

---

## Testing

**Create `tests/integration/gateway/kong-routing.test.ts`:**

```typescript
import axios from 'axios';

describe('Kong Gateway Routing', () => {
  const gatewayUrl = 'http://localhost:8000';

  it('should route to core service', async () => {
    const response = await axios.get(`${gatewayUrl}/api/products`);
    expect(response.status).toBe(200);
  });

  it('should route to payment service', async () => {
    const response = await axios.post(`${gatewayUrl}/api/payments/initiate`, {
      orderId: 'test-order',
      amount: 1000,
    });
    expect(response.status).toBe(200);
  });

  it('should enforce rate limiting', async () => {
    // Make requests until rate limit is hit
    const requests = Array.from({ length: 150 }, () =>
      axios.get(`${gatewayUrl}/api/products`)
    );

    const results = await Promise.allSettled(requests);
    const rateLimited = results.some(
      (r) => r.status === 'rejected' && r.reason.response?.status === 429
    );

    expect(rateLimited).toBe(true);
  });
});
```

---

## Deliverables

- [ ] Kong API Gateway setup
- [ ] Service and route configuration
- [ ] Rate limiting configured
- [ ] JWT authentication enabled
- [ ] CORS configuration
- [ ] Request/Response transformation
- [ ] Logging setup
- [ ] Health checks configured
- [ ] Kong client library
- [ ] Tests
- [ ] Documentation

---

## Configuration Summary

| Feature | Configuration |
|---------|--------------|
| Rate Limiting | 1000 req/min global, 100 req/min auth, 50 req/min payments |
| Authentication | JWT with key claim |
| CORS | Enabled for specified origins |
| Timeouts | 60s connect, 60s write, 60s read |
| Retries | 5 retries per service |
| Health Checks | Active every 10s, passive monitoring |

---

## Next Steps

After completing this task:
1. Proceed to **Task 8: Service Mesh & Discovery**
2. Monitor gateway metrics
3. Setup SSL certificates for production

---

**Task Owner:** DevOps + Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
