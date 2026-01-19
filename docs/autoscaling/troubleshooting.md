# HPA Troubleshooting Guide

## Common Issues

### 1. HPA Shows "Unknown" for Metrics

**Symptoms:**
```bash
$ kubectl get hpa
NAME                REFERENCE              TARGETS         MINPODS   MAXPODS   REPLICAS
core-service-hpa    Deployment/core-service   <unknown>/70%   3         20        3
```

**Causes:**
- Metrics Server not installed
- Metrics Server not ready
- Resource requests not set on pods
- Metrics not available yet

**Solutions:**

**Check Metrics Server:**
```bash
kubectl get deployment metrics-server -n kube-system
kubectl get pods -n kube-system -l k8s-app=metrics-server
```

**Install Metrics Server:**
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

**Verify Resource Requests:**
```bash
kubectl get deployment core-service -n ecommerce-prod -o yaml | grep -A 5 resources
```

**Check Pod Metrics:**
```bash
kubectl top pods -n ecommerce-prod
```

---

### 2. HPA Not Scaling Up

**Symptoms:**
- CPU/Memory above target
- Replica count not increasing
- Load increasing but pods stay same

**Diagnosis:**

**Check HPA Status:**
```bash
kubectl describe hpa core-service-hpa -n ecommerce-prod
```

**Check Events:**
```bash
kubectl get events -n ecommerce-prod --field-selector involvedObject.kind=HorizontalPodAutoscaler
```

**Common Causes:**

**A. At Max Replicas**
```bash
# Check current vs max
kubectl get hpa core-service-hpa -n ecommerce-prod
```
**Solution:** Increase maxReplicas in HPA config

**B. Insufficient Cluster Resources**
```bash
# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"
```
**Solution:** Add more nodes or reduce resource requests

**C. Metrics Below Threshold**
```bash
# Check actual metrics
kubectl top pods -n ecommerce-prod -l app=core-service
```
**Solution:** Verify metric targets are appropriate

**D. Stabilization Window**
```bash
# Check HPA config
kubectl get hpa core-service-hpa -n ecommerce-prod -o yaml | grep stabilization
```
**Solution:** Wait for stabilization window to pass

---

### 3. HPA Scaling Too Slowly

**Symptoms:**
- Response time degrading
- Error rate increasing
- Scaling happens but too late

**Solutions:**

**Reduce Stabilization Window:**
```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0  # Immediate scaling
```

**Increase Scale-Up Rate:**
```yaml
policies:
  - type: Percent
    value: 200      # Triple pods instead of double
    periodSeconds: 15
```

**Lower Metric Threshold:**
```yaml
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60  # Lower from 70
```

---

### 4. HPA Flapping (Rapid Up/Down)

**Symptoms:**
- Pods scaling up and down repeatedly
- Unstable replica count
- High number of scaling events

**Diagnosis:**
```bash
# Count scaling events
kubectl get events -n ecommerce-prod | grep HorizontalPodAutoscaler | wc -l

# Watch HPA
kubectl get hpa core-service-hpa -n ecommerce-prod --watch
```

**Solutions:**

**Increase Scale-Down Stabilization:**
```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 600  # 10 minutes
```

**Use More Conservative Scale-Down:**
```yaml
policies:
  - type: Percent
    value: 25       # Only remove 25% at a time
    periodSeconds: 120  # Over 2 minutes
```

**Widen Metric Gap:**
```yaml
# Scale up at 70%, scale down at 50%
# This creates a buffer zone
```

---

### 5. Custom Metrics Not Working

**Symptoms:**
```bash
$ kubectl get hpa
NAME                     TARGETS                    
core-service-hpa-custom  <unknown>/1000, 75%/70%
```

**Diagnosis:**

**Check Prometheus Adapter:**
```bash
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-adapter
kubectl logs -n monitoring deployment/prometheus-adapter
```

**Check Custom Metrics API:**
```bash
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq .
```

**Check Specific Metric:**
```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/ecommerce-prod/pods/*/http_requests_per_second" | jq .
```

**Solutions:**

**Install Prometheus Adapter:**
```bash
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-server.monitoring.svc \
  --set prometheus.port=80
```

**Verify Prometheus Has Metrics:**
```bash
# Port-forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-server 9090:80

# Query metrics at http://localhost:9090
# Search for: http_requests_total
```

**Check Adapter Configuration:**
```bash
kubectl get configmap prometheus-adapter-config -n monitoring -o yaml
```

---

### 6. VPA Recommendations Not Showing

**Symptoms:**
- VPA created but no recommendations
- `kubectl describe vpa` shows empty recommendations

**Diagnosis:**
```bash
kubectl describe vpa core-service-vpa -n ecommerce-prod
```

**Solutions:**

**Wait for Data Collection:**
- VPA needs 24-48 hours of data
- Run some load to generate metrics

**Check VPA Components:**
```bash
kubectl get pods -n kube-system | grep vpa
```

**Verify VPA Installation:**
```bash
kubectl get crd | grep verticalpodautoscaler
```

---

### 7. Pods Not Scaling Down

**Symptoms:**
- Load decreased
- CPU/Memory below target
- Replica count stays high

**Diagnosis:**

**Check Scale-Down Conditions:**
```bash
kubectl describe hpa core-service-hpa -n ecommerce-prod | grep -A 10 "Scale Down"
```

**Common Causes:**

**A. Stabilization Window Not Elapsed**
```bash
# Check last scale event time
kubectl get events -n ecommerce-prod | grep HorizontalPodAutoscaler | tail -5
```
**Solution:** Wait for stabilization window

**B. At Min Replicas**
```bash
kubectl get hpa core-service-hpa -n ecommerce-prod
```
**Solution:** Reduce minReplicas if appropriate

**C. Metrics Still Above Threshold**
```bash
kubectl top pods -n ecommerce-prod -l app=core-service
```
**Solution:** Verify metrics are actually low

---

### 8. High CPU/Memory But Not Scaling

**Symptoms:**
- Pods showing high utilization
- HPA not triggering scale-up
- Performance degrading

**Diagnosis:**

**Check Resource Requests:**
```bash
kubectl get deployment core-service -n ecommerce-prod -o yaml | grep -A 10 resources
```

**Problem:** HPA uses percentage of requests, not limits

**Solution:**
```yaml
resources:
  requests:
    cpu: 500m      # HPA calculates based on this
    memory: 512Mi
  limits:
    cpu: 1000m     # Not used by HPA
    memory: 1Gi
```

**Verify Calculation:**
- If pod uses 350m CPU and request is 500m
- Utilization = 350/500 = 70%
- If request is too high, utilization appears low

---

### 9. Error: "Failed to Get CPU Utilization"

**Error Message:**
```
failed to get cpu utilization: unable to get metrics for resource cpu
```

**Solutions:**

**Check Metrics Server:**
```bash
kubectl get apiservices | grep metrics
```

**Restart Metrics Server:**
```bash
kubectl rollout restart deployment metrics-server -n kube-system
```

**Check Metrics Server Logs:**
```bash
kubectl logs -n kube-system deployment/metrics-server
```

---

### 10. HPA Conflicts with VPA

**Symptoms:**
- Pods restarting frequently
- Resource requests changing
- Unstable scaling

**Solution:**

**Use VPA in Recommendation Mode:**
```yaml
updatePolicy:
  updateMode: "Off"  # Only recommend, don't auto-update
```

**Or Use VPA for CPU, HPA for Memory:**
```yaml
# VPA
resourcePolicy:
  containerPolicies:
    - controlledResources: ["cpu"]  # Only CPU

# HPA
metrics:
  - type: Resource
    resource:
      name: memory  # Only memory
```

---

## Debugging Commands

### Essential Commands

```bash
# HPA status
kubectl get hpa -n ecommerce-prod
kubectl describe hpa <hpa-name> -n ecommerce-prod

# Pod metrics
kubectl top pods -n ecommerce-prod
kubectl top nodes

# Events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'

# HPA YAML
kubectl get hpa <hpa-name> -n ecommerce-prod -o yaml

# Logs
kubectl logs -n ecommerce-prod deployment/core-service

# Metrics Server
kubectl get deployment metrics-server -n kube-system
kubectl logs -n kube-system deployment/metrics-server
```

### Advanced Debugging

```bash
# Raw metrics API
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods

# Custom metrics API
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1

# HPA controller logs (if accessible)
kubectl logs -n kube-system -l component=kube-controller-manager | grep horizontal-pod-autoscaler
```

## Prevention Best Practices

1. **Set Resource Requests:** Always set CPU/memory requests
2. **Monitor Metrics:** Ensure metrics are being collected
3. **Test Scaling:** Use load tests to verify behavior
4. **Start Conservative:** Begin with longer stabilization windows
5. **Document Changes:** Keep track of policy adjustments
6. **Set Alerts:** Alert on HPA errors and excessive scaling
7. **Regular Reviews:** Monthly review of scaling behavior
8. **Capacity Planning:** Ensure cluster can handle max replicas

## Getting Help

If issues persist:

1. **Check HPA Events:** `kubectl describe hpa`
2. **Review Metrics:** `kubectl top pods`
3. **Check Logs:** Application and Metrics Server logs
4. **Verify Configuration:** Review HPA YAML
5. **Test Manually:** Scale deployment manually to verify cluster capacity
6. **Consult Documentation:** [Kubernetes HPA Docs](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
