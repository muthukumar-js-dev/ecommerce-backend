# FinOps Guide: Cost Optimization & Resource Management

## Overview

This guide provides comprehensive strategies for optimizing cloud infrastructure costs while maintaining performance and reliability.

---

## Cost Optimization Strategies

### 1. Resource Right-Sizing

**Objective:** Match resource allocations to actual usage

**Process:**
1. Analyze 7-day resource utilization
2. Identify over-provisioned pods (CPU/Memory <50% utilized)
3. Calculate potential savings
4. Apply right-sizing recommendations

**Commands:**
```bash
# Analyze resources
npm run cost:analyze

# Apply recommendations (dry-run)
bash scripts/cost-optimization/apply-rightsizing.sh ecommerce-prod true

# Apply recommendations (production)
bash scripts/cost-optimization/apply-rightsizing.sh ecommerce-prod false
```

**Expected Savings:** 15-25% of compute costs

---

### 2. Intelligent Auto-Scaling

**Objective:** Scale resources based on demand

**HPA Configuration:**
- **CPU Target:** 70% (balance cost/performance)
- **Memory Target:** 75%
- **Scale Down:** Conservative (5 min stabilization)
- **Scale Up:** Aggressive (immediate)

**Cluster Autoscaler:**
- **Spot Instance Priority:** Highest (70-90% savings)
- **Scale Down Threshold:** 50% utilization
- **Scale Down Delay:** 10 minutes

**Commands:**
```bash
# Deploy cost-aware HPA
kubectl apply -f k8s/autoscaling/cost-aware-hpa.yaml

# Deploy cluster autoscaler
kubectl apply -f k8s/autoscaling/cluster-autoscaler-config.yaml

# Monitor auto-scaling
kubectl get hpa -n ecommerce-prod -w
```

**Expected Savings:** 20-30% of compute costs

---

### 3. Spot Instance Usage

**Objective:** Use spot instances for cost-tolerant workloads

**Strategy:**
- **Target:** >50% of nodes on spot instances
- **Workloads:** Stateless services, batch jobs
- **Fallback:** On-demand instances for critical services

**Implementation:**
```yaml
# Node group with spot instances
nodeSelector:
  node.kubernetes.io/lifecycle: spot

# Toleration for spot interruptions
tolerations:
  - key: "spot"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
```

**Expected Savings:** 70-90% on spot-eligible workloads

---

### 4. Resource Cleanup

**Objective:** Eliminate unused resources

**Automated Cleanup:**
- **Container Images:** Delete images >30 days old
- **EBS Volumes:** Delete unused volumes >7 days old
- **Backups:** Retention policy (7 daily, 4 weekly, 12 monthly)
- **Load Balancers:** Identify unused LBs
- **Logs:** 90-day retention

**Schedule:** Weekly (Sunday 2 AM)

**Commands:**
```bash
# Manual cleanup (dry-run)
npm run cost:cleanup

# View cleanup CronJob
kubectl get cronjob resource-cleanup -n ecommerce-prod

# Check cleanup logs
kubectl logs -n ecommerce-prod -l app=resource-cleanup
```

**Expected Savings:** 5-10% of total costs

---

### 5. Cost Monitoring

**Objective:** Track and analyze costs

**Monthly Cost Report:**
- Total cost
- Breakdown (compute, storage, network, database)
- Trends (vs last month, last week)
- Recommendations

**Commands:**
```bash
# Generate cost report
npm run cost:report

# View cost alerts
kubectl get prometheusrules cost-alerts -n monitoring
```

**Alerts:**
- High monthly cost (>$5000)
- Cost spike (>20% increase in 24h)
- High resource waste (>40% unused)
- Low spot instance usage (<30%)

---

## Best Practices

### 1. Right-Sizing

✅ **Do:**
- Analyze usage over 7+ days
- Add 20% buffer to recommendations
- Test in staging first
- Monitor after changes

❌ **Don't:**
- Right-size based on peak usage only
- Remove all buffer
- Apply to all pods at once
- Ignore application requirements

### 2. Auto-Scaling

✅ **Do:**
- Set conservative scale-down policies
- Use multiple metrics (CPU, memory, custom)
- Test scaling behavior under load
- Monitor scaling events

❌ **Don't:**
- Set min replicas too low
- Scale down too aggressively
- Ignore stabilization windows
- Use only CPU-based scaling

### 3. Spot Instances

✅ **Do:**
- Use for stateless workloads
- Implement graceful shutdown
- Have on-demand fallback
- Monitor spot interruptions

❌ **Don't:**
- Use for stateful services
- Use for critical services
- Ignore interruption handling
- Rely 100% on spot

### 4. Resource Cleanup

✅ **Do:**
- Test cleanup in staging
- Review cleanup logs
- Maintain backup retention
- Document cleanup policies

❌ **Don't:**
- Delete without verification
- Skip backup verification
- Cleanup production manually
- Ignore cleanup failures

### 5. Cost Monitoring

✅ **Do:**
- Review reports monthly
- Act on recommendations
- Set budget alerts
- Track cost trends

❌ **Don't:**
- Ignore cost spikes
- Skip monthly reviews
- Disable cost alerts
- Optimize without monitoring

---

## Cost Optimization Checklist

### Monthly Tasks
- [ ] Review cost report
- [ ] Analyze resource utilization
- [ ] Apply right-sizing recommendations
- [ ] Review spot instance usage
- [ ] Check for unused resources
- [ ] Update cost forecasts

### Quarterly Tasks
- [ ] Review auto-scaling policies
- [ ] Optimize backup retention
- [ ] Review data transfer costs
- [ ] Evaluate reserved instances
- [ ] Update cost optimization goals

### Annual Tasks
- [ ] Comprehensive cost audit
- [ ] Review cloud architecture
- [ ] Evaluate multi-cloud options
- [ ] Update FinOps strategy
- [ ] Train team on cost optimization

---

## Troubleshooting

### Issue: High Costs Despite Optimization

**Possible Causes:**
- Increased traffic/usage
- New services deployed
- Data transfer costs
- Inefficient queries

**Solutions:**
1. Review cost breakdown
2. Identify cost drivers
3. Analyze usage patterns
4. Optimize specific areas

### Issue: Pods Crashing After Right-Sizing

**Possible Causes:**
- Insufficient resources
- Memory leaks
- Traffic spikes

**Solutions:**
1. Rollback changes
2. Increase buffer (30-40%)
3. Fix memory leaks
4. Adjust auto-scaling

### Issue: Frequent Spot Interruptions

**Possible Causes:**
- High spot demand
- Wrong instance types
- No fallback configured

**Solutions:**
1. Use multiple instance types
2. Configure on-demand fallback
3. Implement graceful shutdown
4. Monitor interruption rates

---

## Cost Optimization Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Monthly cost reduction | 20-30% | ___ | ___ |
| Resource utilization | >70% | ___ | ___ |
| Unused resources | <5% | ___ | ___ |
| Spot instance usage | >50% | ___ | ___ |
| Cost visibility | 100% | ___ | ___ |

---

## Quick Reference

### Commands

```bash
# Resource analysis
npm run cost:analyze

# Apply right-sizing
bash scripts/cost-optimization/apply-rightsizing.sh ecommerce-prod false

# Resource cleanup
npm run cost:cleanup

# Cost report
npm run cost:report

# View HPA
kubectl get hpa -n ecommerce-prod

# View cluster autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler
```

### Files

- Resource Analyzer: `scripts/cost-optimization/resource-analyzer.ts`
- Apply Right-Sizing: `scripts/cost-optimization/apply-rightsizing.sh`
- Resource Cleanup: `scripts/cost-optimization/resource-cleanup.ts`
- Cost Monitor: `scripts/cost-optimization/cost-monitor.ts`
- Cost-Aware HPA: `k8s/autoscaling/cost-aware-hpa.yaml`
- Cluster Autoscaler: `k8s/autoscaling/cluster-autoscaler-config.yaml`
- Cleanup CronJob: `k8s/jobs/resource-cleanup-cronjob.yaml`
- Cost Alerts: `k8s/monitoring/cost-alerts.yaml`

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
