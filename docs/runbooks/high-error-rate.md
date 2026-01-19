# Runbook: High Error Rate

## Metadata
- **Severity:** P1 - High
- **Response Time:** 15 minutes
- **Owner:** Backend Team
- **Last Updated:** 2026-01-08

---

## Symptoms
- Error rate > 0.5% for 5+ minutes
- PagerDuty alert: "High Error Rate Detected"
- Users reporting 500 errors
- Grafana dashboard showing error spike

---

## Prerequisites
- kubectl access to production cluster
- Grafana/Prometheus access
- PagerDuty access
- Slack access (#incidents channel)

---

## Investigation Steps

### 1. Acknowledge and Communicate (0-2 minutes)

```bash
# Acknowledge PagerDuty alert
# Via mobile app or web

# Create incident channel
# Slack: /incident create "High error rate - investigating"

# Post initial status
# "🚨 High error rate detected. Investigating. ETA: 15 min"
```

### 2. Check Recent Deployments (2-5 minutes)

```bash
# Check recent deployments
kubectl rollout history deployment/core-service -n ecommerce-prod

# Check deployment status
kubectl get deployments -n ecommerce-prod

# Check pod status
kubectl get pods -n ecommerce-prod | grep -v Running
```

**If recent deployment found:**
```bash
# Rollback deployment
kubectl rollout undo deployment/core-service -n ecommerce-prod

# Monitor error rate
# Check Grafana dashboard
```

### 3. Check Application Logs (5-10 minutes)

```bash
# View recent errors
kubectl logs -n ecommerce-prod -l app=core-service --tail=100 | grep ERROR

# Check specific pod
kubectl logs -n ecommerce-prod <pod-name> --tail=200

# Search in Kibana
# Query: level:error AND @timestamp:[now-15m TO now]
```

**Common Error Patterns:**
- Database connection errors → Check database
- External API failures → Check third-party services
- Memory errors → Check resource usage

### 4. Check Infrastructure (10-15 minutes)

```bash
# Check pod resource usage
kubectl top pods -n ecommerce-prod

# Check node status
kubectl get nodes

# Check database connectivity
kubectl exec -n ecommerce-prod <pod-name> -- nc -zv mongodb 27017

# Check Redis connectivity
kubectl exec -n ecommerce-prod <pod-name> -- nc -zv redis 6379
```

---

## Resolution Actions

### If Deployment Issue
```bash
# Rollback to previous version
kubectl rollout undo deployment/core-service -n ecommerce-prod

# Verify rollback
kubectl rollout status deployment/core-service -n ecommerce-prod

# Monitor error rate (should decrease within 2 minutes)
```

### If Database Issue
```bash
# Check MongoDB status
kubectl get pods -n database

# Check MongoDB logs
kubectl logs -n database mongodb-0

# If database down, restart
kubectl delete pod -n database mongodb-0
```

### If Resource Issue
```bash
# Scale up pods
kubectl scale deployment/core-service --replicas=10 -n ecommerce-prod

# Increase resource limits (if OOM)
kubectl set resources deployment/core-service -n ecommerce-prod \
  --limits=memory=2Gi,cpu=1000m
```

### If External Service Issue
```bash
# Enable circuit breaker
# Update configuration to fail fast

# Switch to fallback service
# Update environment variables
```

---

## Post-Incident

### 1. Verify Resolution
- Error rate < 0.1%
- No new errors in logs
- User reports resolved

### 2. Update Incident
```bash
# Slack update
# "✅ Resolved. Root cause: [description]. Action taken: [action]"

# Resolve PagerDuty incident
```

### 3. Create Post-Mortem
- Document timeline
- Identify root cause
- List action items
- Schedule review meeting

---

## Escalation

**If not resolved in 15 minutes:**
1. Escalate to Senior Engineer
2. Page on-call manager
3. Consider full rollback

**Emergency Contacts:**
- Backend Lead: @backend-lead
- DevOps Lead: @devops-lead
- CTO: @cto

---

## Prevention

- Implement canary deployments
- Add more comprehensive tests
- Improve monitoring alerts
- Regular load testing

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
