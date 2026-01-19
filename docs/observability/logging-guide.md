# Advanced Observability & Logging Guide

## Overview

This guide provides comprehensive documentation for the centralized logging and observability system using the ELK stack (Elasticsearch, Logstash, Kibana) and Fluent Bit.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Pods                       │
│  (Structured logs written to stdout/stderr)             │
└────────────┬────────────────────────────────────────────┘
             │
             │ Container logs
             ▼
    ┌────────────────┐
    │   Fluent Bit   │
    │  (DaemonSet)   │
    │  Log Collector │
    └────────┬───────┘
             │
             │ Parsed & enriched logs
             ▼
    ┌────────────────┐
    │ Elasticsearch  │
    │   (3 nodes)    │
    │  Log Storage   │
    └────┬───────┬───┘
         │       │
         │       └─────────────┐
         ▼                     ▼
┌─────────────────┐   ┌────────────────┐
│     Kibana      │   │   ElastAlert   │
│  (Visualization)│   │   (Alerting)   │
└─────────────────┘   └────────┬───────┘
                               │
                               ▼
                      ┌────────────────┐
                      │ Slack/PagerDuty│
                      └────────────────┘
```

---

## Components

### 1. Elasticsearch

**Purpose:** Centralized log storage and search engine

**Configuration:**
- 3-node cluster for high availability
- 100Gi storage per node
- Index pattern: `logs-YYYY.MM.DD`
- 90-day retention policy

**Access:**
```bash
# Port-forward to access Elasticsearch
kubectl port-forward -n logging svc/elasticsearch-es-http 9200:9200

# Test connection
curl -k https://localhost:9200
```

### 2. Kibana

**Purpose:** Log visualization and analysis

**Features:**
- Log search and filtering
- Custom dashboards
- Index pattern management
- Saved searches

**Access:**
```bash
# Get Kibana URL
kubectl get svc -n logging kibana-kb-http

# Get Kibana password
kubectl get secret -n logging elasticsearch-es-elastic-user -o=jsonpath='{.data.elastic}' | base64 --decode
```

### 3. Fluent Bit

**Purpose:** Log collection and forwarding

**Features:**
- Kubernetes metadata enrichment
- JSON parsing
- Log filtering
- Elasticsearch output

**Configuration:**
```yaml
# View Fluent Bit config
kubectl get configmap -n logging fluent-bit-config -o yaml
```

### 4. ElastAlert

**Purpose:** Log-based alerting

**Alert Rules:**
1. High error rate (>50 errors/5min)
2. Security anomalies
3. Slow database queries (>1s)
4. Application crashes
5. Unusual traffic spikes

---

## Log Query Examples

### Basic Queries

**Search for errors:**
```
level:error
```

**Search by service:**
```
service:"core-service" AND level:error
```

**Search by time range:**
```
@timestamp:[now-1h TO now] AND level:error
```

**Search for specific message:**
```
message:"database connection failed"
```

### Advanced Queries

**Find slow requests:**
```
type:http_request AND duration:>1000
```

**Find security events:**
```
type:security_event AND severity:high
```

**Find errors in specific service:**
```
service:"payment-service" AND level:error AND @timestamp:[now-24h TO now]
```

**Aggregate errors by service:**
```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "level": "error" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "by_service": {
      "terms": { "field": "service.keyword" }
    }
  }
}
```

---

## Structured Logging Best Practices

### Log Levels

- **ERROR:** Application errors, exceptions
- **WARN:** Warnings, degraded performance
- **INFO:** Important business events, HTTP requests
- **DEBUG:** Detailed diagnostic information

### Log Structure

```typescript
logger.info('Event Name', {
    type: 'event_type',
    key1: 'value1',
    key2: 'value2',
    timestamp: new Date().toISOString(),
});
```

### Examples

**HTTP Request:**
```typescript
logger.info('HTTP Request', {
    type: 'http_request',
    method: 'GET',
    url: '/api/products',
    statusCode: 200,
    duration: 45,
    userId: 'user123',
});
```

**Database Query:**
```typescript
logger.debug('Database Query', {
    type: 'database_query',
    query: 'findOne',
    collection: 'users',
    duration: 12,
});
```

**Business Event:**
```typescript
logger.info('Order Created', {
    type: 'business_event',
    event: 'order_created',
    orderId: 'ORD-123',
    userId: 'user123',
    amount: 99.99,
});
```

**Error:**
```typescript
logger.error('Payment Failed', {
    type: 'error',
    error: error.message,
    stack: error.stack,
    orderId: 'ORD-123',
    userId: 'user123',
});
```

---

## Kibana Dashboards

### Creating Dashboards

1. **Navigate to Kibana**
2. **Create Index Pattern:**
   - Go to Management → Index Patterns
   - Create pattern: `logs-*`
   - Select time field: `@timestamp`

3. **Create Visualizations:**
   - Go to Visualize → Create visualization
   - Select visualization type
   - Configure metrics and buckets

4. **Create Dashboard:**
   - Go to Dashboard → Create dashboard
   - Add visualizations
   - Save dashboard

### Recommended Dashboards

**1. Error Monitoring:**
- Error count over time
- Errors by service
- Top error messages
- Error rate percentage

**2. Performance Monitoring:**
- Request rate
- Average response time
- P95/P99 latency
- Slow requests

**3. Security Monitoring:**
- Failed authentication attempts
- Suspicious activity
- Security events by severity

---

## Alerting

### Alert Configuration

Alerts are configured in `k8s/logging/elastalert-rules.yaml`

**Alert Types:**
1. **Frequency:** Triggers when event count exceeds threshold
2. **Spike:** Triggers on sudden increase
3. **Any:** Triggers on any matching event

### Testing Alerts

```bash
# Generate test errors
for i in {1..60}; do
  logger.error('Test error for alerting');
done

# Check ElastAlert logs
kubectl logs -n logging -l app=elastalert
```

### Alert Channels

- **Slack:** Real-time notifications
- **PagerDuty:** Critical incidents
- **Email:** Daily summaries

---

## Log Analysis

### Using Log Analyzer

```bash
# Analyze errors
npm run logs:analyze

# Generate daily report
npm run logs:report
```

### Output

```
=== Daily Log Analysis Report ===

Error Summary (24 hours):
- Total Errors: 245
- Top Services:
  - core-service: 120 errors
  - payment-service: 85 errors

Top Error Messages:
1. Database connection timeout (45 occurrences)
2. Invalid user token (32 occurrences)

Slow Requests:
- Total: 23
- Slowest: 2,345ms - /api/orders/search

Recommendations:
- Investigate database connection issues
- Review authentication logic
```

---

## Troubleshooting

### Issue: No logs appearing in Kibana

**Possible Causes:**
- Fluent Bit not running
- Elasticsearch not accessible
- Index pattern not created

**Solutions:**
```bash
# Check Fluent Bit status
kubectl get pods -n logging -l app=fluent-bit

# Check Fluent Bit logs
kubectl logs -n logging -l app=fluent-bit

# Check Elasticsearch health
kubectl exec -n logging elasticsearch-es-default-0 -- curl -k https://localhost:9200/_cluster/health
```

### Issue: High Elasticsearch disk usage

**Solutions:**
```bash
# Check disk usage
kubectl exec -n logging elasticsearch-es-default-0 -- df -h

# Delete old indices
curl -X DELETE "localhost:9200/logs-2025.01.01"

# Configure index lifecycle management
```

### Issue: Slow log queries

**Solutions:**
- Reduce time range
- Use specific filters
- Optimize index patterns
- Increase Elasticsearch resources

---

## Best Practices

### Do's ✅

- Use structured logging consistently
- Include correlation IDs in logs
- Log at appropriate levels
- Include context in error logs
- Use log sampling for high-volume logs
- Set up log retention policies
- Create meaningful dashboards
- Test alerts regularly

### Don'ts ❌

- Don't log sensitive data (passwords, tokens)
- Don't log at DEBUG level in production
- Don't create too many custom fields
- Don't ignore log storage costs
- Don't skip log analysis
- Don't disable alerting

---

## Maintenance

### Daily Tasks
- [ ] Review error dashboards
- [ ] Check alert notifications
- [ ] Verify log ingestion rate

### Weekly Tasks
- [ ] Review slow queries
- [ ] Analyze error trends
- [ ] Update alert thresholds
- [ ] Clean up old indices

### Monthly Tasks
- [ ] Review storage usage
- [ ] Optimize dashboards
- [ ] Update documentation
- [ ] Train team on new features

---

## Quick Reference

### Commands

```bash
# Deploy ELK stack
kubectl apply -f k8s/logging/elasticsearch.yaml
kubectl apply -f k8s/logging/fluent-bit.yaml
kubectl apply -f k8s/logging/elastalert-rules.yaml

# Check status
kubectl get pods -n logging

# View logs
kubectl logs -n logging -l app=fluent-bit
kubectl logs -n logging -l app=elastalert

# Analyze logs
npm run logs:analyze
npm run logs:report
```

### Files

- Elasticsearch: `k8s/logging/elasticsearch.yaml`
- Fluent Bit: `k8s/logging/fluent-bit.yaml`
- ElastAlert: `k8s/logging/elastalert-rules.yaml`
- Log Analyzer: `scripts/observability/log-analyzer.ts`
- Logging Middleware: `src/api/middleware/logging.middleware.ts`

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
