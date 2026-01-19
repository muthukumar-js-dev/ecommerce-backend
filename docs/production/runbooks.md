# Operational Runbooks

## Overview

Comprehensive operational runbooks for common production scenarios and maintenance tasks.

## Daily Operations

### Morning Health Check

**Frequency:** Daily at 9 AM

**Steps:**
1. Check system health
   ```bash
   kubectl get pods -n ecommerce-prod
   kubectl get nodes
   kubectl top nodes
   ```

2. Review overnight alerts
   ```bash
   # Check PagerDuty incidents
   # Review Slack #alerts channel
   ```

3. Check key metrics
   - Error rate < 1%
   - Response time P95 < 500ms
   - All services running
   - No pod restarts

4. Review backup status
   ```bash
   aws s3 ls s3://ecommerce-backups/mongodb/full/ | tail -5
   velero backup get | head -10
   ```

### Weekly Maintenance

**Frequency:** Every Sunday 2 AM

**Tasks:**
1. Full database backup
2. Security patches review
3. Certificate expiry check
4. Capacity review
5. Cost analysis

## Common Scenarios

### Scenario 1: High Error Rate

**Trigger:** Error rate > 5%

**Steps:**

1. **Identify Error Source (0-5 min)**
   ```bash
   # Check error distribution
   kubectl logs -n ecommerce-prod deployment/core-service --tail=100 | grep ERROR
   
   # Check error rate by endpoint
   curl http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])
   ```

2. **Check Recent Deployments (5-10 min)**
   ```bash
   kubectl rollout history deployment/core-service -n ecommerce-prod
   
   # If recent deployment, rollback
   kubectl rollout undo deployment/core-service -n ecommerce-prod
   ```

3. **Check Dependencies (10-15 min)**
   ```bash
   # Database
   kubectl exec -it mongodb-pod -n ecommerce-prod -- mongosh --eval "db.serverStatus()"
   
   # Redis
   kubectl exec -it redis-master-0 -n ecommerce-prod -- redis-cli ping
   
   # External APIs
   curl -I https://api.stripe.com/v1/charges
   ```

4. **Scale if Load-Related (15-20 min)**
   ```bash
   kubectl scale deployment core-service --replicas=10 -n ecommerce-prod
   ```

### Scenario 2: Database Slow Queries

**Trigger:** P95 query time > 1s

**Steps:**

1. **Identify Slow Queries**
   ```bash
   kubectl exec -it mongodb-pod -n ecommerce-prod -- mongosh
   db.setProfilingLevel(2)
   db.system.profile.find().sort({ts:-1}).limit(10).pretty()
   ```

2. **Check Indexes**
   ```bash
   db.products.getIndexes()
   db.orders.getIndexes()
   ```

3. **Add Missing Indexes**
   ```bash
   db.products.createIndex({ category: 1, price: 1 })
   ```

4. **Restart if Needed**
   ```bash
   kubectl rollout restart statefulset mongodb-shard-1 -n ecommerce-prod
   ```

### Scenario 3: Pod Crashes (CrashLoopBackOff)

**Trigger:** Pod in CrashLoopBackOff state

**Steps:**

1. **Check Pod Status**
   ```bash
   kubectl describe pod <pod-name> -n ecommerce-prod
   kubectl logs <pod-name> -n ecommerce-prod --previous
   ```

2. **Common Causes:**
   - Out of memory (OOMKilled)
   - Missing environment variables
   - Database connection failure
   - Port already in use

3. **Fix OOMKilled**
   ```bash
   # Increase memory limit
   kubectl set resources deployment core-service --limits=memory=2Gi -n ecommerce-prod
   ```

4. **Fix Missing Config**
   ```bash
   kubectl get configmap -n ecommerce-prod
   kubectl edit configmap app-config -n ecommerce-prod
   ```

### Scenario 4: High Memory Usage

**Trigger:** Memory utilization > 90%

**Steps:**

1. **Identify Memory Hogs**
   ```bash
   kubectl top pods -n ecommerce-prod --sort-by=memory
   ```

2. **Check for Memory Leaks**
   ```bash
   kubectl exec -it <pod-name> -n ecommerce-prod -- node --expose-gc --inspect
   ```

3. **Restart Pod**
   ```bash
   kubectl delete pod <pod-name> -n ecommerce-prod
   ```

4. **Scale Horizontally**
   ```bash
   kubectl scale deployment core-service --replicas=8 -n ecommerce-prod
   ```

### Scenario 5: Certificate Expiry

**Trigger:** Certificate expires in < 7 days

**Steps:**

1. **Check Certificate**
   ```bash
   kubectl get certificate -n ecommerce-prod
   kubectl describe certificate api-certificate -n ecommerce-prod
   ```

2. **Force Renewal**
   ```bash
   kubectl delete secret api-tls -n ecommerce-prod
   kubectl delete certificate api-certificate -n ecommerce-prod
   kubectl apply -f k8s/security/tls-config.yaml
   ```

3. **Verify New Certificate**
   ```bash
   kubectl get certificate api-certificate -n ecommerce-prod
   openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com
   ```

## Deployment Procedures

### Standard Deployment

1. **Pre-Deployment**
   ```bash
   # Backup current state
   kubectl get all -n ecommerce-prod -o yaml > backup-$(date +%Y%m%d).yaml
   
   # Tag release
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

2. **Deploy**
   ```bash
   kubectl apply -f k8s/deployments/core-service.yaml
   kubectl rollout status deployment/core-service -n ecommerce-prod
   ```

3. **Verify**
   ```bash
   kubectl get pods -n ecommerce-prod
   curl https://api.yourdomain.com/health
   ```

4. **Rollback if Needed**
   ```bash
   kubectl rollout undo deployment/core-service -n ecommerce-prod
   ```

### Blue-Green Deployment

1. **Deploy Green**
   ```bash
   kubectl apply -f k8s/deployments/core-service-green.yaml
   ```

2. **Test Green**
   ```bash
   kubectl port-forward deployment/core-service-green 8080:3000 -n ecommerce-prod
   curl http://localhost:8080/health
   ```

3. **Switch Traffic**
   ```bash
   kubectl patch service core-service -n ecommerce-prod -p '{"spec":{"selector":{"version":"green"}}}'
   ```

4. **Monitor**
   ```bash
   watch kubectl get pods -n ecommerce-prod
   ```

## Maintenance Tasks

### Database Maintenance

**Monthly Tasks:**
```bash
# Compact database
db.runCommand({ compact: 'products' })

# Rebuild indexes
db.products.reIndex()

# Check shard distribution
sh.status()
```

### Cache Maintenance

**Weekly Tasks:**
```bash
# Clear expired keys
kubectl exec -it redis-master-0 -n ecommerce-prod -- redis-cli
SCAN 0 MATCH expired:* COUNT 1000

# Check memory usage
INFO memory
```

### Log Rotation

**Daily Tasks:**
```bash
# Archive old logs
kubectl logs -n ecommerce-prod deployment/core-service --since=24h > logs-$(date +%Y%m%d).log

# Upload to S3
aws s3 cp logs-$(date +%Y%m%d).log s3://ecommerce-logs/
```

## Emergency Procedures

### Complete System Outage

1. Activate DR region
2. Update DNS
3. Notify stakeholders
4. Follow DR plan

### Data Corruption

1. Stop all writes
2. Assess damage
3. Restore from backup
4. Verify data integrity
5. Resume operations

### Security Breach

1. Isolate affected systems
2. Preserve evidence
3. Notify security team
4. Follow security runbook
5. Engage legal if needed

## Contacts

- **On-Call Engineer:** PagerDuty
- **Database Team:** db-team@company.com
- **DevOps Team:** devops@company.com
- **Security Team:** security@company.com
- **Engineering Lead:** eng-lead@company.com
