# Troubleshooting Guide

## Common Issues and Solutions

### 1. Application Not Starting

**Symptoms:**
- Pods in CrashLoopBackOff
- Application logs show startup errors

**Diagnosis:**
```bash
# Check pod status
kubectl get pods -n ecommerce-prod

# View pod logs
kubectl logs -n ecommerce-prod <pod-name>

# Describe pod for events
kubectl describe pod -n ecommerce-prod <pod-name>
```

**Common Causes:**
1. **Missing environment variables**
   - Check ConfigMap/Secret
   - Verify all required vars are set

2. **Database connection failure**
   - Verify MongoDB is running
   - Check connection string
   - Test network connectivity

3. **Port already in use**
   - Check for port conflicts
   - Verify service configuration

**Solutions:**
```bash
# Fix environment variables
kubectl edit configmap app-config -n ecommerce-prod

# Restart pods
kubectl rollout restart deployment/core-service -n ecommerce-prod

# Check database
kubectl get pods -n database
```

---

### 2. High Latency

**Symptoms:**
- P95 latency > 1s
- Slow API responses
- User complaints

**Diagnosis:**
```bash
# Check Prometheus metrics
# Query: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Check pod resources
kubectl top pods -n ecommerce-prod

# Check database performance
# MongoDB slow query log
```

**Common Causes:**
1. **Database slow queries**
2. **Missing indexes**
3. **High CPU/memory usage**
4. **Network latency**

**Solutions:**
```bash
# Add database indexes
# Scale up pods
kubectl scale deployment/core-service --replicas=10 -n ecommerce-prod

# Increase cache TTL
# Optimize queries
```

---

### 3. Memory Leaks

**Symptoms:**
- Pods restarting frequently (OOMKilled)
- Memory usage increasing over time

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods -n ecommerce-prod

# View pod events
kubectl describe pod <pod-name> -n ecommerce-prod | grep -A 5 Events

# Check for OOMKilled
kubectl get pods -n ecommerce-prod -o json | jq '.items[] | select(.status.containerStatuses[].lastState.terminated.reason=="OOMKilled")'
```

**Solutions:**
```bash
# Increase memory limits
kubectl set resources deployment/core-service -n ecommerce-prod \
  --limits=memory=2Gi

# Enable heap dumps
# Add NODE_OPTIONS="--max-old-space-size=1536"

# Restart pods regularly
# Add liveness/readiness probes
```

---

### 4. Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- "Too many connections" errors

**Diagnosis:**
```bash
# Test connectivity
kubectl exec -n ecommerce-prod <pod-name> -- nc -zv mongodb 27017

# Check MongoDB status
kubectl get pods -n database

# Check connection pool
# View application logs
```

**Solutions:**
```bash
# Restart MongoDB
kubectl delete pod -n database mongodb-0

# Increase connection pool size
# Update application config

# Check network policies
kubectl get networkpolicies -n ecommerce-prod
```

---

### 5. Kafka Consumer Lag

**Symptoms:**
- Events not processing
- Consumer lag increasing

**Diagnosis:**
```bash
# Check consumer lag
kubectl exec -n kafka kafka-0 -- kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --group order-service-group

# Check Kafka topics
kubectl exec -n kafka kafka-0 -- kafka-topics.sh \
  --bootstrap-server localhost:9092 --list
```

**Solutions:**
```bash
# Scale up consumers
kubectl scale deployment/order-service --replicas=5 -n ecommerce-prod

# Increase partition count
# Reset consumer offset (if needed)

# Check for poison messages
# View dead letter queue
```

---

## Debugging Procedures

### Enable Debug Logging

```bash
# Update log level
kubectl set env deployment/core-service -n ecommerce-prod LOG_LEVEL=debug

# Restart pods
kubectl rollout restart deployment/core-service -n ecommerce-prod

# View debug logs
kubectl logs -f -n ecommerce-prod -l app=core-service
```

### Port Forwarding for Local Debugging

```bash
# Forward application port
kubectl port-forward -n ecommerce-prod svc/core-service 3000:3000

# Forward database port
kubectl port-forward -n database svc/mongodb 27017:27017

# Forward Redis port
kubectl port-forward -n cache svc/redis 6379:6379
```

### Exec into Pod

```bash
# Get shell access
kubectl exec -it -n ecommerce-prod <pod-name> -- /bin/sh

# Run commands
curl http://localhost:3000/health
env | grep DATABASE
```

---

## Log Analysis

### Search Logs in Kibana

```
# Find errors in last hour
level:error AND @timestamp:[now-1h TO now]

# Find specific error code
error.code:"DATABASE_CONNECTION_FAILED"

# Find slow requests
type:http_request AND duration:>1000

# Find by correlation ID
correlationId:"abc-123-def"
```

### Analyze Logs with kubectl

```bash
# Search for errors
kubectl logs -n ecommerce-prod -l app=core-service | grep ERROR

# Count error occurrences
kubectl logs -n ecommerce-prod -l app=core-service | grep ERROR | wc -l

# Find specific error
kubectl logs -n ecommerce-prod -l app=core-service | grep "Connection refused"
```

---

## Performance Troubleshooting

### CPU Profiling

```bash
# Enable CPU profiling
# Add --inspect flag to Node.js

# Capture profile
# Use Chrome DevTools
```

### Memory Profiling

```bash
# Enable heap snapshots
# Add --expose-gc flag

# Capture heap dump
# Use clinic.js or heapdump
```

### Database Query Analysis

```mongodb
// Find slow queries
db.system.profile.find({millis: {$gt: 1000}}).sort({ts: -1}).limit(10)

// Explain query
db.products.find({category: "electronics"}).explain("executionStats")

// Check indexes
db.products.getIndexes()
```

---

## Quick Reference

### Essential Commands

```bash
# View pods
kubectl get pods -n ecommerce-prod

# View logs
kubectl logs -f -n ecommerce-prod <pod-name>

# Describe pod
kubectl describe pod -n ecommerce-prod <pod-name>

# Exec into pod
kubectl exec -it -n ecommerce-prod <pod-name> -- /bin/sh

# Port forward
kubectl port-forward -n ecommerce-prod svc/core-service 3000:3000

# Scale deployment
kubectl scale deployment/core-service --replicas=5 -n ecommerce-prod

# Restart deployment
kubectl rollout restart deployment/core-service -n ecommerce-prod

# Rollback deployment
kubectl rollout undo deployment/core-service -n ecommerce-prod
```

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
