# Phase 4 - Task 5: Horizontal Pod Autoscaling

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Tasks 1-4 (Kubernetes + Database Optimized)

---

## Objective

Implement Horizontal Pod Autoscaler (HPA) to automatically scale services based on CPU, memory, and custom metrics to handle variable load efficiently.

---

## Context

HPA provides:
- **Automatic Scaling:** Scale pods based on metrics
- **Cost Efficiency:** Scale down during low traffic
- **Performance:** Scale up during high traffic
- **Custom Metrics:** Scale based on business metrics
- **Resource Optimization:** Maintain target utilization

---

## Implementation Steps

### Step 1: Metrics Server Installation

**Install Metrics Server:**

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify installation
kubectl get deployment metrics-server -n kube-system
kubectl top nodes
kubectl top pods -n ecommerce-prod
```

### Step 2: Basic HPA Configuration

**Create `k8s/autoscaling/core-service-hpa.yaml`:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: core-service-hpa
  namespace: ecommerce-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: core-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # CPU-based scaling
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    
    # Memory-based scaling
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
        - type: Pods
          value: 2
          periodSeconds: 60
      selectPolicy: Min
    
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

**Apply HPA:**

```bash
kubectl apply -f k8s/autoscaling/core-service-hpa.yaml

# Check HPA status
kubectl get hpa -n ecommerce-prod
kubectl describe hpa core-service-hpa -n ecommerce-prod
```

### Step 3: Custom Metrics with Prometheus Adapter

**Install Prometheus Adapter:**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-server.monitoring.svc \
  --set prometheus.port=80
```

**Configure custom metrics:**

**Create `k8s/monitoring/prometheus-adapter-config.yaml`:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
      # HTTP requests per second
      - seriesQuery: 'http_requests_total{namespace="ecommerce-prod"}'
        resources:
          template: <<.Resource>>
        name:
          matches: "^(.*)_total"
          as: "${1}_per_second"
        metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
      
      # Kafka consumer lag
      - seriesQuery: 'kafka_consumer_lag{namespace="ecommerce-prod"}'
        resources:
          template: <<.Resource>>
        name:
          as: "kafka_consumer_lag"
        metricsQuery: 'avg_over_time(<<.Series>>{<<.LabelMatchers>>}[2m])'
      
      # Database connection pool usage
      - seriesQuery: 'mongodb_connections_current{namespace="ecommerce-prod"}'
        resources:
          template: <<.Resource>>
        name:
          as: "db_connection_usage"
        metricsQuery: '<<.Series>>{<<.LabelMatchers>>}'
```

### Step 4: HPA with Custom Metrics

**Create `k8s/autoscaling/core-service-hpa-custom.yaml`:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: core-service-hpa-custom
  namespace: ecommerce-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: core-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # Resource metrics
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    
    # Custom metric: HTTP requests per second
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
    
    # Custom metric: Response time
    - type: Pods
      pods:
        metric:
          name: http_request_duration_p95
        target:
          type: AverageValue
          averageValue: "200m"  # 200ms
```

### Step 5: Payment Service HPA

**Create `k8s/autoscaling/payment-service-hpa.yaml`:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: ecommerce-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
    
    # Payment-specific metric
    - type: Pods
      pods:
        metric:
          name: payment_processing_queue_length
        target:
          type: AverageValue
          averageValue: "50"
```

### Step 6: Notification Service HPA

**Create `k8s/autoscaling/notification-service-hpa.yaml`:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: notification-service-hpa
  namespace: ecommerce-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-service
  minReplicas: 2
  maxReplicas: 15
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    
    # Kafka consumer lag metric
    - type: Pods
      pods:
        metric:
          name: kafka_consumer_lag
        target:
          type: AverageValue
          averageValue: "100"
```

### Step 7: Resource Limits Configuration

**Update deployment with proper resource limits:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core-service
  namespace: ecommerce-prod
spec:
  template:
    spec:
      containers:
        - name: core-service
          image: ecommerce/core-service:latest
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          env:
            - name: NODE_OPTIONS
              value: "--max-old-space-size=896"  # 90% of memory limit
```

### Step 8: Vertical Pod Autoscaler (Optional)

**Install VPA:**

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

**Create VPA for recommendation:**

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: core-service-vpa
  namespace: ecommerce-prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: core-service
  updatePolicy:
    updateMode: "Off"  # Only recommend, don't auto-update
  resourcePolicy:
    containerPolicies:
      - containerName: core-service
        minAllowed:
          cpu: 250m
          memory: 256Mi
        maxAllowed:
          cpu: 2000m
          memory: 2Gi
```

### Step 9: Monitoring HPA

**Create monitoring dashboard:**

```typescript
// src/infrastructure/monitoring/hpa-metrics.ts

import { register, Gauge } from 'prom-client';

export class HPAMetrics {
  private currentReplicas: Gauge;
  private desiredReplicas: Gauge;
  private cpuUtilization: Gauge;
  private memoryUtilization: Gauge;

  constructor() {
    this.currentReplicas = new Gauge({
      name: 'hpa_current_replicas',
      help: 'Current number of replicas',
      labelNames: ['deployment'],
      registers: [register],
    });

    this.desiredReplicas = new Gauge({
      name: 'hpa_desired_replicas',
      help: 'Desired number of replicas',
      labelNames: ['deployment'],
      registers: [register],
    });

    this.cpuUtilization = new Gauge({
      name: 'hpa_cpu_utilization',
      help: 'Current CPU utilization percentage',
      labelNames: ['deployment'],
      registers: [register],
    });

    this.memoryUtilization = new Gauge({
      name: 'hpa_memory_utilization',
      help: 'Current memory utilization percentage',
      labelNames: ['deployment'],
      registers: [register],
    });
  }

  updateMetrics(deployment: string, metrics: any) {
    this.currentReplicas.set({ deployment }, metrics.currentReplicas);
    this.desiredReplicas.set({ deployment }, metrics.desiredReplicas);
    this.cpuUtilization.set({ deployment }, metrics.cpuUtilization);
    this.memoryUtilization.set({ deployment }, metrics.memoryUtilization);
  }
}
```

### Step 10: Load Testing for HPA

**Create load test to trigger scaling:**

```yaml
# load-tests/hpa-test.yml
config:
  target: 'http://api.yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Baseline'
    - duration: 300
      arrivalRate: 100
      rampTo: 1000
      name: 'Ramp up - trigger scaling'
    - duration: 300
      arrivalRate: 1000
      name: 'Sustained load'
    - duration: 180
      arrivalRate: 1000
      rampTo: 10
      name: 'Ramp down - trigger scale down'

scenarios:
  - name: 'API Load'
    flow:
      - get:
          url: '/api/products'
      - post:
          url: '/api/cart/add'
```

**Monitor scaling during load test:**

```bash
# Watch HPA in real-time
watch -n 2 kubectl get hpa -n ecommerce-prod

# Watch pods scaling
watch -n 2 kubectl get pods -n ecommerce-prod

# Check metrics
kubectl top pods -n ecommerce-prod
```

---

## Testing

**Test HPA behavior:**

```bash
# Generate load
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://core-service; done"

# Watch scaling
kubectl get hpa core-service-hpa -n ecommerce-prod --watch

# Check events
kubectl describe hpa core-service-hpa -n ecommerce-prod
```

---

## Deliverables

- [ ] Metrics Server installed
- [ ] HPA configured for all services
- [ ] Custom metrics implemented
- [ ] Prometheus Adapter configured
- [ ] Resource limits set
- [ ] Scaling policies defined
- [ ] VPA recommendations (optional)
- [ ] Monitoring dashboard
- [ ] Load tests passing
- [ ] Documentation

---

## Scaling Targets

| Service | Min Replicas | Max Replicas | CPU Target | Memory Target |
|---------|--------------|--------------|------------|---------------|
| Core Service | 3 | 20 | 70% | 80% |
| Payment Service | 2 | 10 | 60% | 75% |
| Notification Service | 2 | 15 | 70% | 80% |

---

## Next Steps

After completing this task:
1. Proceed to **Task 6: Security Hardening**
2. Monitor scaling behavior
3. Optimize scaling policies

---

**Task Owner:** DevOps Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
