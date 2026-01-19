# HPA Scaling Policies Guide

## Overview

This guide explains the scaling policies configured for each service and how to optimize them based on your workload patterns.

## Scaling Policy Components

### Stabilization Windows

**Purpose:** Prevent rapid scaling oscillations (flapping)

**Scale-Up Stabilization:**
- **Core Service:** 0 seconds (immediate)
- **Payment Service:** 30 seconds
- **Notification Service:** 0 seconds

**Scale-Down Stabilization:**
- **Core Service:** 300 seconds (5 minutes)
- **Payment Service:** 600 seconds (10 minutes)
- **Notification Service:** 300 seconds (5 minutes)

**Why Different?**
- Payment service has longer stabilization to avoid disrupting transactions
- Notification service scales up immediately for bursts
- Core service balances responsiveness with stability

### Scaling Policies

#### Scale-Up Policies

**Core Service:**
```yaml
policies:
  - type: Percent
    value: 100        # Double pods
    periodSeconds: 15
  - type: Pods
    value: 4          # Add 4 pods
    periodSeconds: 15
selectPolicy: Max     # Use whichever scales more
```

**Payment Service:**
```yaml
policies:
  - type: Percent
    value: 50         # Add 50% more pods
    periodSeconds: 30
  - type: Pods
    value: 2          # Add 2 pods
    periodSeconds: 30
selectPolicy: Max
```

**Notification Service:**
```yaml
policies:
  - type: Percent
    value: 100        # Double pods
    periodSeconds: 15
  - type: Pods
    value: 5          # Add 5 pods
    periodSeconds: 15
selectPolicy: Max
```

#### Scale-Down Policies

**Core Service:**
```yaml
policies:
  - type: Percent
    value: 50         # Remove up to 50%
    periodSeconds: 60
  - type: Pods
    value: 2          # Remove up to 2 pods
    periodSeconds: 60
selectPolicy: Min     # Use whichever scales less
```

**Payment Service:**
```yaml
policies:
  - type: Percent
    value: 25         # Remove up to 25%
    periodSeconds: 60
  - type: Pods
    value: 1          # Remove up to 1 pod
    periodSeconds: 60
selectPolicy: Min
```

**Notification Service:**
```yaml
policies:
  - type: Percent
    value: 50         # Remove up to 50%
    periodSeconds: 60
  - type: Pods
    value: 3          # Remove up to 3 pods
    periodSeconds: 60
selectPolicy: Min
```

## Metric Targets

### CPU Utilization

| Service | Target | Rationale |
|---------|--------|-----------|
| Core | 70% | Balanced for general workload |
| Payment | 60% | Conservative for critical transactions |
| Notification | 70% | Standard for async processing |

### Memory Utilization

| Service | Target | Rationale |
|---------|--------|-----------|
| Core | 80% | Higher threshold for memory |
| Payment | 75% | Conservative to prevent OOM |
| Notification | 80% | Standard threshold |

### Custom Metrics

**HTTP Requests per Second:**
- Target: 1000 req/sec per pod
- Scales when average exceeds target

**HTTP Request Duration (P95):**
- Target: 200ms
- Scales when P95 latency exceeds target

**Kafka Consumer Lag:**
- Target: 100 messages
- Scales when lag exceeds target

## Optimization Guidelines

### When to Adjust Scale-Up

**Increase scale-up speed if:**
- Frequent traffic spikes
- Response time degradation during peaks
- Error rate increases during load

**Decrease scale-up speed if:**
- Over-provisioning (too many idle pods)
- Cost concerns
- Stable traffic patterns

### When to Adjust Scale-Down

**Increase scale-down speed if:**
- High idle capacity
- Cost optimization priority
- Predictable traffic patterns

**Decrease scale-down speed if:**
- Frequent oscillations
- Traffic unpredictability
- Cold start penalties

### Tuning Stabilization Windows

**Increase stabilization if:**
- Seeing rapid scaling up/down cycles
- Metrics are noisy
- Want more conservative scaling

**Decrease stabilization if:**
- Slow to respond to load changes
- Missing scaling opportunities
- Metrics are stable

## Common Scenarios

### Scenario 1: Flash Sale

**Problem:** Sudden 10x traffic spike

**Solution:**
- Aggressive scale-up (100% increase)
- Immediate stabilization (0s)
- Conservative scale-down (5-10 min)

**Example:** Notification service configuration

### Scenario 2: Gradual Daily Pattern

**Problem:** Predictable morning ramp-up

**Solution:**
- Moderate scale-up (50% increase)
- Longer stabilization (30s)
- Gradual scale-down (10 min)

**Example:** Payment service configuration

### Scenario 3: Batch Processing

**Problem:** Periodic batch jobs

**Solution:**
- Fast scale-up for job start
- Long stabilization for scale-down
- Consider scheduled scaling

### Scenario 4: Cost Optimization

**Problem:** Over-provisioned during off-hours

**Solution:**
- Reduce min replicas
- Faster scale-down
- Scheduled scaling for known patterns

## Monitoring Scaling Behavior

### Key Metrics to Watch

```bash
# Current HPA status
kubectl get hpa -n ecommerce-prod

# Detailed HPA info
kubectl describe hpa core-service-hpa -n ecommerce-prod

# Scaling events
kubectl get events -n ecommerce-prod --field-selector involvedObject.kind=HorizontalPodAutoscaler

# Pod count over time
kubectl get pods -n ecommerce-prod -l app=core-service --watch
```

### Grafana Queries

**Replica Count:**
```promql
hpa_current_replicas{deployment="core-service"}
hpa_desired_replicas{deployment="core-service"}
```

**Scaling Events:**
```promql
rate(hpa_scaling_events_total{deployment="core-service"}[5m])
```

**CPU Utilization vs Target:**
```promql
hpa_cpu_utilization_percent{deployment="core-service"}
```

## Best Practices

1. **Start Conservative:** Begin with longer stabilization windows
2. **Monitor First:** Observe for 1-2 weeks before tuning
3. **Test Changes:** Use load tests to validate policy changes
4. **Document Decisions:** Record why policies were changed
5. **Review Regularly:** Quarterly review of scaling behavior
6. **Consider Costs:** Balance performance with infrastructure costs
7. **Use VPA:** Combine with VPA for resource right-sizing
8. **Set Alerts:** Alert on excessive scaling events
9. **Capacity Planning:** Ensure cluster can handle max replicas
10. **Gradual Changes:** Adjust one parameter at a time

## Troubleshooting

### HPA Not Scaling Up

**Check:**
1. Are metrics available? `kubectl top pods`
2. Is CPU/memory above target?
3. Are we at max replicas?
4. Check HPA events for errors

### HPA Scaling Too Aggressively

**Solutions:**
1. Increase stabilization window
2. Reduce scale-up percentage
3. Increase metric target threshold

### HPA Flapping (Up/Down Cycles)

**Solutions:**
1. Increase scale-down stabilization
2. Widen gap between scale-up and scale-down thresholds
3. Use longer metric averaging periods

### HPA Not Scaling Down

**Check:**
1. Stabilization window not elapsed?
2. Metrics still above target?
3. At min replicas already?
4. Check scale-down policies

## Example: Tuning for Your Workload

### Step 1: Baseline
```bash
# Deploy with default policies
kubectl apply -f k8s/autoscaling/core-service-hpa.yaml
```

### Step 2: Monitor
```bash
# Watch for 1 week
kubectl get hpa core-service-hpa -n ecommerce-prod --watch
```

### Step 3: Analyze
- Count scaling events
- Measure response time during scaling
- Check for flapping
- Review cost impact

### Step 4: Adjust
```yaml
# Example: Reduce flapping
behavior:
  scaleDown:
    stabilizationWindowSeconds: 600  # Increased from 300
```

### Step 5: Validate
```bash
# Run load test
artillery run load-tests/hpa-load-test.yml

# Monitor scaling
watch kubectl get hpa,pods -n ecommerce-prod
```

## Additional Resources

- [HPA Algorithm](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#algorithm-details)
- [HPA Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
- [Scaling Policies](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior)
