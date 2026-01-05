# Distributed Tracing & Monitoring

## Overview

Comprehensive observability stack with Jaeger distributed tracing, Prometheus metrics, Grafana dashboards, and structured logging for complete visibility across all microservices.

## Architecture

```
┌─────────────────────────────────────────┐
│      Observability Stack                │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  Jaeger  │  │Prometheus│  │Grafana ││
│  │  :16686  │  │  :9090   │  │ :3003  ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
           ↑          ↑          ↑
           │ Traces   │ Metrics  │ Dashboards
           │          │          │
    ┌──────┴──┐  ┌────┴────┐  ┌─┴────────┐
    │  Core   │  │ Payment │  │Notification│
    │ Service │  │ Service │  │  Service  │
    │  :3000  │  │  :3001  │  │   :3002   │
    └─────────┘  └─────────┘  └───────────┘
```

## Features

### ✅ Distributed Tracing (Jaeger)
- Trace requests across all services
- Parent-child span relationships
- Trace context propagation via HTTP headers
- Correlation IDs for log correlation
- Error tracking in spans

### ✅ Metrics Collection (Prometheus)
**HTTP Metrics:**
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total request counter
- `http_request_errors_total` - Error counter

**Business Metrics:**
- `orders_total` - Order counter by status
- `payments_total` - Payment counter by status
- `notifications_sent_total` - Notification counter by type/channel

**System Metrics:**
- `active_connections` - Active connection gauge
- `kafka_consumer_lag` - Kafka lag gauge

### ✅ Alerting (Alertmanager)
**Alert Rules:**
- **HighErrorRate:** >5% error rate for 5 minutes
- **HighLatency:** P95 latency >2s for 5 minutes
- **ServiceDown:** Service unavailable for 1 minute
- **HighKafkaLag:** Consumer lag >1000 for 5 minutes

### ✅ Structured Logging (Winston)
- JSON format for easy parsing
- Correlation IDs
- Error stack traces
- Service metadata
- Console + File transports

## Setup

### Prerequisites
- Docker & Docker Compose
- Node.js with TypeScript

### Install Dependencies

```bash
npm install jaeger-client opentracing @types/jaeger-client @types/opentracing
npm install prom-client
npm install winston
```

### Start Monitoring Stack

```bash
# Start Jaeger
docker-compose -f docker-compose.jaeger.yml up -d

# Start Prometheus & Alertmanager
docker-compose -f docker-compose.prometheus.yml up -d

# Start Grafana
docker-compose -f docker-compose.grafana.yml up -d
```

### Verify Services

```bash
# Jaeger UI
open http://localhost:16686

# Prometheus
open http://localhost:9090

# Grafana (admin/admin)
open http://localhost:3003

# Alertmanager
open http://localhost:9093
```

## Usage

### Tracing

```typescript
import { createTracer } from '@infrastructure/tracing/jaeger-tracer';
import { tracingMiddleware } from '@infrastructure/tracing/tracing.middleware';

// Initialize tracer
const tracer = createTracer('my-service');

// Add middleware to Express
app.use(tracingMiddleware(tracer));
```

### Metrics

```typescript
import { PrometheusMetrics } from '@infrastructure/metrics/prometheus-metrics';
import { metricsMiddleware } from '@infrastructure/metrics/metrics.middleware';

// Initialize metrics
const metrics = new PrometheusMetrics('my-service');

// Add middleware
app.use(metricsMiddleware(metrics));

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await metrics.getMetrics());
});

// Record business metrics
metrics.ordersTotal.inc({ status: 'completed' });
metrics.paymentsTotal.inc({ status: 'success' });
```

### Logging

```typescript
import { createLogger, loggingMiddleware } from '@infrastructure/logging/logger';

// Create logger
const logger = createLogger('my-service');

// Add middleware
app.use(loggingMiddleware(logger));

// Use logger
logger.info('Order created', { orderId: '123', userId: '456' });
logger.error('Payment failed', { error: err.message });
```

## Grafana Dashboards

### Create Dashboard

1. Access Grafana at http://localhost:3003
2. Login with admin/admin
3. Add Prometheus datasource (already configured)
4. Create new dashboard
5. Add panels with PromQL queries

### Example Queries

**Request Rate:**
```promql
rate(http_requests_total[5m])
```

**Error Rate:**
```promql
rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])
```

**P95 Latency:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Active Services:**
```promql
up{job=~".*-service"}
```

## Alerting

### Configure Alerts

Alerts are defined in `monitoring/alerts.yml` and automatically loaded by Prometheus.

### Alert Routing

Configure alert routing in `monitoring/alertmanager.yml`:

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK'
        channel: '#alerts'
```

## Trace Context Propagation

Traces automatically propagate across services via HTTP headers:

```typescript
// Service A
const span = req.span; // From tracing middleware
const headers = {};
tracingService.injectContext(span, headers);

// Make HTTP request to Service B with headers
await axios.get('http://service-b/api/endpoint', { headers });

// Service B
// Tracing middleware automatically extracts parent span
// Creates child span for the request
```

## Log Correlation

Correlation IDs link logs across services:

```typescript
// Automatically added by tracing middleware
const correlationId = req.correlationId;

// Use in logs
logger.info('Processing order', { correlationId, orderId: '123' });

// Search logs by correlation ID to trace entire request flow
```

## Monitoring Best Practices

1. **Sampling:** Adjust Jaeger sampling rate in production (currently 100%)
2. **Retention:** Configure Prometheus retention period
3. **Dashboards:** Create service-specific dashboards
4. **Alerts:** Set appropriate thresholds for your SLAs
5. **Logs:** Rotate log files regularly

## Troubleshooting

### Jaeger not receiving traces
```bash
# Check Jaeger logs
docker logs jaeger

# Verify agent port
echo $JAEGER_AGENT_PORT  # Should be 6831

# Test connectivity
nc -zv localhost 6831
```

### Prometheus not scraping metrics
```bash
# Check Prometheus targets
open http://localhost:9090/targets

# Verify metrics endpoint
curl http://localhost:3000/metrics
```

### Grafana datasource not working
```bash
# Check Prometheus URL in datasource
# Should be: http://prometheus:9090

# Test from Grafana container
docker exec grafana curl http://prometheus:9090/api/v1/query?query=up
```

## Environment Variables

```bash
# Jaeger
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Production Considerations

1. **Jaeger:** Use Elasticsearch backend for production
2. **Prometheus:** Setup federation for multi-cluster
3. **Grafana:** Enable authentication and HTTPS
4. **Alertmanager:** Configure PagerDuty/Slack/Email
5. **Logs:** Add ELK stack for centralized logging

## References

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTracing](https://opentracing.io/)
