# Deployment Runbook

## Prerequisites

- kubectl configured
- Docker installed
- Access to container registry
- Environment variables configured

## Standard Deployment

### 1. Build and Push Images

```bash
# Build production image
npm run build:prod

# Build Docker image
docker build -t profitcart/main-app:latest .

# Push to registry
docker push profitcart/main-app:latest
```

### 2. Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmaps/
kubectl apply -f k8s/secrets/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/

# Verify deployment
kubectl get pods -n ecommerce
kubectl get services -n ecommerce
```

### 3. Verify Health

```bash
# Check pod status
kubectl get pods -n ecommerce -w

# Check logs
kubectl logs -f deployment/main-app -n ecommerce

# Test health endpoint
curl http://<service-url>/health
```

## Blue-Green Deployment

```bash
# Deploy green version
bash scripts/deployment/test-blue-green.sh

# Shift traffic
npm run deploy:traffic-shift -- --target green --percentage 100

# Verify and cleanup blue
kubectl delete deployment main-app-blue -n ecommerce
```

## Rollback Procedure

```bash
# Quick rollback
kubectl rollout undo deployment/main-app -n ecommerce

# Or use script
bash scripts/deployment/rollback.sh
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n ecommerce
kubectl logs <pod-name> -n ecommerce
```

### Service unreachable
```bash
kubectl get svc -n ecommerce
kubectl describe svc main-app -n ecommerce
```
