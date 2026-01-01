# Phase 3 - Task 9: Distributed Tracing & Monitoring

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Tasks 1-8 (All Services Running)

---

## Objective

Implement comprehensive distributed tracing with Jaeger, metrics collection with Prometheus, visualization with Grafana, and log aggregation for complete observability.

---

## Context

Observability Stack:
- **Distributed Tracing:** Jaeger for request tracing across services
- **Metrics:** Prometheus for time-series metrics
- **Visualization:** Grafana for dashboards
- **Logging:** ELK Stack (optional) or structured logging
- **Alerting:** Prometheus Alertmanager

---

## Implementation Steps

### Step 1: Jaeger Setup

**Create `docker-compose.jaeger.yml`:**

```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:1.50
    container_name: jaeger
    environment:
      COLLECTOR_ZIPKIN_HOST_PORT: :9411
      COLLECTOR_OTLP_ENABLED: true
    ports:
      - "5775:5775/udp"   # accept zipkin.thrift over compact thrift protocol
      - "6831:6831/udp"   # accept jaeger.thrift over compact thrift protocol
      - "6832:6832/udp"   # accept jaeger.thrift over binary thrift protocol
      - "5778:5778"       # serve configs
      - "16686:16686"     # serve frontend
      - "14268:14268"     # accept jaeger.thrift directly from clients
      - "14250:14250"     # accept model.proto
      - "9411:9411"       # Zipkin compatible endpoint
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

### Step 2: Tracing Implementation

**Install dependencies:**

```bash
npm install jaeger-client opentracing
npm install --save-dev @types/jaeger-client @types/opentracing
```

**Create `src/infrastructure/tracing/jaeger-tracer.ts`:**

```typescript
import { initTracer, JaegerTracer, TracingConfig, TracingOptions } from 'jaeger-client';
import { FORMAT_HTTP_HEADERS, Span, SpanContext } from 'opentracing';

export function createTracer(serviceName: string): JaegerTracer {
  const config: TracingConfig = {
    serviceName,
    sampler: {
      type: 'const',
      param: 1, // Sample all requests (1 = 100%)
    },
    reporter: {
      logSpans: true,
      agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
      agentPort: Number(process.env.JAEGER_AGENT_PORT) || 6831,
      flushIntervalMs: 1000,
    },
  };

  const options: TracingOptions = {
    logger: {
      info: (msg: string) => console.log('Jaeger INFO:', msg),
      error: (msg: string) => console.error('Jaeger ERROR:', msg),
    },
  };

  return initTracer(config, options);
}

export class TracingService {
  constructor(private tracer: JaegerTracer) {}

  startSpan(operationName: string, parentSpan?: Span): Span {
    if (parentSpan) {
      return this.tracer.startSpan(operationName, {
        childOf: parentSpan,
      });
    }
    return this.tracer.startSpan(operationName);
  }

  injectContext(span: Span, headers: Record<string, string>): void {
    this.tracer.inject(span.context(), FORMAT_HTTP_HEADERS, headers);
  }

  extractContext(headers: Record<string, string>): SpanContext | null {
    return this.tracer.extract(FORMAT_HTTP_HEADERS, headers);
  }

  finishSpan(span: Span, error?: Error): void {
    if (error) {
      span.setTag('error', true);
      span.log({
        event: 'error',
        message: error.message,
        stack: error.stack,
      });
    }
    span.finish();
  }
}
```

**Create Express middleware:**

**Create `src/infrastructure/tracing/tracing.middleware.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { JaegerTracer } from 'jaeger-client';
import { FORMAT_HTTP_HEADERS, Span } from 'opentracing';

export function tracingMiddleware(tracer: JaegerTracer) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract parent span context from headers
    const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, req.headers);

    // Start span
    const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`, {
      childOf: parentSpanContext || undefined,
    });

    // Add tags
    span.setTag('http.method', req.method);
    span.setTag('http.url', req.url);
    span.setTag('http.path', req.path);
    span.setTag('span.kind', 'server');

    // Add correlation ID
    const correlationId = req.headers['x-correlation-id'] || generateId();
    span.setTag('correlation.id', correlationId);

    // Attach span to request
    (req as any).span = span;
    (req as any).correlationId = correlationId;

    // Finish span on response
    res.on('finish', () => {
      span.setTag('http.status_code', res.statusCode);
      
      if (res.statusCode >= 400) {
        span.setTag('error', true);
      }

      span.finish();
    });

    next();
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### Step 3: Prometheus Metrics

**Install dependencies:**

```bash
npm install prom-client
```

**Create `src/infrastructure/metrics/prometheus-metrics.ts`:**

```typescript
import { Counter, Histogram, Gauge, register, Registry } from 'prom-client';

export class PrometheusMetrics {
  private registry: Registry;
  
  // HTTP Metrics
  public httpRequestDuration: Histogram;
  public httpRequestTotal: Counter;
  public httpRequestErrors: Counter;

  // Business Metrics
  public ordersTotal: Counter;
  public paymentsTotal: Counter;
  public notificationsSent: Counter;

  // System Metrics
  public activeConnections: Gauge;
  public kafkaLag: Gauge;

  constructor(serviceName: string) {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ service: serviceName });

    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    // Business Metrics
    this.ordersTotal = new Counter({
      name: 'orders_total',
      help: 'Total number of orders',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.paymentsTotal = new Counter({
      name: 'payments_total',
      help: 'Total number of payments',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.notificationsSent = new Counter({
      name: 'notifications_sent_total',
      help: 'Total number of notifications sent',
      labelNames: ['type', 'channel'],
      registers: [this.registry],
    });

    // System Metrics
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });

    this.kafkaLag = new Gauge({
      name: 'kafka_consumer_lag',
      help: 'Kafka consumer lag',
      labelNames: ['topic', 'partition'],
      registers: [this.registry],
    });
  }

  getMetrics(): string {
    return this.registry.metrics();
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );

    this.httpRequestTotal.inc({ method, route, status_code: statusCode });

    if (statusCode >= 400) {
      this.httpRequestErrors.inc({
        method,
        route,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error',
      });
    }
  }
}
```

**Create metrics middleware:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrometheusMetrics } from './prometheus-metrics';

export function metricsMiddleware(metrics: PrometheusMetrics) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      metrics.recordHttpRequest(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration
      );
    });

    next();
  };
}
```

### Step 4: Prometheus Setup

**Create `docker-compose.prometheus.yml`:**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
    networks:
      - monitoring

volumes:
  prometheus-data:

networks:
  monitoring:
    driver: bridge
```

**Create `monitoring/prometheus.yml`:**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts.yml'

scrape_configs:
  - job_name: 'core-service'
    static_configs:
      - targets: ['host.docker.internal:3000']

  - job_name: 'payment-service'
    static_configs:
      - targets: ['host.docker.internal:3001']

  - job_name: 'notification-service'
    static_configs:
      - targets: ['host.docker.internal:3002']

  - job_name: 'kafka'
    static_configs:
      - targets: ['kafka-exporter:9308']

  - job_name: 'consul'
    static_configs:
      - targets: ['consul:8500']
```

**Create `monitoring/alerts.yml`:**

```yaml
groups:
  - name: service_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for {{ $labels.service }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s for {{ $labels.service }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} has been down for more than 1 minute"

      - alert: HighKafkaLag
        expr: kafka_consumer_lag > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Kafka consumer lag"
          description: "Lag is {{ $value }} for {{ $labels.topic }}"
```

### Step 5: Grafana Setup

**Create `docker-compose.grafana.yml`:**

```yaml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - monitoring

volumes:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

**Create `monitoring/grafana/datasources/prometheus.yml`:**

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### Step 6: Structured Logging

**Create `src/infrastructure/logging/logger.ts`:**

```typescript
import winston from 'winston';

export function createLogger(serviceName: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service: serviceName,
      environment: process.env.NODE_ENV,
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
      }),
    ],
  });
}

// Logging middleware
export function loggingMiddleware(logger: winston.Logger) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        correlationId: req.correlationId,
        userId: req.user?.id,
      });
    });

    next();
  };
}
```

---

## Deliverables

- [ ] Jaeger distributed tracing
- [ ] Trace context propagation
- [ ] Prometheus metrics collection
- [ ] Custom business metrics
- [ ] Grafana dashboards
- [ ] Alert rules
- [ ] Structured logging
- [ ] Log correlation
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 10: Testing & Validation**
2. Create custom Grafana dashboards
3. Setup PagerDuty/Slack alerts

---

**Task Owner:** DevOps + Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
