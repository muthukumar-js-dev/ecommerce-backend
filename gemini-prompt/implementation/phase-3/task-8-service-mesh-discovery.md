# Phase 3 - Task 8: Service Mesh & Discovery

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Tasks 1-7 (Services + Gateway)

---

## Objective

Implement service discovery using Consul and circuit breakers for resilient inter-service communication with automatic failover and load balancing.

---

## Context

Service Mesh provides:
- **Service Discovery:** Automatic service registration and discovery
- **Health Checks:** Continuous health monitoring
- **Load Balancing:** Distribute traffic across instances
- **Circuit Breakers:** Prevent cascading failures
- **Failover:** Automatic routing to healthy instances

---

## Implementation Steps

### Step 1: Consul Setup

**Create `docker-compose.consul.yml`:**

```yaml
version: '3.8'

services:
  consul-server:
    image: consul:1.16
    container_name: consul-server
    command: agent -server -ui -bootstrap-expect=1 -client=0.0.0.0
    ports:
      - "8500:8500"  # HTTP API
      - "8600:8600/udp"  # DNS
    environment:
      CONSUL_BIND_INTERFACE: eth0
    volumes:
      - consul-data:/consul/data
      - consul-config:/consul/config
    networks:
      - service-mesh

  consul-agent-1:
    image: consul:1.16
    container_name: consul-agent-1
    command: agent -client=0.0.0.0 -retry-join=consul-server
    depends_on:
      - consul-server
    networks:
      - service-mesh

  consul-agent-2:
    image: consul:1.16
    container_name: consul-agent-2
    command: agent -client=0.0.0.0 -retry-join=consul-server
    depends_on:
      - consul-server
    networks:
      - service-mesh

networks:
  service-mesh:
    driver: bridge

volumes:
  consul-data:
  consul-config:
```

**Start Consul:**

```bash
docker-compose -f docker-compose.consul.yml up -d
```

### Step 2: Service Registry Client

**Install Consul client:**

```bash
npm install consul
npm install --save-dev @types/consul
```

**Create `src/infrastructure/service-mesh/consul/consul-client.ts`:**

```typescript
import Consul from 'consul';

export interface ServiceConfig {
  name: string;
  id: string;
  address: string;
  port: number;
  tags?: string[];
  meta?: Record<string, string>;
}

export interface HealthCheck {
  http?: string;
  tcp?: string;
  interval: string;
  timeout: string;
  deregisterCriticalServiceAfter?: string;
}

export class ConsulClient {
  private consul: Consul.Consul;

  constructor(host: string = 'localhost', port: string = '8500') {
    this.consul = new Consul({
      host,
      port,
      promisify: true,
    });
  }

  async registerService(
    service: ServiceConfig,
    healthCheck: HealthCheck
  ): Promise<void> {
    const registration: Consul.Agent.Service.RegisterOptions = {
      name: service.name,
      id: service.id,
      address: service.address,
      port: service.port,
      tags: service.tags,
      meta: service.meta,
      check: {
        http: healthCheck.http,
        tcp: healthCheck.tcp,
        interval: healthCheck.interval,
        timeout: healthCheck.timeout,
        deregistercriticalserviceafter: healthCheck.deregisterCriticalServiceAfter,
      },
    };

    await this.consul.agent.service.register(registration);
    console.log(`Service registered: ${service.name} (${service.id})`);
  }

  async deregisterService(serviceId: string): Promise<void> {
    await this.consul.agent.service.deregister(serviceId);
    console.log(`Service deregistered: ${serviceId}`);
  }

  async discoverService(serviceName: string): Promise<ServiceInstance[]> {
    const result = await this.consul.health.service({
      service: serviceName,
      passing: true,
    });

    return result.map((entry: any) => ({
      id: entry.Service.ID,
      address: entry.Service.Address,
      port: entry.Service.Port,
      tags: entry.Service.Tags,
      meta: entry.Service.Meta,
    }));
  }

  async getServiceHealth(serviceName: string): Promise<ServiceHealth[]> {
    const result = await this.consul.health.service({
      service: serviceName,
    });

    return result.map((entry: any) => ({
      serviceId: entry.Service.ID,
      status: entry.Checks.every((c: any) => c.Status === 'passing')
        ? 'healthy'
        : 'unhealthy',
      checks: entry.Checks.map((c: any) => ({
        name: c.Name,
        status: c.Status,
        output: c.Output,
      })),
    }));
  }

  async watchService(
    serviceName: string,
    callback: (instances: ServiceInstance[]) => void
  ): Promise<Consul.Watch> {
    const watch = this.consul.watch({
      method: this.consul.health.service,
      options: {
        service: serviceName,
        passing: true,
      },
    });

    watch.on('change', (data: any) => {
      const instances = data.map((entry: any) => ({
        id: entry.Service.ID,
        address: entry.Service.Address,
        port: entry.Service.Port,
        tags: entry.Service.Tags,
      }));
      callback(instances);
    });

    watch.on('error', (err: Error) => {
      console.error(`Watch error for service ${serviceName}:`, err);
    });

    return watch;
  }
}

export interface ServiceInstance {
  id: string;
  address: string;
  port: number;
  tags?: string[];
  meta?: Record<string, string>;
}

export interface ServiceHealth {
  serviceId: string;
  status: 'healthy' | 'unhealthy';
  checks: Array<{
    name: string;
    status: string;
    output: string;
  }>;
}
```

### Step 3: Service Registration

**Create `src/infrastructure/service-mesh/service-registry.ts`:**

```typescript
import { ConsulClient, ServiceConfig, HealthCheck } from './consul/consul-client';
import os from 'os';

export class ServiceRegistry {
  private consulClient: ConsulClient;
  private serviceId?: string;

  constructor(consulHost?: string, consulPort?: string) {
    this.consulClient = new ConsulClient(consulHost, consulPort);
  }

  async register(
    serviceName: string,
    port: number,
    healthCheckPath: string = '/health'
  ): Promise<void> {
    const hostname = os.hostname();
    const address = this.getLocalIpAddress();

    this.serviceId = `${serviceName}-${hostname}-${port}`;

    const serviceConfig: ServiceConfig = {
      name: serviceName,
      id: this.serviceId,
      address,
      port,
      tags: [
        `version:${process.env.SERVICE_VERSION || '1.0.0'}`,
        `env:${process.env.NODE_ENV || 'development'}`,
      ],
      meta: {
        hostname,
        startTime: new Date().toISOString(),
      },
    };

    const healthCheck: HealthCheck = {
      http: `http://${address}:${port}${healthCheckPath}`,
      interval: '10s',
      timeout: '5s',
      deregisterCriticalServiceAfter: '1m',
    };

    await this.consulClient.registerService(serviceConfig, healthCheck);

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  async deregister(): Promise<void> {
    if (this.serviceId) {
      await this.consulClient.deregisterService(this.serviceId);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      console.log('Shutting down, deregistering service...');
      await this.deregister();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  private getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }
}
```

### Step 4: Load Balancer

**Create `src/infrastructure/service-mesh/load-balancer.ts`:**

```typescript
import { ConsulClient, ServiceInstance } from './consul/consul-client';

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_CONNECTIONS = 'LEAST_CONNECTIONS',
  RANDOM = 'RANDOM',
  WEIGHTED = 'WEIGHTED',
}

export class LoadBalancer {
  private consulClient: ConsulClient;
  private currentIndex = 0;
  private connectionCounts = new Map<string, number>();

  constructor(consulClient: ConsulClient) {
    this.consulClient = consulClient;
  }

  async getServiceInstance(
    serviceName: string,
    strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN
  ): Promise<ServiceInstance | null> {
    const instances = await this.consulClient.discoverService(serviceName);

    if (instances.length === 0) {
      return null;
    }

    switch (strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.roundRobin(instances);
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return this.leastConnections(instances);
      case LoadBalancingStrategy.RANDOM:
        return this.random(instances);
      case LoadBalancingStrategy.WEIGHTED:
        return this.weighted(instances);
      default:
        return this.roundRobin(instances);
    }
  }

  private roundRobin(instances: ServiceInstance[]): ServiceInstance {
    const instance = instances[this.currentIndex % instances.length];
    this.currentIndex++;
    return instance;
  }

  private leastConnections(instances: ServiceInstance[]): ServiceInstance {
    let minConnections = Infinity;
    let selectedInstance = instances[0];

    for (const instance of instances) {
      const connections = this.connectionCounts.get(instance.id) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedInstance = instance;
      }
    }

    return selectedInstance;
  }

  private random(instances: ServiceInstance[]): ServiceInstance {
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  private weighted(instances: ServiceInstance[]): ServiceInstance {
    // Implement weighted load balancing based on instance tags/meta
    const weights = instances.map((instance) => {
      const weight = instance.meta?.weight ? parseInt(instance.meta.weight) : 1;
      return weight;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < instances.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return instances[i];
      }
    }

    return instances[0];
  }

  incrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, current + 1);
  }

  decrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, Math.max(0, current - 1));
  }
}
```

### Step 5: Circuit Breaker

**Create `src/infrastructure/service-mesh/circuit-breaker.ts`:**

```typescript
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      resetTimeout: 30000,
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        console.log(`Circuit breaker for ${this.serviceName}: OPEN -> HALF_OPEN`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(
          `Circuit breaker is OPEN for ${this.serviceName}. Next attempt at ${this.nextAttemptTime}`
        );
      }
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
      ),
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      console.log(
        `Circuit breaker for ${this.serviceName}: Success count ${this.successCount}/${this.config.successThreshold}`
      );

      if (this.successCount >= this.config.successThreshold) {
        console.log(`Circuit breaker for ${this.serviceName}: HALF_OPEN -> CLOSED`);
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    console.log(
      `Circuit breaker for ${this.serviceName}: Failure count ${this.failureCount}/${this.config.failureThreshold}`
    );

    if (this.state === CircuitState.HALF_OPEN) {
      console.log(`Circuit breaker for ${this.serviceName}: HALF_OPEN -> OPEN`);
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      this.setNextAttemptTime();
    }

    if (this.failureCount >= this.config.failureThreshold) {
      console.log(`Circuit breaker for ${this.serviceName}: CLOSED -> OPEN`);
      this.state = CircuitState.OPEN;
      this.setNextAttemptTime();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return true;
    }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  private setNextAttemptTime(): void {
    this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
```

### Step 6: Service Client with Circuit Breaker

**Create `src/infrastructure/service-mesh/service-client.ts`:**

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { LoadBalancer, LoadBalancingStrategy } from './load-balancer';
import { CircuitBreaker } from './circuit-breaker';
import { ConsulClient } from './consul/consul-client';

export class ServiceClient {
  private consulClient: ConsulClient;
  private loadBalancer: LoadBalancer;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private axiosInstance: AxiosInstance;

  constructor(consulHost?: string, consulPort?: string) {
    this.consulClient = new ConsulClient(consulHost, consulPort);
    this.loadBalancer = new LoadBalancer(this.consulClient);
    this.axiosInstance = axios.create({
      timeout: 30000,
    });
  }

  async call<T>(
    serviceName: string,
    path: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName);

    return circuitBreaker.execute(async () => {
      const instance = await this.loadBalancer.getServiceInstance(
        serviceName,
        LoadBalancingStrategy.ROUND_ROBIN
      );

      if (!instance) {
        throw new Error(`No healthy instances found for service: ${serviceName}`);
      }

      const url = `http://${instance.address}:${instance.port}${path}`;

      try {
        this.loadBalancer.incrementConnections(instance.id);
        const response = await this.axiosInstance.request<T>({
          ...config,
          url,
        });
        return response.data;
      } finally {
        this.loadBalancer.decrementConnections(instance.id);
      }
    });
  }

  private getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName));
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  getCircuitBreakerMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    for (const [serviceName, breaker] of this.circuitBreakers) {
      metrics[serviceName] = breaker.getMetrics();
    }
    return metrics;
  }
}
```

### Step 7: Integration with Services

**Update service bootstrap to register with Consul:**

```typescript
// In payment-service/src/main.ts
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

  // ... rest of bootstrap
}
```

---

## Testing

**Create `tests/integration/service-mesh/service-discovery.test.ts`:**

```typescript
import { ConsulClient } from '@infrastructure/service-mesh/consul/consul-client';
import { ServiceRegistry } from '@infrastructure/service-mesh/service-registry';

describe('Service Discovery', () => {
  let consulClient: ConsulClient;
  let serviceRegistry: ServiceRegistry;

  beforeAll(() => {
    consulClient = new ConsulClient();
    serviceRegistry = new ServiceRegistry();
  });

  it('should register service', async () => {
    await serviceRegistry.register('test-service', 3000);

    const instances = await consulClient.discoverService('test-service');
    expect(instances.length).toBeGreaterThan(0);
  });

  it('should discover healthy services only', async () => {
    const instances = await consulClient.discoverService('payment-service');
    
    for (const instance of instances) {
      const health = await consulClient.getServiceHealth('payment-service');
      const instanceHealth = health.find((h) => h.serviceId === instance.id);
      expect(instanceHealth?.status).toBe('healthy');
    }
  });
});
```

---

## Deliverables

- [ ] Consul cluster setup
- [ ] Service registry client
- [ ] Service registration/deregistration
- [ ] Service discovery
- [ ] Load balancer (multiple strategies)
- [ ] Circuit breaker implementation
- [ ] Service client with failover
- [ ] Health checks
- [ ] Tests
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 9: Distributed Tracing & Monitoring**
2. Monitor circuit breaker metrics
3. Setup alerts for service health

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
