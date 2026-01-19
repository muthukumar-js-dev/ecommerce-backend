# Disaster Recovery Plan

## Executive Summary

This document outlines the disaster recovery procedures for the e-commerce platform to ensure business continuity with RTO < 1 hour and RPO < 15 minutes.

## Recovery Objectives

- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 15 minutes
- **Availability Target:** 99.99% (52.56 minutes downtime/year)

## Disaster Scenarios

### Scenario 1: Complete Region Failure

**Probability:** Low (0.01% annually)  
**Impact:** Critical - Complete service outage  
**RTO:** 45 minutes  
**RPO:** 15 minutes

**Detection:**
- All health checks failing
- No response from any endpoint
- AWS Status Dashboard shows region issues

**Response Steps:**

1. **Verify Failure (0-5 min)**
   ```bash
   curl -I https://api.yourdomain.com/health
   curl -I https://dr.yourdomain.com/health
   ```

2. **Activate DR Region (5-15 min)**
   ```bash
   # Failover DNS to DR region
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch file://failover-to-dr.json
   
   # Scale up DR cluster
   kubectl scale deployment --all --replicas=10 -n ecommerce-prod
   ```

3. **Restore Latest Data (15-30 min)**
   ```bash
   # Find and restore latest backup
   LATEST=$(aws s3 ls s3://ecommerce-backups/mongodb/full/ | sort | tail -1 | awk '{print $2}')
   ./scripts/restore/mongodb-restore.sh $LATEST
   ```

4. **Verify Services (30-40 min)**
   ```bash
   ./scripts/dr/verify-services.sh
   ./scripts/dr/smoke-tests.sh
   ```

5. **Monitor & Communicate (40-60 min)**
   - Update status page
   - Notify stakeholders
   - Monitor metrics

### Scenario 2: Database Corruption

**Probability:** Medium (0.1% annually)  
**Impact:** High - Data integrity issues  
**RTO:** 30 minutes  
**RPO:** 15 minutes

**Response Steps:**

1. **Isolate Corruption (0-5 min)**
   ```bash
   # Stop writes
   kubectl scale deployment --all --replicas=0 -n ecommerce-prod
   
   # Enable read-only
   mongo --eval "db.adminCommand({fsync: 1, lock: true})"
   ```

2. **Assess Damage (5-10 min)**
   ```bash
   mongo --eval "db.runCommand({dbCheck: 1})"
   ./scripts/dr/check-data-integrity.sh
   ```

3. **Restore from Backup (10-25 min)**
   ```bash
   # Point-in-time restore
   node dist/infrastructure/backup/pitr-restore.js \
     --timestamp "2026-01-08T18:00:00Z"
   ```

4. **Verify & Resume (25-30 min)**
   ```bash
   ./scripts/dr/verify-data.sh
   kubectl scale deployment --all --replicas=5 -n ecommerce-prod
   ```

### Scenario 3: Kubernetes Cluster Failure

**Probability:** Low (0.05% annually)  
**Impact:** Critical - Service outage  
**RTO:** 60 minutes  
**RPO:** 0 minutes (GitOps)

**Response Steps:**

1. **Create New Cluster (0-20 min)**
   ```bash
   eksctl create cluster -f eks-emergency-cluster.yaml
   ```

2. **Restore Infrastructure (20-40 min)**
   ```bash
   kubectl apply -k k8s/overlays/production
   helm install ecommerce-backend ./charts/ecommerce-backend
   ```

3. **Restore Data (40-55 min)**
   ```bash
   velero restore create --from-backup daily-full-backup
   ```

4. **Update DNS (55-60 min)**
   ```bash
   ./scripts/dr/update-dns-to-new-cluster.sh
   ```

## Backup Strategy

### MongoDB Backups
- **Full Backup:** Weekly (Sunday 2 AM)
- **Incremental:** Every 6 hours
- **Retention:** Full 30 days, Incremental 7 days
- **Location:** S3 (ap-south-1 + ap-southeast-1 replica)

### Redis Backups
- **Frequency:** Daily (1 AM)
- **Method:** BGSAVE + RDB snapshot
- **Retention:** 7 days
- **Location:** S3

### Kubernetes Backups (Velero)
- **Full Backup:** Daily (1 AM)
- **Incremental:** Hourly
- **Retention:** Full 30 days, Incremental 7 days
- **Includes:** All namespaces, PVCs, secrets, configmaps

## DR Testing Schedule

### Monthly DR Drills
- **When:** First Monday of each month
- **Duration:** 2 hours
- **Scope:** Simulated region failure
- **Participants:** DevOps, Database, Development teams

### Quarterly Full DR Test
- **When:** Last Friday of each quarter
- **Duration:** 4 hours
- **Scope:** Complete failover to DR region
- **Participants:** All engineering teams + stakeholders

## Communication Plan

### Internal
1. Create incident channel: `#incident-YYYY-MM-DD`
2. Page on-call engineer (PagerDuty)
3. Notify engineering leadership
4. Update internal dashboard

### External
1. Update status page (status.yourdomain.com)
2. Email enterprise customers
3. Social media (if extended outage)
4. Customer support FAQ

## Recovery Procedures

### MongoDB Restore

```bash
# List available backups
aws s3 ls s3://ecommerce-backups/mongodb/full/

# Download backup
aws s3 sync s3://ecommerce-backups/mongodb/full/20260108_020000 /restore/

# Restore
mongorestore --uri="mongodb://mongos:27017" --gzip --drop /restore/
```

### Redis Restore

```bash
# Download RDB
aws s3 cp s3://ecommerce-backups/redis/redis_backup_20260108_010000.rdb.gz /tmp/

# Decompress
gunzip /tmp/redis_backup_20260108_010000.rdb.gz

# Copy to Redis pod
kubectl cp /tmp/redis_backup_20260108_010000.rdb ecommerce-prod/redis-master-0:/data/dump.rdb

# Restart Redis
kubectl delete pod redis-master-0 -n ecommerce-prod
```

### Velero Restore

```bash
# List backups
velero backup get

# Restore specific backup
velero restore create --from-backup daily-full-backup-20260108

# Check restore status
velero restore describe daily-full-backup-20260108
```

## Runbook Links

- [MongoDB Backup & Restore](./runbooks/mongodb-backup-restore.md)
- [Redis Backup & Restore](./runbooks/redis-backup-restore.md)
- [Velero Operations](./runbooks/velero-operations.md)
- [DR Failover Procedures](./runbooks/dr-failover.md)
- [DR Failback Procedures](./runbooks/dr-failback.md)

## Post-Incident Review

Within 48 hours of incident resolution:
1. Document timeline
2. Root cause analysis
3. Identify action items
4. Update runbooks
5. Share learnings with team

## Contacts

- **On-Call Engineer:** PagerDuty
- **Database Team:** db-team@company.com
- **DevOps Team:** devops@company.com
- **Engineering Lead:** eng-lead@company.com
- **CTO:** cto@company.com
