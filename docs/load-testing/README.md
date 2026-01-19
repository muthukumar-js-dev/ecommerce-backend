# Load Testing & Capacity Planning Guide

## Overview

Comprehensive guide for load testing and capacity planning to validate the system can handle 10 million concurrent users and 100K RPS.

## Quick Start

### 1. Install Tools

```bash
# Install Artillery
npm install -g artillery@latest

# Verify installation
artillery --version
```

### 2. Run Load Tests

```bash
# Production simulation (10 phases, up to 100K RPS)
artillery run load-tests/scenarios/production-simulation.yml

# Stress test (find breaking point)
artillery run load-tests/scenarios/stress-test.yml

# HPA test
artillery run load-tests/hpa-load-test.yml
```

### 3. Analyze Results

```bash
# View report
artillery report <test-run-id>

# Export metrics to Prometheus
artillery run --output report.json load-tests/scenarios/production-simulation.yml
```

## Load Test Scenarios

### Production Simulation

**File:** [`load-tests/scenarios/production-simulation.yml`](file:///D:/github/ecommerce-backend/load-tests/scenarios/production-simulation.yml)

**Phases:**
1. Warm-up: 100 RPS (5 min)
2. Ramp to 1K RPS (5 min)
3. Sustained 1K RPS (10 min)
4. Ramp to 10K RPS (10 min)
5. Sustained 10K RPS (30 min)
6. Ramp to 50K RPS (5 min)
7. Sustained 50K RPS (10 min)
8. Spike to 100K RPS (2 min)
9. Sustained 100K RPS (3 min)
10. Ramp down (5 min)

**Scenarios:**
- Product Browsing (50%)
- Shopping Cart (25%)
- Order Placement (15%)
- User Authentication (10%)

### Stress Test

**File:** [`load-tests/scenarios/stress-test.yml`](file:///D:/github/ecommerce-backend/load-tests/scenarios/stress-test.yml)

**Purpose:** Find system breaking point

**Phases:**
- Ramp to 200K RPS (10 min)
- Sustained 200K RPS (5 min)
- Recovery ramp down (5 min)

### HPA Test

**File:** [`load-tests/hpa-load-test.yml`](file:///D:/github/ecommerce-backend/load-tests/hpa-load-test.yml)

**Purpose:** Validate HPA behavior

**Phases:**
- Baseline, Ramp-up, Sustained, Spike, Ramp-down, Cool-down

## Capacity Planning

### Current Capacity

- **RPS:** 10,000
- **Pods:** 11 (5 core, 3 payment, 3 notification)
- **CPU:** 5.75 cores
- **Memory:** 11.5GB
- **Cost:** ~$420/month

### Target Capacity (100K RPS)

- **RPS:** 100,000
- **Pods:** 100 (50 core, 30 payment, 20 notification)
- **CPU:** 45 cores
- **Memory:** 90GB
- **Cost:** ~$3,285/month (services only)

**Full Infrastructure:**
- Total Pods: 139
- Total CPU: 123 cores
- Total Memory: 402GB
- **Total Cost:** ~$8,979/month

### Scaling Phases

**Phase 1:** 10K → 25K RPS (Week 1-2)
- Cost: $3,000/month

**Phase 2:** 25K → 50K RPS (Week 3-4)
- Cost: $5,500/month

**Phase 3:** 50K → 100K RPS (Week 5-6)
- Cost: $8,979/month

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| RPS | 100,000 | Artillery |
| P50 Response Time | <250ms | Prometheus |
| P95 Response Time | <500ms | Prometheus |
| P99 Response Time | <1000ms | Prometheus |
| Error Rate | <1% | Prometheus |
| CPU Utilization | 70% avg | Kubernetes |
| Memory Utilization | 75% avg | Kubernetes |

## Running Load Tests

### Local Testing

```bash
# Small load test
artillery quick --count 100 --num 10 https://api.yourdomain.com/api/products

# Custom scenario
artillery run load-tests/scenarios/production-simulation.yml
```

### Distributed Testing

```bash
# Using Artillery Pro (distributed)
artillery run-fargate \
  --region ap-south-1 \
  --count 10 \
  load-tests/scenarios/production-simulation.yml
```

### Continuous Testing

```bash
# Schedule daily load tests
# Add to cron: 0 2 * * * artillery run load-tests/scenarios/production-simulation.yml
```

## Analyzing Results

### Key Metrics

```bash
# View summary
artillery report report.json

# Key metrics to check:
# - http.request_rate (RPS achieved)
# - http.response_time.p95 (95th percentile)
# - http.response_time.p99 (99th percentile)
# - errors.ETIMEDOUT (timeout errors)
# - errors.ECONNREFUSED (connection errors)
```

### Success Criteria

- ✅ Achieved target RPS (100K)
- ✅ P95 < 500ms
- ✅ P99 < 1000ms
- ✅ Error rate < 1%
- ✅ No pod crashes
- ✅ HPA scaled appropriately

## Bottleneck Identification

### Common Bottlenecks

1. **Database Connections**
   - Symptom: Connection pool exhausted
   - Solution: Increase pool size, add mongos routers

2. **Memory Limits**
   - Symptom: OOMKilled pods
   - Solution: Increase memory limits

3. **CPU Throttling**
   - Symptom: High CPU wait time
   - Solution: Increase CPU limits or add pods

4. **Network Bandwidth**
   - Symptom: High latency, packet loss
   - Solution: Use enhanced networking instances

### Debugging Tools

```bash
# Check pod resources
kubectl top pods -n ecommerce-prod

# Check HPA status
kubectl get hpa -n ecommerce-prod

# Check logs
kubectl logs -n ecommerce-prod deployment/core-service --tail=100

# Check events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'
```

## Cost Optimization

### Strategies

1. **Reserved Instances:** 40-60% savings
2. **Spot Instances:** 70-90% savings (non-critical)
3. **Auto-Scaling:** 20-30% savings (off-peak)
4. **Right-Sizing:** 15% savings (reduce waste)

### Cost Breakdown

| Component | Monthly Cost | Optimization |
|-----------|--------------|--------------|
| Application Services | $3,285 | Use HPA |
| MongoDB | $4,380 | Reserved instances |
| Redis | $1,314 | Reserved instances |
| **Total** | **$8,979** | **Save ~$2,500** |

**Optimized Cost:** ~$6,500/month

## Best Practices

1. **Test Regularly** - Weekly small tests, monthly full tests
2. **Monitor Continuously** - Real-time metrics and alerts
3. **Scale Gradually** - Don't jump from 10K to 100K immediately
4. **Use HPA** - Automatic scaling based on load
5. **Cache Aggressively** - Redis for frequently accessed data
6. **Optimize Queries** - Database query performance
7. **Use CDN** - Static assets on CloudFront
8. **Plan for Spikes** - 30% buffer above expected load
9. **Document Findings** - Keep load test reports
10. **Review Quarterly** - Update capacity plan

## Troubleshooting

### High Error Rate

**Check:**
```bash
# Application logs
kubectl logs -n ecommerce-prod deployment/core-service

# Error distribution
kubectl logs -n ecommerce-prod deployment/core-service | grep ERROR | sort | uniq -c
```

**Common Causes:**
- Database connection pool exhausted
- Memory limits exceeded
- Timeout errors
- Rate limiting

### Slow Response Times

**Check:**
```bash
# Prometheus query
http_request_duration_seconds{quantile="0.95"}

# Database query time
mongodb_query_duration_seconds
```

**Common Causes:**
- Slow database queries
- High CPU utilization
- Network latency
- Cache misses

### HPA Not Scaling

**Check:**
```bash
kubectl describe hpa core-service-hpa -n ecommerce-prod
kubectl top pods -n ecommerce-prod
```

**Common Causes:**
- Metrics not available
- At max replicas
- Stabilization window
- Resource limits

## Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Capacity Planning Guide](./capacity-analysis.md)
- [Performance Benchmarks](../performance/)
- [HPA Configuration](../autoscaling/)
