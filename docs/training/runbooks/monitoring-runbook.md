# Monitoring Runbook

## Accessing Monitoring Tools

### Grafana
- URL: http://grafana.profitcart.com
- Default credentials: admin/admin (change immediately)

### Prometheus
- URL: http://prometheus.profitcart.com
- Query interface for metrics

### Jaeger
- URL: http://jaeger.profitcart.com
- Distributed tracing UI

## Key Metrics to Monitor

### Application Metrics

1. **Request Rate**
   - Metric: `http_requests_total`
   - Alert: >10,000 req/s

2. **Error Rate**
   - Metric: `http_requests_errors_total`
   - Alert: >5% error rate

3. **Response Time**
   - Metric: `http_request_duration_seconds`
   - Alert: p95 >1s

### Infrastructure Metrics

1. **CPU Usage**
   - Metric: `container_cpu_usage_seconds_total`
   - Alert: >80%

2. **Memory Usage**
   - Metric: `container_memory_usage_bytes`
   - Alert: >85%

3. **Disk Usage**
   - Metric: `node_filesystem_avail_bytes`
   - Alert: <10% free

### Business Metrics

1. **Orders per Minute**
   - Metric: `orders_created_total`
   - Alert: <100/min (during peak hours)

2. **Payment Success Rate**
   - Metric: `payments_success_rate`
   - Alert: <95%

## Alert Response

### Critical Alert
1. Acknowledge alert
2. Check affected services
3. Review recent deployments
4. Take immediate action (rollback, scale, etc.)
5. Document incident

### Warning Alert
1. Investigate root cause
2. Monitor trend
3. Plan remediation
4. Update runbook

## Creating Dashboards

```bash
# Generate dashboards
npm run monitoring:create-dashboards

# Import to Grafana
# Navigate to Grafana > Dashboards > Import
# Upload JSON from monitoring/dashboards/
```

## Querying Metrics

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_errors_total[5m]) / rate(http_requests_total[5m])

# CPU usage
rate(container_cpu_usage_seconds_total[5m])
```
