# Disaster Recovery & Backup Guide

## Overview

Comprehensive guide for backup strategies, disaster recovery procedures, and business continuity planning for the e-commerce platform.

## Quick Start

### 1. Install Velero

```bash
# Install Velero CLI
brew install velero

# Install Velero in cluster
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket ecommerce-velero-backups \
  --backup-location-config region=ap-south-1 \
  --snapshot-location-config region=ap-south-1 \
  --secret-file ./credentials-velero
```

### 2. Configure Backups

```bash
# Apply Velero backup schedules
kubectl apply -f k8s/backup/velero-config.yaml

# Verify schedules
velero schedule get
```

### 3. Run Manual Backup

```bash
# MongoDB backup
bash scripts/backup/mongodb-backup.sh

# Redis backup
bash scripts/backup/redis-backup.sh

# Kubernetes backup
velero backup create manual-backup-$(date +%Y%m%d) \
  --include-namespaces ecommerce-prod
```

## Backup Strategy

### MongoDB Backups

**File:** [`scripts/backup/mongodb-backup.sh`](file:///D:/github/ecommerce-backend/scripts/backup/mongodb-backup.sh)

**Schedule:**
- Full backup: Weekly (Sunday 2 AM)
- Incremental: Every 6 hours
- Retention: 30 days (full), 7 days (incremental)

**Features:**
- mongodump with gzip compression
- S3 upload with encryption
- Automatic cleanup
- Metadata tracking

### Redis Backups

**File:** [`scripts/backup/redis-backup.sh`](file:///D:/github/ecommerce-backend/scripts/backup/redis-backup.sh)

**Schedule:**
- Daily at 1 AM
- Retention: 7 days

**Features:**
- BGSAVE for non-blocking backup
- RDB snapshot compression
- S3 upload
- Automatic cleanup

### Kubernetes Backups (Velero)

**File:** [`k8s/backup/velero-config.yaml`](file:///D:/github/ecommerce-backend/k8s/backup/velero-config.yaml)

**Schedules:**
- Daily full backup (1 AM)
- Hourly incremental
- Retention: 30 days (full), 7 days (incremental)

**Includes:**
- All namespaces
- PersistentVolumeClaims
- Secrets and ConfigMaps
- EBS volume snapshots

## Disaster Recovery

### Recovery Objectives

- **RTO:** 1 hour
- **RPO:** 15 minutes
- **Availability:** 99.99%

### DR Scenarios

**1. Region Failure**
- RTO: 45 minutes
- Automated DNS failover
- DR region activation

**2. Database Corruption**
- RTO: 30 minutes
- Point-in-time recovery
- Data integrity verification

**3. Cluster Failure**
- RTO: 60 minutes
- New cluster creation
- GitOps restoration

### DR Plan

**File:** [`docs/disaster-recovery/README.md`](file:///D:/github/ecommerce-backend/docs/disaster-recovery/README.md)

## Restore Procedures

### MongoDB Restore

```bash
# List backups
aws s3 ls s3://ecommerce-backups/mongodb/full/

# Download
aws s3 sync s3://ecommerce-backups/mongodb/full/20260108_020000 /restore/

# Restore
mongorestore --uri="mongodb://mongos:27017" --gzip --drop /restore/
```

### Redis Restore

```bash
# Download RDB
aws s3 cp s3://ecommerce-backups/redis/redis_backup_20260108.rdb.gz /tmp/

# Decompress
gunzip /tmp/redis_backup_20260108.rdb.gz

# Copy to pod
kubectl cp /tmp/redis_backup_20260108.rdb ecommerce-prod/redis-master-0:/data/dump.rdb

# Restart
kubectl delete pod redis-master-0 -n ecommerce-prod
```

### Velero Restore

```bash
# List backups
velero backup get

# Restore
velero restore create --from-backup daily-full-backup-20260108

# Monitor
velero restore describe daily-full-backup-20260108 --details
```

## Testing

### Monthly DR Drills

**Schedule:** First Monday of each month  
**Duration:** 2 hours

**Steps:**
1. Simulate region failure
2. Activate DR procedures
3. Verify service restoration
4. Document findings

### Quarterly Full Test

**Schedule:** Last Friday of each quarter  
**Duration:** 4 hours

**Steps:**
1. Complete failover to DR region
2. Restore all data
3. Verify all services
4. Failback to primary
5. Post-test review

## Monitoring

### Backup Monitoring

```bash
# Check backup status
velero backup get
velero schedule get

# Check S3 backups
aws s3 ls s3://ecommerce-backups/mongodb/full/
aws s3 ls s3://ecommerce-backups/redis/
```

### Alerts

- Backup failure
- Backup size anomaly
- Restore test failure
- DR drill failure

## Best Practices

1. **Test Restores Regularly** - Monthly restore tests
2. **Automate Backups** - Use CronJobs and Velero schedules
3. **Encrypt Backups** - S3 server-side encryption
4. **Multi-Region** - Replicate to DR region
5. **Document Procedures** - Keep runbooks updated
6. **Monitor Backups** - Alert on failures
7. **Verify Integrity** - Check backup completeness
8. **Practice DR** - Regular DR drills
9. **Update RTO/RPO** - Review quarterly
10. **Communicate** - Clear escalation paths

## Troubleshooting

### Backup Failures

**MongoDB backup fails:**
```bash
# Check MongoDB connectivity
kubectl exec -it mongodb-pod -n ecommerce-prod -- mongosh

# Check S3 permissions
aws s3 ls s3://ecommerce-backups/
```

**Velero backup fails:**
```bash
# Check Velero logs
kubectl logs -n velero deployment/velero

# Check backup details
velero backup describe <backup-name> --details
```

### Restore Issues

**Restore taking too long:**
- Check network bandwidth
- Verify S3 download speed
- Consider parallel restore

**Data inconsistency after restore:**
- Verify backup timestamp
- Check oplog replay
- Run data integrity checks

## Additional Resources

- [Velero Documentation](https://velero.io/docs/)
- [MongoDB Backup Best Practices](https://docs.mongodb.com/manual/core/backups/)
- [AWS Backup](https://docs.aws.amazon.com/aws-backup/)
- [Disaster Recovery Planning](https://aws.amazon.com/disaster-recovery/)
