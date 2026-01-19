# Hands-On Lab 2: Incident Response Simulation

## Objective
Practice incident response by simulating and resolving a high error rate incident.

## Scenario
The error rate has spiked to 5% due to a database connection pool exhaustion.

## Prerequisites
- kubectl access to staging cluster
- Grafana access
- Slack access

## Estimated Time
60 minutes

---

## Phase 1: Detection (5 min)

### 1. Receive alert
- PagerDuty alert (simulated)
- Slack notification in #alerts

### 2. Acknowledge alert
```bash
# Via PagerDuty app or web
```

### 3. Create incident channel
```bash
# Slack: /incident create "High error rate - investigating"
```

### 4. Check Grafana dashboard
- Open Production Overview dashboard
- Verify error rate spike
- Note affected services

---

## Phase 2: Investigation (15 min)

### 1. Check recent deployments
```bash
kubectl rollout history deployment/core-service -n ecommerce-staging
```

### 2. Analyze error logs
```bash
kubectl logs -n ecommerce-staging deployment/core-service \
  --tail=1000 | grep -i "error\|exception"
```

### 3. Identify error pattern
```bash
kubectl logs -n ecommerce-staging deployment/core-service \
  --tail=5000 | grep ERROR | sort | uniq -c | sort -nr
```

### 4. Check database connectivity
```bash
kubectl exec -n ecommerce-staging deployment/core-service -- \
  curl -f mongodb://mongos:27017
```

### 5. Check connection pool status
```bash
kubectl exec -n ecommerce-staging mongodb-0 -- \
  mongo --eval "db.serverStatus().connections"
```

---

## Phase 3: Mitigation (20 min)

### 1. Restart affected pods
```bash
kubectl rollout restart deployment/core-service -n ecommerce-staging
```

### 2. Monitor recovery
```bash
watch kubectl get pods -n ecommerce-staging
```

### 3. Verify error rate decreased
- Check Grafana dashboard
- Verify error rate < 0.1%

### 4. Update incident channel
```
✅ Issue resolved. Restarted pods to reset connection pool.
Error rate back to normal (0.05%).
Root cause: Connection pool exhaustion.
```

---

## Phase 4: Post-Incident (20 min)

### 1. Document timeline
```markdown
## Incident Timeline
- 14:00 UTC: Error rate spike detected (5%)
- 14:02 UTC: Incident acknowledged, investigation started
- 14:05 UTC: Identified connection pool exhaustion in logs
- 14:10 UTC: Restarted pods to reset connections
- 14:15 UTC: Error rate normalized (0.05%)
- 14:20 UTC: Incident resolved
```

### 2. Identify root cause
- Connection pool size too small
- No connection timeout configured
- Connection leak in code

### 3. Create action items
- [ ] Increase connection pool size
- [ ] Add connection timeout
- [ ] Fix connection leak in code
- [ ] Add connection pool monitoring
- [ ] Update runbook

### 4. Write post-mortem
- Use post-mortem template
- Include timeline, root cause, action items
- Share with team

---

## Expected Outcomes
- [ ] Incident detected and acknowledged within 5 min
- [ ] Root cause identified within 15 min
- [ ] Issue resolved within 30 min
- [ ] Post-mortem documented
- [ ] Action items created

---

## Evaluation Criteria
- **Speed:** Time to resolution
- **Communication:** Clear updates in incident channel
- **Investigation:** Systematic approach
- **Documentation:** Complete post-mortem
- **Prevention:** Actionable items to prevent recurrence

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
