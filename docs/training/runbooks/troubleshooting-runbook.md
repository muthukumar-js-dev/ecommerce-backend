# Troubleshooting Runbook

## Common Issues

### 1. High CPU Usage

**Symptoms**: Pods consuming >80% CPU

**Diagnosis**:
```bash
kubectl top pods -n ecommerce
kubectl describe pod <pod-name> -n ecommerce
```

**Resolution**:
- Check for infinite loops in code
- Review recent deployments
- Scale horizontally: `kubectl scale deployment main-app --replicas=5`
- Increase CPU limits in deployment

### 2. Database Connection Failures

**Symptoms**: "MongoError: connection refused"

**Diagnosis**:
```bash
# Check MongoDB pods
kubectl get pods -n database

# Check connection string
kubectl get secret mongodb-secret -n ecommerce -o yaml
```

**Resolution**:
- Verify MongoDB is running
- Check network policies
- Verify credentials
- Check connection pool settings

### 3. Kafka Consumer Lag

**Symptoms**: Events not being processed

**Diagnosis**:
```bash
# Check consumer lag
kafka-consumer-groups --bootstrap-server kafka:9092 --describe --group payment-service-group
```

**Resolution**:
- Scale consumers
- Check for errors in consumer logs
- Verify topic partitions
- Increase processing timeout

### 4. Memory Leaks

**Symptoms**: Pods restarting frequently (OOMKilled)

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n ecommerce | grep -A 5 "Last State"
```

**Resolution**:
- Review heap dumps
- Check for unclosed connections
- Increase memory limits
- Fix memory leaks in code

### 5. API Gateway Errors

**Symptoms**: 502/503 errors from Kong

**Diagnosis**:
```bash
curl http://kong-admin:8001/status
kubectl logs -f deployment/kong -n ecommerce
```

**Resolution**:
- Check upstream service health
- Verify route configuration
- Check rate limiting settings
- Review Kong logs

## Emergency Procedures

### Complete System Outage

1. Check infrastructure: `kubectl get nodes`
2. Check all pods: `kubectl get pods --all-namespaces`
3. Check critical services: MongoDB, Kafka, Redis
4. Review recent changes
5. Rollback if needed
6. Escalate to on-call engineer

### Data Corruption

1. Stop affected services
2. Restore from backup
3. Verify data integrity
4. Resume services
5. Monitor closely
