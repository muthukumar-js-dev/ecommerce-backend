# Hands-On Lab 1: Deploy a Service to Kubernetes

## Objective
Deploy a new version of the core service using blue-green deployment strategy.

## Prerequisites
- kubectl configured for staging cluster
- Docker installed locally
- Access to ECR registry

## Estimated Time
45 minutes

---

## Part 1: Build and Push Docker Image (15 min)

### 1. Clone the repository
```bash
git clone https://github.com/yourorg/ecommerce-backend.git
cd ecommerce-backend
```

### 2. Checkout feature branch
```bash
git checkout feature/new-api-endpoint
```

### 3. Build Docker image
```bash
docker build -t ecommerce/core-service:lab-v1 .
```

### 4. Tag for ECR
```bash
docker tag ecommerce/core-service:lab-v1 \
  123456789.dkr.ecr.ap-south-1.amazonaws.com/ecommerce/core-service:lab-v1
```

### 5. Push to ECR
```bash
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.ap-south-1.amazonaws.com

docker push 123456789.dkr.ecr.ap-south-1.amazonaws.com/ecommerce/core-service:lab-v1
```

---

## Part 2: Deploy Green Version (15 min)

### 1. Update deployment manifest
```bash
# Edit k8s/deployments/core-service-green.yaml
# Update image tag to lab-v1
```

### 2. Apply green deployment
```bash
kubectl apply -f k8s/deployments/core-service-green.yaml
```

### 3. Wait for pods to be ready
```bash
kubectl wait --for=condition=ready pod \
  -l app=core-service,version=green \
  -n ecommerce-staging \
  --timeout=300s
```

### 4. Verify pods are running
```bash
kubectl get pods -n ecommerce-staging -l version=green
```

---

## Part 3: Run Smoke Tests (10 min)

### 1. Test health endpoint
```bash
GREEN_POD=$(kubectl get pod -n ecommerce-staging \
  -l app=core-service,version=green \
  -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n ecommerce-staging $GREEN_POD -- \
  curl -f http://localhost:3000/health
```

### 2. Test new API endpoint
```bash
kubectl exec -n ecommerce-staging $GREEN_POD -- \
  curl -f http://localhost:3000/api/v1/new-endpoint
```

### 3. Run automated smoke tests
```bash
npm run test:smoke -- --target=green
```

---

## Part 4: Switch Traffic (5 min)

### 1. Update service selector
```bash
kubectl patch service core-service -n ecommerce-staging -p \
  '{"spec":{"selector":{"version":"green"}}}'
```

### 2. Verify traffic is routed to green
```bash
curl https://staging-api.yourdomain.com/health
# Should show version: green
```

### 3. Monitor for 5 minutes
```bash
watch kubectl get pods -n ecommerce-staging
```

---

## Part 5: Cleanup (5 min)

### 1. Delete blue deployment
```bash
kubectl delete deployment core-service-blue -n ecommerce-staging
```

### 2. Verify only green pods running
```bash
kubectl get pods -n ecommerce-staging -l app=core-service
```

---

## Expected Outcomes
- [ ] Docker image built and pushed successfully
- [ ] Green deployment created with new version
- [ ] All pods healthy and ready
- [ ] Smoke tests passed
- [ ] Traffic switched to green version
- [ ] Blue deployment cleaned up

---

## Troubleshooting

### Issue: Pods not starting
**Check:**
- Image exists in ECR
- Image tag is correct
- Environment variables are set
- Resource limits are appropriate

### Issue: Health check failing
**Check:**
- Application is listening on correct port
- Health endpoint is implemented
- Database connectivity

---

## Bonus Challenges
1. Implement canary deployment (10% traffic to green)
2. Add custom metrics to monitor deployment
3. Automate the entire process with a script

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
