# Staged Production Rollout Guide

## Overview

This guide explains how to execute a staged production rollout using blue-green deployment with progressive traffic shifting to minimize risk and ensure zero-downtime deployment.

---

## Prerequisites

Before starting a production rollout:

1. ✅ **Pre-Production Validation Passed** - Task 1 completed with GO decision
2. ✅ **Backups Verified** - Recent backups available and tested
3. ✅ **Monitoring Operational** - Prometheus and Grafana running
4. ✅ **Team Ready** - On-call team available
5. ✅ **Rollback Plan** - Rollback procedures tested

---

## Rollout Strategy

### Blue-Green Deployment

- **Blue:** Current stable version (v1.0.0)
- **Green:** New version (v2.0.0)
- **Strategy:** Deploy green, test, shift traffic progressively

### Traffic Shifting Stages

| Stage | Traffic to Green | Duration | Validation |
|-------|-----------------|----------|------------|
| 1 | 5% | 10 min | Health, Errors, Latency |
| 2 | 10% | 10 min | Health, Errors, Latency |
| 3 | 25% | 15 min | Health, Errors, Latency, Business |
| 4 | 50% | 20 min | Health, Errors, Latency, Business |
| 5 | 100% | 30 min | Health, Errors, Latency, Business |

**Total Rollout Time:** ~85 minutes

---

## Pre-Rollout Checklist

### 1. Validation
- [ ] Pre-production validation passed (GO decision)
- [ ] Security audit completed (no critical issues)
- [ ] Performance benchmarks passed
- [ ] Load tests passed

### 2. Infrastructure
- [ ] Kubernetes cluster healthy
- [ ] MongoDB sharding operational
- [ ] Redis cluster operational
- [ ] Monitoring systems running

### 3. Backups
- [ ] Database backup completed (< 24 hours old)
- [ ] Backup restoration tested
- [ ] Backup location verified

### 4. Team Readiness
- [ ] On-call team notified
- [ ] Stakeholders informed
- [ ] Communication channels ready (Slack)
- [ ] Rollback team standing by

### 5. Deployment Artifacts
- [ ] Docker images built and pushed
- [ ] Kubernetes manifests updated
- [ ] Configuration verified
- [ ] Secrets updated (if needed)

---

## Rollout Procedure

### Step 1: Deploy Green Version

```bash
# Deploy green deployment
kubectl apply -f k8s/deployments/blue-green/core-service-green.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
    -l app=core-service,version=green \
    -n ecommerce-prod \
    --timeout=300s
```

### Step 2: Run Smoke Tests

```bash
# Get green pod name
GREEN_POD=$(kubectl get pod -n ecommerce-prod \
    -l app=core-service,version=green \
    -o jsonpath='{.items[0].metadata.name}')

# Test health endpoint
kubectl exec -n ecommerce-prod $GREEN_POD -- \
    curl -f http://localhost:3000/health

# Test readiness endpoint
kubectl exec -n ecommerce-prod $GREEN_POD -- \
    curl -f http://localhost:3000/ready
```

### Step 3: Execute Staged Rollout

```bash
# Run automated staged rollout
bash scripts/deployment/staged-rollout.sh core-service v2.0.0
```

**What happens:**
1. Pre-rollout checks
2. Green deployment verification
3. Smoke tests
4. Progressive traffic shifting (5% → 10% → 25% → 50% → 100%)
5. Health monitoring at each stage
6. Automatic rollback if issues detected
7. Cleanup of blue deployment

### Step 4: Monitor Rollout

**Watch pod status:**
```bash
watch kubectl get pods -n ecommerce-prod -l app=core-service
```

**Monitor metrics:**
```bash
# Open Grafana dashboard
open http://grafana.yourdomain.com/d/production

# Watch logs
kubectl logs -f -n ecommerce-prod -l app=core-service,version=green
```

**Key metrics to watch:**
- Error rate (<0.5%)
- P95 latency (<300ms)
- Pod health (all running)
- Request rate (stable)

### Step 5: Verify Completion

```bash
# Check service selector
kubectl get service core-service -n ecommerce-prod -o yaml | grep version

# Verify traffic distribution
kubectl get pods -n ecommerce-prod -l app=core-service

# Check metrics
curl http://prometheus:9090/api/v1/query?query=http_requests_total
```

---

## Rollback Procedure

### Automatic Rollback

The staged rollout script automatically rolls back if:
- Error rate > 0.5%
- P95 latency > 300ms
- Unhealthy pods detected

### Manual Rollback

If you need to manually rollback:

```bash
# Execute emergency rollback
bash scripts/deployment/rollback.sh core-service
```

**What happens:**
1. Immediately shifts 100% traffic to blue
2. Scales green deployment to 0
3. Verifies blue deployment health

**Rollback time:** < 5 minutes

---

## Post-Rollout Tasks

### If Successful ✅

1. **Verify Metrics**
   - Check error rates
   - Verify latency
   - Monitor for 24 hours

2. **Cleanup**
   - Delete blue deployment (after 24 hours)
   - Update documentation
   - Notify stakeholders

3. **Documentation**
   - Update version in docs
   - Document any issues
   - Update runbooks if needed

### If Failed ❌

1. **Investigate**
   - Review logs
   - Check metrics
   - Identify root cause

2. **Fix Issues**
   - Address problems
   - Re-run validation
   - Update deployment

3. **Retry**
   - Schedule new rollout
   - Notify stakeholders
   - Execute with fixes

---

## Troubleshooting

### Issue: Pods Not Ready

**Symptoms:**
- Pods stuck in `Pending` or `CrashLoopBackOff`

**Solutions:**
```bash
# Check pod status
kubectl describe pod <pod-name> -n ecommerce-prod

# Check logs
kubectl logs <pod-name> -n ecommerce-prod

# Check events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'
```

### Issue: High Error Rate

**Symptoms:**
- Error rate > 0.5%
- 5xx responses increasing

**Solutions:**
1. Check application logs
2. Verify database connectivity
3. Check Redis connectivity
4. Review recent code changes
5. Rollback if necessary

### Issue: High Latency

**Symptoms:**
- P95 latency > 300ms
- Slow response times

**Solutions:**
1. Check database performance
2. Verify cache hit rate
3. Check resource utilization
4. Review slow queries
5. Scale up if needed

### Issue: Traffic Not Shifting

**Symptoms:**
- Traffic still going to blue
- Service selector not updating

**Solutions:**
```bash
# Manually update service
kubectl patch service core-service -n ecommerce-prod --type=json -p='[
    {
        "op": "replace",
        "path": "/spec/selector/version",
        "value": "green"
    }
]'
```

---

## Best Practices

1. **Always Test in Staging First**
   - Run full rollout in staging
   - Test rollback procedures
   - Verify monitoring

2. **Monitor Continuously**
   - Watch metrics during rollout
   - Have team ready to rollback
   - Use automated alerts

3. **Communicate**
   - Notify stakeholders before rollout
   - Update during rollout
   - Confirm completion

4. **Document Everything**
   - Record rollout details
   - Document issues
   - Update runbooks

5. **Plan for Rollback**
   - Test rollback before rollout
   - Have team ready
   - Know the procedure

---

## Quick Reference

### Deploy Green
```bash
kubectl apply -f k8s/deployments/blue-green/core-service-green.yaml
```

### Run Staged Rollout
```bash
bash scripts/deployment/staged-rollout.sh core-service v2.0.0
```

### Emergency Rollback
```bash
bash scripts/deployment/rollback.sh core-service
```

### Check Status
```bash
kubectl get pods -n ecommerce-prod -l app=core-service
kubectl get service core-service -n ecommerce-prod
```

### View Logs
```bash
kubectl logs -f -n ecommerce-prod -l app=core-service,version=green
```

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
