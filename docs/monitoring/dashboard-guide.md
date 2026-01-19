# Grafana Dashboard Guide

## Overview

This guide explains how to use and interpret the Grafana dashboards for monitoring the e-commerce platform.

---

## Available Dashboards

### 1. Production - Real-Time Overview

**Purpose:** High-level overview of system health and performance

**Refresh Rate:** 10 seconds

**Key Panels:**
- Request Rate (RPS)
- Error Rate
- Latency Distribution
- Active Users
- Database Performance
- Cache Performance
- Pod Health
- Resource Utilization
- Business Metrics
- SLA Compliance

**Access:** `https://grafana.yourdomain.com/d/production`

---

## Panel Descriptions

### Request Rate (RPS)

**Metric:** `sum(rate(http_requests_total{namespace='ecommerce-prod'}[1m]))`

**What it shows:** Total requests per second across all services

**Normal range:** 10,000 - 100,000 RPS

**Alert threshold:** <50,000 RPS (low traffic alert)

**Troubleshooting:**
- Sudden drop → Check load balancer, DNS
- Gradual decline → Marketing campaign ended, user behavior change
- Spike → Traffic surge, potential DDoS

### Error Rate

**Metric:** `(errors / total_requests) * 100`

**What it shows:** Percentage of failed requests

**Normal range:** <0.1%

**Alert thresholds:**
- Yellow: >0.5%
- Red: >1.0%

**Troubleshooting:**
- Check application logs
- Verify database connectivity
- Check external service dependencies
- Review recent deployments

### Latency Distribution (Heatmap)

**Metric:** `http_request_duration_seconds_bucket`

**What it shows:** Distribution of request latencies over time

**Normal range:** Most requests <200ms

**Troubleshooting:**
- Dark bands at high latency → Slow queries, external API delays
- Gradual increase → Resource exhaustion, memory leaks
- Sudden spike → Deployment issue, database problem

### Active Users

**Metric:** `sum(active_sessions{namespace='ecommerce-prod'})`

**What it shows:** Current number of active user sessions

**Normal range:** Varies by time of day

**Troubleshooting:**
- Sudden drop → Session store issue, Redis problem
- Unexpected spike → Bot traffic, marketing campaign

### Database Performance

**Metrics:**
- P95 Query Time: `histogram_quantile(0.95, rate(mongodb_query_duration_seconds_bucket[5m]))`
- Queries/sec: `rate(mongodb_queries_total[5m])`

**Normal ranges:**
- P95 <100ms
- Queries/sec: 1,000 - 10,000

**Troubleshooting:**
- High query time → Missing indexes, slow queries
- High query rate → N+1 queries, inefficient code

### Cache Performance

**Metric:** `(hits / (hits + misses)) * 100`

**What it shows:** Redis cache hit rate percentage

**Normal range:** >80%

**Alert threshold:** <70%

**Troubleshooting:**
- Low hit rate → Cache warming needed, TTL too short
- Sudden drop → Cache cleared, Redis restart

### Pod Health

**Metric:** `kube_pod_status_phase{namespace='ecommerce-prod'}`

**What it shows:** Status of all pods (Running, Pending, Failed)

**Normal state:** All pods Running

**Troubleshooting:**
- Pending → Resource constraints, node issues
- Failed → Application crash, configuration error
- CrashLoopBackOff → Startup failure, dependency issue

### Resource Utilization

**Metrics:**
- CPU: `rate(container_cpu_usage_seconds_total[5m])`
- Memory: `container_memory_usage_bytes`

**Normal ranges:**
- CPU: 50-70%
- Memory: 60-75%

**Alert thresholds:**
- CPU: >80%
- Memory: >85%

**Troubleshooting:**
- High CPU → Inefficient code, infinite loops
- High memory → Memory leaks, large cache

### Business Metrics

**Metrics:**
- Orders/min: `rate(orders_created_total[5m])`
- Revenue/min: `rate(revenue_total[5m])`

**What it shows:** Business KPIs in real-time

**Use cases:**
- Monitor campaign effectiveness
- Detect payment processing issues
- Track business impact of incidents

### SLA Compliance (30-day)

**Metric:** `(1 - (errors / total_requests)) * 100`

**What it shows:** Availability over 30 days

**Target:** 99.99% (4 nines)

**Thresholds:**
- Green: ≥99.99%
- Yellow: ≥99.9%
- Red: <99.9%

**Troubleshooting:**
- Below target → Review incidents, improve reliability

---

## Service-Specific Dashboards

Each service has a detailed dashboard:
- `core-service - Detailed Metrics`
- `payment-service - Detailed Metrics`
- `notification-service - Detailed Metrics`

**Panels:**
1. Request Rate by endpoint
2. Error Rate by endpoint
3. Latency Percentiles (P50, P95, P99)
4. Dependency Performance (MongoDB, Redis)
5. Resource Utilization by pod

---

## Using Dashboards Effectively

### Daily Monitoring

1. **Morning Check:**
   - Review overnight alerts
   - Check SLA compliance
   - Verify all pods healthy

2. **During Business Hours:**
   - Monitor request rate trends
   - Watch error rate
   - Check latency spikes

3. **End of Day:**
   - Review business metrics
   - Check resource utilization trends
   - Plan capacity adjustments

### Incident Response

1. **Alert Received:**
   - Open relevant dashboard
   - Identify affected service
   - Check correlated metrics

2. **Investigation:**
   - Drill down to service dashboard
   - Check dependency performance
   - Review pod health and logs

3. **Resolution:**
   - Monitor metrics during fix
   - Verify return to normal
   - Document incident

### Performance Analysis

1. **Identify Trends:**
   - Use time range selector
   - Compare to previous periods
   - Look for patterns

2. **Correlate Metrics:**
   - High latency + high DB time → Database issue
   - High error rate + pod restarts → Application issue
   - Low cache hit + high latency → Cache problem

3. **Capacity Planning:**
   - Review resource utilization trends
   - Identify growth patterns
   - Plan scaling

---

## Dashboard Customization

### Time Ranges

- Last 5 minutes: Real-time monitoring
- Last 1 hour: Recent trends
- Last 24 hours: Daily patterns
- Last 7 days: Weekly trends
- Last 30 days: SLA tracking

### Variables

Use dashboard variables to filter:
- Service
- Environment
- Pod
- Endpoint

### Annotations

Add annotations for:
- Deployments
- Incidents
- Configuration changes
- Marketing campaigns

---

## Best Practices

1. **Keep Dashboards Open:**
   - Display on team monitors
   - Set up alerts for anomalies

2. **Regular Reviews:**
   - Daily health checks
   - Weekly trend analysis
   - Monthly capacity planning

3. **Share Insights:**
   - Screenshot important trends
   - Share in team channels
   - Document patterns

4. **Continuous Improvement:**
   - Add new panels as needed
   - Remove unused metrics
   - Refine alert thresholds

---

## Troubleshooting Dashboard Issues

### Dashboard Not Loading

- Check Grafana service status
- Verify Prometheus connectivity
- Check browser console for errors

### No Data Showing

- Verify Prometheus is scraping metrics
- Check metric names in queries
- Verify time range selection

### Slow Dashboard

- Reduce time range
- Simplify complex queries
- Increase refresh interval

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
