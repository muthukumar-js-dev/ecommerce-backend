# Kubernetes Troubleshooting Guide

## Common Issues and Solutions

### Pod Issues

#### Pods Not Starting

**Symptoms:**
- Pods stuck in `Pending` state
- Pods in `CrashLoopBackOff`
- Pods in `ImagePullBackOff`

**Diagnosis:**
```bash
# Check pod status
kubectl get pods -n ecommerce-prod

# Describe pod for events
kubectl describe pod <pod-name> -n ecommerce-prod

# Check pod logs
kubectl logs <pod-name> -n ecommerce-prod

# Check previous container logs (if crashed)
kubectl logs <pod-name> -n ecommerce-prod --previous
```

**Common Causes:**

1. **Insufficient Resources:**
   ```bash
   # Check node resources
   kubectl top nodes
   
   # Check resource quotas
   kubectl describe resourcequota -n ecommerce-prod
   
   # Solution: Scale down or increase node capacity
   kubectl scale deployment/ecommerce-backend --replicas=2 -n ecommerce-prod
   ```

2. **Image Pull Errors:**
   ```bash
   # Check image name and tag
   kubectl get deployment ecommerce-backend -n ecommerce-prod -o yaml | grep image
   
   # Check image pull secrets
   kubectl get secrets -n ecommerce-prod
   
   # Solution: Fix image name or add pull secret
   kubectl create secret docker-registry regcred \
     --docker-server=<registry> \
     --docker-username=<username> \
     --docker-password=<password> \
     --namespace=ecommerce-prod
   ```

3. **Application Crashes:**
   ```bash
   # Check application logs
   kubectl logs -f <pod-name> -n ecommerce-prod
   
   # Check environment variables
   kubectl exec <pod-name> -n ecommerce-prod -- env
   
   # Solution: Fix application code or configuration
   ```

#### Pods Restarting Frequently

**Diagnosis:**
```bash
# Check restart count
kubectl get pods -n ecommerce-prod

# Check events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n ecommerce-prod
```

**Common Causes:**

1. **Memory Limit Exceeded (OOMKilled):**
   ```bash
   # Check if pod was OOMKilled
   kubectl describe pod <pod-name> -n ecommerce-prod | grep -i oom
   
   # Solution: Increase memory limits
   # Edit helm values and redeploy
   ```

2. **Failed Health Checks:**
   ```bash
   # Check liveness/readiness probes
   kubectl describe pod <pod-name> -n ecommerce-prod | grep -A 10 Liveness
   
   # Solution: Adjust probe settings or fix application
   ```

### Service Issues

#### Service Not Accessible

**Diagnosis:**
```bash
# Check service
kubectl get svc -n ecommerce-prod

# Check endpoints
kubectl get endpoints -n ecommerce-prod

# Describe service
kubectl describe svc ecommerce-backend -n ecommerce-prod
```

**Common Causes:**

1. **No Endpoints:**
   ```bash
   # Check if pods are running
   kubectl get pods -n ecommerce-prod -l app.kubernetes.io/name=ecommerce-backend
   
   # Check pod labels match service selector
   kubectl get pods -n ecommerce-prod --show-labels
   
   # Solution: Fix pod labels or service selector
   ```

2. **Wrong Port:**
   ```bash
   # Check service ports
   kubectl get svc ecommerce-backend -n ecommerce-prod -o yaml
   
   # Test connectivity from another pod
   kubectl run test-pod --rm -i --tty --image=busybox -- sh
   # Inside pod:
   wget -O- http://ecommerce-backend.ecommerce-prod.svc.cluster.local:3000/health
   ```

### Ingress Issues

#### Ingress Not Working

**Diagnosis:**
```bash
# Check ingress
kubectl get ingress -n ecommerce-prod

# Describe ingress
kubectl describe ingress -n ecommerce-prod

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

**Common Causes:**

1. **Ingress Controller Not Running:**
   ```bash
   # Check ingress controller
   kubectl get pods -n ingress-nginx
   
   # Solution: Install or restart ingress controller
   helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
     --namespace ingress-nginx
   ```

2. **DNS Not Configured:**
   ```bash
   # Get LoadBalancer IP/hostname
   kubectl get svc -n ingress-nginx ingress-nginx-controller
   
   # Test with host header
   curl -H "Host: api.yourdomain.com" http://<EXTERNAL-IP>
   
   # Solution: Configure DNS A/CNAME record
   ```

3. **Certificate Issues:**
   ```bash
   # Check certificate
   kubectl get certificate -n ecommerce-prod
   
   # Check cert-manager logs
   kubectl logs -n cert-manager deployment/cert-manager
   
   # Solution: Fix ClusterIssuer or certificate configuration
   ```

### Storage Issues

#### PVC Not Binding

**Diagnosis:**
```bash
# Check PVC status
kubectl get pvc -n ecommerce-prod

# Describe PVC
kubectl describe pvc <pvc-name> -n ecommerce-prod

# Check PV
kubectl get pv
```

**Common Causes:**

1. **No Available PV:**
   ```bash
   # Check if PV exists with matching storage class
   kubectl get pv -o wide
   
   # Solution: Create PV or use dynamic provisioning
   ```

2. **Storage Class Not Found:**
   ```bash
   # Check storage classes
   kubectl get storageclass
   
   # Solution: Create storage class or fix PVC
   ```

### Networking Issues

#### Pod-to-Pod Communication Failing

**Diagnosis:**
```bash
# Test from one pod to another
kubectl exec <pod-1> -n ecommerce-prod -- ping <pod-2-ip>

# Check network policies
kubectl get networkpolicies -n ecommerce-prod

# Check DNS resolution
kubectl exec <pod-name> -n ecommerce-prod -- nslookup kubernetes.default
```

**Common Causes:**

1. **Network Policy Blocking:**
   ```bash
   # Check network policies
   kubectl describe networkpolicy -n ecommerce-prod
   
   # Solution: Update network policy
   ```

2. **DNS Issues:**
   ```bash
   # Check CoreDNS
   kubectl get pods -n kube-system -l k8s-app=kube-dns
   
   # Check CoreDNS logs
   kubectl logs -n kube-system -l k8s-app=kube-dns
   
   # Solution: Restart CoreDNS
   kubectl rollout restart deployment/coredns -n kube-system
   ```

### Resource Issues

#### Resource Quota Exceeded

**Diagnosis:**
```bash
# Check resource quota
kubectl describe resourcequota -n ecommerce-prod

# Check current usage
kubectl top pods -n ecommerce-prod
kubectl top nodes
```

**Solution:**
```bash
# Option 1: Increase quota
kubectl edit resourcequota compute-quota -n ecommerce-prod

# Option 2: Scale down deployments
kubectl scale deployment/ecommerce-backend --replicas=2 -n ecommerce-prod

# Option 3: Delete unused resources
kubectl delete deployment <unused-deployment> -n ecommerce-prod
```

#### Node Resource Pressure

**Diagnosis:**
```bash
# Check node conditions
kubectl describe nodes

# Check resource usage
kubectl top nodes
```

**Solution:**
```bash
# Add more nodes (EKS)
eksctl scale nodegroup --cluster=ecommerce-prod \
  --name=worker-services --nodes=10

# Or enable cluster autoscaler
```

### Configuration Issues

#### ConfigMap/Secret Not Loading

**Diagnosis:**
```bash
# Check if ConfigMap exists
kubectl get configmap -n ecommerce-prod

# Check if Secret exists
kubectl get secret -n ecommerce-prod

# Check pod environment variables
kubectl exec <pod-name> -n ecommerce-prod -- env
```

**Solution:**
```bash
# Recreate ConfigMap
kubectl apply -f k8s/config/configmap.yaml

# Restart pods to pick up changes
kubectl rollout restart deployment/ecommerce-backend -n ecommerce-prod
```

### Performance Issues

#### Slow Response Times

**Diagnosis:**
```bash
# Check pod resource usage
kubectl top pods -n ecommerce-prod

# Check HPA status
kubectl get hpa -n ecommerce-prod

# Check application metrics
kubectl port-forward -n ecommerce-prod svc/ecommerce-backend 3000:3000
curl http://localhost:3000/metrics
```

**Solution:**
```bash
# Scale up manually
kubectl scale deployment/ecommerce-backend --replicas=10 -n ecommerce-prod

# Or adjust HPA thresholds
kubectl edit hpa ecommerce-backend -n ecommerce-prod
```

#### High Memory Usage

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods -n ecommerce-prod

# Check for memory leaks in logs
kubectl logs <pod-name> -n ecommerce-prod | grep -i memory
```

**Solution:**
```bash
# Increase memory limits
# Edit helm values
resources:
  limits:
    memory: 2Gi

# Redeploy
helm upgrade ecommerce-backend ./helm/ecommerce-backend \
  --namespace ecommerce-prod \
  --values ./helm/ecommerce-backend/values-production.yaml
```

## Debugging Tools

### Interactive Debugging

```bash
# Shell into running pod
kubectl exec -it <pod-name> -n ecommerce-prod -- sh

# Run debug pod
kubectl run debug-pod --rm -i --tty \
  --image=nicolaka/netshoot \
  --namespace=ecommerce-prod -- bash

# Port forward for local debugging
kubectl port-forward <pod-name> -n ecommerce-prod 9229:9229
```

### Log Analysis

```bash
# Tail logs
kubectl logs -f <pod-name> -n ecommerce-prod

# Get logs from all pods in deployment
kubectl logs -f deployment/ecommerce-backend -n ecommerce-prod --all-containers=true

# Get logs from specific time
kubectl logs <pod-name> -n ecommerce-prod --since=1h

# Save logs to file
kubectl logs <pod-name> -n ecommerce-prod > pod-logs.txt
```

### Network Debugging

```bash
# Test DNS resolution
kubectl run test-dns --rm -i --tty --image=busybox -- nslookup kubernetes.default

# Test service connectivity
kubectl run test-curl --rm -i --tty --image=curlimages/curl -- sh
# Inside pod:
curl http://ecommerce-backend.ecommerce-prod.svc.cluster.local:3000/health

# Trace network path
kubectl run test-traceroute --rm -i --tty --image=nicolaka/netshoot -- traceroute google.com
```

## Monitoring and Alerts

### Check Prometheus Alerts

```bash
# Port forward Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Access at http://localhost:9090/alerts
```

### Check Grafana Dashboards

```bash
# Port forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80

# Access at http://localhost:3001
```

## Emergency Procedures

### Complete Service Outage

1. **Check cluster health:**
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```

2. **Check critical pods:**
   ```bash
   kubectl get pods --all-namespaces | grep -v Running
   ```

3. **Rollback if recent deployment:**
   ```bash
   helm rollback ecommerce-backend -n ecommerce-prod
   ```

4. **Scale up if capacity issue:**
   ```bash
   kubectl scale deployment/ecommerce-backend --replicas=20 -n ecommerce-prod
   ```

### Data Loss Prevention

```bash
# Backup critical data
kubectl exec <mongodb-pod> -n ecommerce-prod -- mongodump --out /backup

# Copy backup from pod
kubectl cp ecommerce-prod/<mongodb-pod>:/backup ./backup
```

## Best Practices

1. **Always check logs first**
2. **Use describe for detailed information**
3. **Check events for recent changes**
4. **Verify resource availability**
5. **Test in development first**
6. **Keep backups of configurations**
7. **Document custom solutions**
8. **Monitor continuously**

## Getting Help

1. **Check Kubernetes documentation**
2. **Review application logs**
3. **Check monitoring dashboards**
4. **Search GitHub issues**
5. **Contact DevOps team**

## Additional Resources

- [Kubernetes Debugging Guide](https://kubernetes.io/docs/tasks/debug/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Troubleshooting Applications](https://kubernetes.io/docs/tasks/debug/debug-application/)
