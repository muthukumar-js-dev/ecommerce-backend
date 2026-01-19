# Horizontal Pod Autoscaling Setup Guide

## Overview

This guide covers the setup and configuration of Horizontal Pod Autoscaler (HPA) for the e-commerce backend services, including CPU/memory-based scaling, custom metrics, and monitoring.

## Prerequisites

- Kubernetes cluster running
- kubectl configured
- Metrics Server installed
- Prometheus (for custom metrics)
- Prometheus Adapter (for custom metrics)

## Quick Start

### 1. Install Metrics Server

```bash
# Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify installation
kubectl get deployment metrics-server -n kube-system

# Check if metrics are available
kubectl top nodes
kubectl top pods -n ecommerce-prod
```

### 2. Deploy HPAs

```bash
# Deploy all HPA configurations
kubectl apply -f k8s/autoscaling/

# Verify HPAs are created
kubectl get hpa -n ecommerce-prod

# Check HPA status
kubectl describe hpa core-service-hpa -n ecommerce-prod
```

### 3. Verify Scaling

```bash
# Watch HPA in real-time
watch -n 2 kubectl get hpa -n ecommerce-prod

# Watch pods scaling
watch -n 2 kubectl get pods -n ecommerce-prod

# Check resource usage
kubectl top pods -n ecommerce-prod
```

## HPA Configurations

### Core Service HPA

**File:** [`k8s/autoscaling/core-service-hpa.yaml`](file:///D:/github/ecommerce-backend/k8s/autoscaling/core-service-hpa.yaml)

**Configuration:**
- Min replicas: 3
- Max replicas: 20
- CPU target: 70%
- Memory target: 80%

**Scaling Behavior:**
- **Scale Up:** Aggressive (100% or 4 pods per 15 seconds)
- **Scale Down:** Conservative (50% or 2 pods per minute, 5-minute stabilization)

```bash
kubectl apply -f k8s/autoscaling/core-service-hpa.yaml
```

### Payment Service HPA

**File:** [`k8s/autoscaling/payment-service-hpa.yaml`](file:///D:/github/ecommerce-backend/k8s/autoscaling/payment-service-hpa.yaml)

**Configuration:**
- Min replicas: 2
- Max replicas: 10
- CPU target: 60% (more conservative)
- Memory target: 75%

**Scaling Behavior:**
- **Scale Up:** Moderate (50% or 2 pods per 30 seconds)
- **Scale Down:** Very conservative (25% or 1 pod per minute, 10-minute stabilization)

```bash
kubectl apply -f k8s/autoscaling/payment-service-hpa.yaml
```

### Notification Service HPA

**File:** [`k8s/autoscaling/notification-service-hpa.yaml`](file:///D:/github/ecommerce-backend/k8s/autoscaling/notification-service-hpa.yaml)

**Configuration:**
- Min replicas: 2
- Max replicas: 15
- CPU target: 70%
- Memory target: 80%

**Scaling Behavior:**
- **Scale Up:** Very aggressive (100% or 5 pods per 15 seconds)
- **Scale Down:** Conservative (50% or 3 pods per minute, 5-minute stabilization)

```bash
kubectl apply -f k8s/autoscaling/notification-service-hpa.yaml
```

## Custom Metrics (Advanced)

### Install Prometheus Adapter

```bash
# Add Prometheus Community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Adapter
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-server.monitoring.svc \
  --set prometheus.port=80

# Verify installation
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-adapter
```

### Configure Custom Metrics

```bash
# Apply custom metrics configuration
kubectl apply -f k8s/monitoring/prometheus-adapter-config.yaml

# Verify custom metrics are available
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq .
```

### Deploy HPA with Custom Metrics

```bash
# Deploy HPA with custom metrics
kubectl apply -f k8s/autoscaling/core-service-hpa-custom.yaml

# Check custom metrics
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/ecommerce-prod/pods/*/http_requests_per_second" | jq .
```

## Scaling Policies

### Scale-Up Policies

| Service | Max Increase | Period | Stabilization |
|---------|--------------|--------|---------------|
| Core | 100% or 4 pods | 15s | 0s (immediate) |
| Payment | 50% or 2 pods | 30s | 30s |
| Notification | 100% or 5 pods | 15s | 0s (immediate) |

### Scale-Down Policies

| Service | Max Decrease | Period | Stabilization |
|---------|--------------|--------|---------------|
| Core | 50% or 2 pods | 60s | 300s (5 min) |
| Payment | 25% or 1 pod | 60s | 600s (10 min) |
| Notification | 50% or 3 pods | 60s | 300s (5 min) |

## Resource Limits

### Core Service

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

### Payment Service

```yaml
resources:
  requests:
    cpu: 300m
    memory: 384Mi
  limits:
    cpu: 600m
    memory: 768Mi
```

### Notification Service

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

## Monitoring

### HPA Metrics

```typescript
import { getHPAMetrics } from '@infrastructure/monitoring/hpa-metrics';

const hpaMetrics = getHPAMetrics();

// Update metrics
hpaMetrics.updateMetrics('core-service', 'ecommerce-prod', {
  currentReplicas: 5,
  desiredReplicas: 8,
  cpuUtilization: 75,
  memoryUtilization: 65,
});

// Record scaling event
hpaMetrics.recordScalingEvent('core-service', 'ecommerce-prod', 'up');
```

### Check HPA Status

```bash
# Get HPA status
kubectl get hpa -n ecommerce-prod

# Detailed HPA information
kubectl describe hpa core-service-hpa -n ecommerce-prod

# HPA events
kubectl get events -n ecommerce-prod --field-selector involvedObject.kind=HorizontalPodAutoscaler

# Current metrics
kubectl get hpa core-service-hpa -n ecommerce-prod -o yaml
```

## Load Testing

### Run Load Test

```bash
# Install Artillery (if not installed)
npm install -g artillery

# Run HPA load test
artillery run load-tests/hpa-load-test.yml

# Watch scaling during test
watch -n 2 kubectl get hpa,pods -n ecommerce-prod
```

### Test Phases

1. **Baseline (60s):** 10 req/sec - Establish normal load
2. **Ramp Up (300s):** 100 → 1000 req/sec - Trigger scale-up
3. **Sustained (300s):** 1000 req/sec - Verify scaled state
4. **Spike (60s):** 2000 req/sec - Test rapid scaling
5. **Ramp Down (180s):** 2000 → 10 req/sec - Trigger scale-down
6. **Cool Down (120s):** 10 req/sec - Verify scale-down

## Troubleshooting

### HPA Not Scaling

```bash
# Check if Metrics Server is running
kubectl get deployment metrics-server -n kube-system

# Check if metrics are available
kubectl top pods -n ecommerce-prod

# Check HPA conditions
kubectl describe hpa core-service-hpa -n ecommerce-prod

# Check HPA events
kubectl get events -n ecommerce-prod | grep HorizontalPodAutoscaler
```

### Metrics Not Available

```bash
# Check Metrics Server logs
kubectl logs -n kube-system deployment/metrics-server

# Verify pod resource requests are set
kubectl get deployment core-service -n ecommerce-prod -o yaml | grep -A 5 resources

# Check API server
kubectl get apiservices | grep metrics
```

### Scaling Too Slow/Fast

```bash
# Adjust scaling policies in HPA YAML
# - Modify stabilizationWindowSeconds
# - Adjust policy values and periods
# - Change selectPolicy (Min/Max)

# Reapply HPA
kubectl apply -f k8s/autoscaling/core-service-hpa.yaml
```

### Custom Metrics Not Working

```bash
# Check Prometheus Adapter
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-adapter

# Check adapter logs
kubectl logs -n monitoring deployment/prometheus-adapter

# Verify custom metrics API
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq .

# Check Prometheus has the metrics
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
# Visit http://localhost:9090 and query metrics
```

## Best Practices

1. **Set appropriate resource requests/limits** - HPA needs these to calculate utilization
2. **Use conservative scale-down** - Prevent flapping
3. **Use aggressive scale-up** - Respond quickly to load
4. **Set stabilization windows** - Prevent rapid scaling oscillations
5. **Monitor scaling events** - Track HPA behavior
6. **Test scaling behavior** - Use load tests to verify
7. **Use custom metrics** - Scale on business metrics, not just CPU/memory
8. **Set min/max replicas** - Prevent over/under-scaling
9. **Combine multiple metrics** - Use CPU, memory, and custom metrics
10. **Monitor costs** - Track resource usage and costs

## Performance Targets

| Metric | Target |
|--------|--------|
| Scale-up time | < 30 seconds |
| Scale-down time | 5-10 minutes |
| CPU utilization | 60-80% |
| Memory utilization | 70-85% |
| Response time (P95) | < 200ms |
| Error rate | < 1% |

## Next Steps

1. Configure Prometheus and Prometheus Adapter for custom metrics
2. Set up monitoring dashboards for HPA
3. Run load tests to verify scaling behavior
4. Optimize scaling policies based on observed behavior
5. Implement VPA for resource recommendation
6. Proceed to Task 6: Security Hardening

## Additional Resources

- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [HPA Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
- [Prometheus Adapter](https://github.com/kubernetes-sigs/prometheus-adapter)
- [Custom Metrics](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#scaling-on-custom-metrics)
