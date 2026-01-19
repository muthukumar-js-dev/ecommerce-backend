# Scaling Runbook

## Horizontal Scaling

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment main-app --replicas=10 -n ecommerce

# Verify scaling
kubectl get pods -n ecommerce -w
```

### Auto-Scaling (HPA)

```bash
# Check HPA status
kubectl get hpa -n ecommerce

# Update HPA
kubectl edit hpa main-app-hpa -n ecommerce

# Example HPA config
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: main-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: main-app
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Vertical Scaling

```bash
# Update resource limits
kubectl edit deployment main-app -n ecommerce

# Increase CPU/Memory
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

## Database Scaling

### Add Read Replicas

```bash
# Update MongoDB replica set
mongo --eval "rs.add('mongodb-replica-2:27017')"
```

### Shard Scaling

```bash
# Add new shard
npm run db:add-shard -- --shard-id shard3 --uri mongodb://shard3:27017
```

## Cache Scaling

```bash
# Scale Redis cluster
kubectl scale statefulset redis --replicas=6 -n ecommerce
```

## Monitoring During Scaling

- Watch CPU/Memory metrics
- Monitor error rates
- Check response times
- Verify data consistency
