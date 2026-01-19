# kubectl Commands Cheat Sheet

## Essential Commands

### Get Resources
```bash
# List all pods
kubectl get pods

# List pods in specific namespace
kubectl get pods -n ecommerce-prod

# List all resources
kubectl get all -n ecommerce-prod

# Get pod details
kubectl describe pod <pod-name> -n ecommerce-prod

# Get pod logs
kubectl logs <pod-name> -n ecommerce-prod

# Follow logs
kubectl logs -f <pod-name> -n ecommerce-prod

# Get previous container logs
kubectl logs <pod-name> --previous -n ecommerce-prod
```

### Deployments
```bash
# List deployments
kubectl get deployments -n ecommerce-prod

# Scale deployment
kubectl scale deployment/core-service --replicas=5 -n ecommerce-prod

# Restart deployment
kubectl rollout restart deployment/core-service -n ecommerce-prod

# Check rollout status
kubectl rollout status deployment/core-service -n ecommerce-prod

# View rollout history
kubectl rollout history deployment/core-service -n ecommerce-prod

# Rollback deployment
kubectl rollout undo deployment/core-service -n ecommerce-prod

# Rollback to specific revision
kubectl rollout undo deployment/core-service --to-revision=2 -n ecommerce-prod
```

### Debugging
```bash
# Exec into pod
kubectl exec -it <pod-name> -n ecommerce-prod -- /bin/sh

# Run command in pod
kubectl exec <pod-name> -n ecommerce-prod -- curl http://localhost:3000/health

# Port forward
kubectl port-forward <pod-name> 3000:3000 -n ecommerce-prod

# Port forward service
kubectl port-forward svc/core-service 3000:3000 -n ecommerce-prod

# Get pod events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n ecommerce-prod
kubectl top nodes
```

### ConfigMaps & Secrets
```bash
# List ConfigMaps
kubectl get configmaps -n ecommerce-prod

# View ConfigMap
kubectl describe configmap app-config -n ecommerce-prod

# Edit ConfigMap
kubectl edit configmap app-config -n ecommerce-prod

# List Secrets
kubectl get secrets -n ecommerce-prod

# View Secret (base64 encoded)
kubectl get secret app-secret -n ecommerce-prod -o yaml
```

### Services & Networking
```bash
# List services
kubectl get services -n ecommerce-prod

# Describe service
kubectl describe service core-service -n ecommerce-prod

# List ingresses
kubectl get ingress -n ecommerce-prod

# Test service connectivity
kubectl run test-pod --image=busybox -it --rm -- wget -O- http://core-service:3000/health
```

---

## Common Troubleshooting

### Pod Not Starting
```bash
# Check pod status
kubectl get pod <pod-name> -n ecommerce-prod

# Check pod events
kubectl describe pod <pod-name> -n ecommerce-prod

# Check logs
kubectl logs <pod-name> -n ecommerce-prod

# Check previous logs if CrashLoopBackOff
kubectl logs <pod-name> --previous -n ecommerce-prod
```

### High Memory/CPU
```bash
# Check resource usage
kubectl top pods -n ecommerce-prod

# Check resource limits
kubectl describe pod <pod-name> -n ecommerce-prod | grep -A 5 "Limits"

# Increase resources
kubectl set resources deployment/core-service \
  --limits=memory=2Gi,cpu=1000m \
  -n ecommerce-prod
```

### Database Connection Issues
```bash
# Test connectivity
kubectl exec <pod-name> -n ecommerce-prod -- nc -zv mongodb 27017

# Check DNS resolution
kubectl exec <pod-name> -n ecommerce-prod -- nslookup mongodb

# Check environment variables
kubectl exec <pod-name> -n ecommerce-prod -- env | grep DATABASE
```

---

## Quick Reference

### Namespaces
- `ecommerce-prod` - Production environment
- `ecommerce-staging` - Staging environment
- `monitoring` - Prometheus, Grafana
- `logging` - ELK stack
- `database` - MongoDB, Redis

### Common Labels
- `app=core-service` - Core service pods
- `app=order-service` - Order service pods
- `version=blue` - Blue deployment
- `version=green` - Green deployment

### Useful Aliases
```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgd='kubectl get deployments'
alias kgs='kubectl get services'
alias kl='kubectl logs'
alias kd='kubectl describe'
alias ke='kubectl exec -it'
```

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
