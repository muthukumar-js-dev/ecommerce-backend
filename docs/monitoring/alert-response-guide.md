# Alert Response Guide

## Overview

This guide provides procedures for responding to production alerts from Prometheus AlertManager.

---

## Alert Severity Levels

| Severity | Response Time | Escalation | Notification |
|----------|--------------|------------|--------------|
| **Critical** | <15 min | Immediate PagerDuty | Slack #incidents |
| **Warning** | <1 hour | After 2 hours | Slack #alerts |
| **Info** | <4 hours | None | Slack #alerts |

---

## Critical Alerts

### HighErrorRate

**Trigger:** Error rate >0.5% for 2 minutes

**Impact:** Users experiencing failures

**Response:**
1. Check Grafana dashboard for affected endpoints
2. Review application logs: `kubectl logs -n ecommerce-prod -l app=core-service --tail=100`
3. Check database connectivity
4. Verify external service dependencies
5. If widespread, consider rollback

**Runbook:** https://runbooks.yourdomain.com/high-error-rate

### CriticalLatency

**Trigger:** P95 latency >500ms for 2 minutes

**Impact:** Severe performance degradation

**Response:**
1. Check database performance dashboard
2. Review slow query logs
3. Check cache hit rate
4. Verify resource utilization
5. Consider scaling up pods

**Runbook:** https://runbooks.yourdomain.com/critical-latency

### PodCrashLooping

**Trigger:** Pod restarting frequently

**Impact:** Reduced capacity, potential outage

**Response:**
1. Check pod logs: `kubectl logs -n ecommerce-prod <pod-name> --previous`
2. Describe pod: `kubectl describe pod -n ecommerce-prod <pod-name>`
3. Check recent deployments
4. Verify configuration and secrets
5. Rollback if deployment-related

**Runbook:** https://runbooks.yourdomain.com/pod-crash-loop

### SLAViolation

**Trigger:** 30-day availability <99.99% for 1 hour

**Impact:** SLA breach, potential penalties

**Response:**
1. Notify leadership immediately
2. Review all incidents in past 30 days
3. Calculate actual downtime
4. Prepare incident report
5. Plan corrective actions

**Runbook:** https://runbooks.yourdomain.com/sla-violation

### DatabaseConnectionPoolExhausted

**Trigger:** 90% of database connections in use

**Impact:** New requests will fail

**Response:**
1. Check for connection leaks in code
2. Review long-running queries
3. Increase connection pool size (temporary)
4. Restart affected pods
5. Fix connection leak in code

**Runbook:** https://runbooks.yourdomain.com/db-connection-pool

---

## Warning Alerts

### HighLatency

**Trigger:** P95 latency >200ms for 5 minutes

**Impact:** Degraded user experience

**Response:**
1. Monitor trend - is it increasing?
2. Check database query performance
3. Review cache hit rate
4. Check for slow external APIs
5. Optimize if pattern identified

**Runbook:** https://runbooks.yourdomain.com/high-latency

### LowCacheHitRate

**Trigger:** Cache hit rate <70% for 10 minutes

**Impact:** Increased database load, slower responses

**Response:**
1. Check Redis memory usage
2. Review cache TTL settings
3. Verify cache warming on deployment
4. Check for cache key pattern changes
5. Adjust cache strategy if needed

**Runbook:** https://runbooks.yourdomain.com/low-cache-hit-rate

### DatabaseSlowQueries

**Trigger:** P95 query time >100ms for 10 minutes

**Impact:** Slower API responses

**Response:**
1. Check MongoDB profiler for slow queries
2. Review missing indexes
3. Analyze query patterns
4. Optimize queries or add indexes
5. Consider sharding if data volume issue

**Runbook:** https://runbooks.yourdomain.com/slow-queries

### HighMemoryUsage

**Trigger:** Memory usage >85% for 5 minutes

**Impact:** Risk of OOM kills

**Response:**
1. Check for memory leaks
2. Review cache sizes
3. Check for large object allocations
4. Increase memory limits if legitimate growth
5. Fix memory leak if identified

**Runbook:** https://runbooks.yourdomain.com/high-memory

### HighCPUUsage

**Trigger:** CPU usage >80% for 5 minutes

**Impact:** Slower request processing

**Response:**
1. Check for CPU-intensive operations
2. Profile application for hot spots
3. Review recent code changes
4. Scale up pods if sustained high load
5. Optimize CPU-intensive code

**Runbook:** https://runbooks.yourdomain.com/high-cpu

### LowThroughput

**Trigger:** Request rate <10,000 RPS for 10 minutes

**Impact:** Potential revenue loss

**Response:**
1. Check load balancer health
2. Verify DNS resolution
3. Check for DDoS protection blocking legitimate traffic
4. Review marketing campaigns (expected drop?)
5. Investigate if unexpected

**Runbook:** https://runbooks.yourdomain.com/low-traffic

### RedisMemoryHigh

**Trigger:** Redis memory usage >80%

**Impact:** Risk of evictions, cache misses

**Response:**
1. Review cache TTLs
2. Check for memory leaks
3. Analyze key distribution
4. Increase Redis memory limit
5. Implement cache eviction policy

**Runbook:** https://runbooks.yourdomain.com/redis-memory

---

## Alert Response Workflow

### 1. Acknowledge Alert

```bash
# Via PagerDuty mobile app or web
# Or via Slack: React with 👀 emoji
```

### 2. Assess Severity

- Check Grafana dashboards
- Review related metrics
- Determine user impact

### 3. Investigate

```bash
# Check pod status
kubectl get pods -n ecommerce-prod

# Check logs
kubectl logs -n ecommerce-prod -l app=<service> --tail=100 -f

# Check events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'

# Check metrics
# Open Grafana dashboard
```

### 4. Mitigate

- Apply immediate fix if known
- Scale resources if needed
- Rollback if deployment-related
- Restart pods if necessary

### 5. Resolve

- Verify metrics return to normal
- Confirm alert auto-resolves
- Update incident ticket

### 6. Post-Mortem

- Document root cause
- Identify preventive measures
- Update runbooks
- Share learnings with team

---

## Common Commands

### Kubernetes

```bash
# Get pod status
kubectl get pods -n ecommerce-prod

# Get pod logs
kubectl logs -n ecommerce-prod <pod-name> -f

# Get previous pod logs (for crashed pods)
kubectl logs -n ecommerce-prod <pod-name> --previous

# Describe pod
kubectl describe pod -n ecommerce-prod <pod-name>

# Get events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'

# Scale deployment
kubectl scale deployment <name> -n ecommerce-prod --replicas=<count>

# Restart deployment
kubectl rollout restart deployment <name> -n ecommerce-prod

# Check rollout status
kubectl rollout status deployment <name> -n ecommerce-prod
```

### Prometheus

```bash
# Query Prometheus
curl 'http://prometheus:9090/api/v1/query?query=<query>'

# Check alert status
curl 'http://prometheus:9090/api/v1/alerts'
```

### Logs

```bash
# Tail logs for all pods of a service
kubectl logs -n ecommerce-prod -l app=core-service -f --max-log-requests=10

# Search logs for errors
kubectl logs -n ecommerce-prod -l app=core-service | grep -i error

# Get logs from specific time
kubectl logs -n ecommerce-prod <pod-name> --since=1h
```

---

## Escalation Paths

### Level 1: On-Call Engineer
- Initial response
- Basic troubleshooting
- Apply known fixes

### Level 2: Senior Engineer
- Escalate after 30 minutes if unresolved
- Complex troubleshooting
- Code-level fixes

### Level 3: Tech Lead
- Escalate for critical incidents >1 hour
- Architecture decisions
- Cross-team coordination

### Level 4: Leadership
- SLA violations
- Major outages
- Business impact decisions

---

## Communication Templates

### Incident Start

```
🚨 INCIDENT: <Alert Name>

Status: Investigating
Impact: <User impact description>
Started: <Time>
On-Call: @<engineer>

Updates will be posted here.
```

### Incident Update

```
📊 UPDATE: <Alert Name>

Progress: <What's been done>
Current Status: <Current state>
Next Steps: <What's next>
ETA: <Estimated resolution time>
```

### Incident Resolution

```
✅ RESOLVED: <Alert Name>

Duration: <Total time>
Root Cause: <Brief description>
Fix Applied: <What was done>
Follow-up: <Post-mortem ticket link>
```

---

## Best Practices

1. **Acknowledge Quickly:**
   - Acknowledge within 5 minutes
   - Even if still investigating

2. **Communicate Often:**
   - Update every 15-30 minutes
   - Keep stakeholders informed

3. **Document Everything:**
   - Commands run
   - Changes made
   - Observations noted

4. **Don't Panic:**
   - Follow runbooks
   - Ask for help if needed
   - Take breaks for long incidents

5. **Learn and Improve:**
   - Write post-mortems
   - Update runbooks
   - Share knowledge

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
