# Blue-Green Deployment Guide

## Overview

Blue-green deployment is a technique that reduces downtime and risk by running two identical production environments called Blue and Green.

---

## Concept

### Blue Environment
- **Current stable version** (e.g., v1.0.0)
- Serving 100% of production traffic
- Proven stable and reliable

### Green Environment
- **New version** (e.g., v2.0.0)
- Deployed alongside blue
- Tested before receiving traffic

### Switching
- Traffic switched from blue to green
- Instant cutover or progressive shifting
- Easy rollback if issues occur

---

## Architecture

```
                    ┌─────────────┐
                    │   Service   │
                    │  (Selector) │
                    └──────┬──────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
    ┌───────▼────────┐          ┌────────▼───────┐
    │  Blue Pods     │          │  Green Pods    │
    │  (v1.0.0)      │          │  (v2.0.0)      │
    │  10 replicas   │          │  10 replicas   │
    └────────────────┘          └────────────────┘
```

---

## Deployment Process

### 1. Initial State (Blue Active)

```yaml
Service selector:
  version: blue

Blue deployment:
  replicas: 10
  image: v1.0.0
  status: Running

Green deployment:
  replicas: 0
  image: v2.0.0
  status: Not deployed
```

### 2. Deploy Green

```bash
# Deploy green version
kubectl apply -f k8s/deployments/blue-green/core-service-green.yaml

# Wait for green to be ready
kubectl wait --for=condition=ready pod \
    -l app=core-service,version=green \
    -n ecommerce-prod \
    --timeout=300s
```

### 3. Test Green

```bash
# Direct test to green pods
kubectl port-forward -n ecommerce-prod \
    svc/core-service-green 8080:80

# Run smoke tests
curl http://localhost:8080/health
curl http://localhost:8080/ready

# Run integration tests
npm run test:integration
```

### 4. Switch Traffic

```bash
# Update service selector to green
kubectl patch service core-service -n ecommerce-prod --type=json -p='[
    {
        "op": "replace",
        "path": "/spec/selector/version",
        "value": "green"
    }
]'
```

### 5. Monitor

```bash
# Watch pods
kubectl get pods -n ecommerce-prod -l app=core-service -w

# Check metrics
kubectl top pods -n ecommerce-prod -l app=core-service

# View logs
kubectl logs -f -n ecommerce-prod -l app=core-service,version=green
```

### 6. Cleanup (After Verification)

```bash
# Scale down blue
kubectl scale deployment core-service-blue -n ecommerce-prod --replicas=0

# Delete blue (after 24 hours)
kubectl delete deployment core-service-blue -n ecommerce-prod
```

---

## Configuration Files

### Blue Deployment

```yaml
# k8s/deployments/blue-green/core-service-blue.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core-service-blue
  labels:
    version: blue
spec:
  replicas: 10
  selector:
    matchLabels:
      app: core-service
      version: blue
  template:
    spec:
      containers:
        - name: core-service
          image: ecommerce/core-service:v1.0.0
```

### Green Deployment

```yaml
# k8s/deployments/blue-green/core-service-green.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core-service-green
  labels:
    version: green
spec:
  replicas: 10
  selector:
    matchLabels:
      app: core-service
      version: green
  template:
    spec:
      containers:
        - name: core-service
          image: ecommerce/core-service:v2.0.0
```

### Service

```yaml
# k8s/deployments/blue-green/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: core-service
spec:
  selector:
    app: core-service
    version: blue  # Switch to 'green' for cutover
  ports:
    - port: 80
      targetPort: 3000
```

---

## Testing Procedures

### Pre-Deployment Testing

1. **Build and Push Images**
   ```bash
   docker build -t ecommerce/core-service:v2.0.0 .
   docker push ecommerce/core-service:v2.0.0
   ```

2. **Test in Staging**
   ```bash
   kubectl apply -f k8s/deployments/blue-green/ -n ecommerce-staging
   ```

3. **Run Test Suite**
   ```bash
   npm run test:all
   npm run test:e2e
   ```

### Post-Deployment Testing

1. **Smoke Tests**
   ```bash
   curl https://api.yourdomain.com/health
   curl https://api.yourdomain.com/ready
   ```

2. **Functional Tests**
   ```bash
   npm run test:integration
   ```

3. **Performance Tests**
   ```bash
   artillery run load-tests/production-simulation.yml
   ```

---

## Rollback Procedure

### Immediate Rollback

```bash
# Switch service back to blue
kubectl patch service core-service -n ecommerce-prod --type=json -p='[
    {
        "op": "replace",
        "path": "/spec/selector/version",
        "value": "blue"
    }
]'

# Scale down green
kubectl scale deployment core-service-green -n ecommerce-prod --replicas=0
```

**Rollback Time:** < 30 seconds

### Automated Rollback

Use the rollback script:
```bash
bash scripts/deployment/rollback.sh core-service
```

---

## Advantages

✅ **Zero Downtime** - Seamless traffic switching  
✅ **Easy Rollback** - Instant reversion to blue  
✅ **Testing in Production** - Test green before switching  
✅ **Reduced Risk** - Issues caught before full deployment  
✅ **Simple Process** - Easy to understand and execute

---

## Disadvantages

⚠️ **Resource Usage** - Requires 2x resources during deployment  
⚠️ **Database Migrations** - Complex with schema changes  
⚠️ **Stateful Services** - Challenging for stateful applications  
⚠️ **Cost** - Higher infrastructure costs during deployment

---

## Best Practices

1. **Always Test Green First**
   - Run smoke tests
   - Verify health endpoints
   - Check logs for errors

2. **Monitor During Switch**
   - Watch error rates
   - Monitor latency
   - Check pod health

3. **Keep Blue Running**
   - Don't delete immediately
   - Wait 24-48 hours
   - Verify green is stable

4. **Automate the Process**
   - Use scripts
   - Implement CI/CD
   - Add automated checks

5. **Plan for Rollback**
   - Test rollback procedure
   - Have team ready
   - Know the commands

---

## Troubleshooting

### Issue: Service Not Switching

**Check selector:**
```bash
kubectl get service core-service -n ecommerce-prod -o yaml | grep -A 2 selector
```

**Update manually:**
```bash
kubectl edit service core-service -n ecommerce-prod
# Change version: blue to version: green
```

### Issue: Green Pods Not Ready

**Check pod status:**
```bash
kubectl describe pod <pod-name> -n ecommerce-prod
```

**Check logs:**
```bash
kubectl logs <pod-name> -n ecommerce-prod
```

### Issue: Traffic Still Going to Blue

**Verify endpoints:**
```bash
kubectl get endpoints core-service -n ecommerce-prod
```

**Check pod labels:**
```bash
kubectl get pods -n ecommerce-prod -l app=core-service --show-labels
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `kubectl apply -f blue.yaml` | Deploy blue |
| `kubectl apply -f green.yaml` | Deploy green |
| `kubectl patch service ...` | Switch traffic |
| `kubectl scale deployment ...` | Scale deployment |
| `kubectl delete deployment ...` | Remove deployment |

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
