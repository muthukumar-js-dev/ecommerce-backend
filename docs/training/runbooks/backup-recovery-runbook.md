# Backup and Recovery Runbook

## Database Backup

### Manual Backup

```bash
# MongoDB backup
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

# Compress backup
tar -czf backup-$(date +%Y%m%d).tar.gz /backups/$(date +%Y%m%d)
```

### Automated Backup (Velero)

```bash
# Create backup
velero backup create ecommerce-backup-$(date +%Y%m%d) \
  --include-namespaces ecommerce

# List backups
velero backup get

# Check backup status
velero backup describe ecommerce-backup-20260108
```

## Recovery Procedures

### Database Restore

```bash
# Restore from backup
mongorestore --uri="$MONGODB_URI" /backups/20260108

# Verify data
mongo --eval "db.users.count()"
```

### Kubernetes Restore

```bash
# Restore from Velero backup
velero restore create --from-backup ecommerce-backup-20260108

# Monitor restore
velero restore get
velero restore describe <restore-name>
```

## Disaster Recovery

### Complete System Recovery

1. Restore infrastructure (Terraform/CloudFormation)
2. Restore Kubernetes cluster
3. Restore databases from backups
4. Restore application deployments
5. Verify all services
6. Update DNS if needed

### RTO/RPO Targets

- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 hour

## Testing Recovery

```bash
# Test restore monthly
bash scripts/backup/test-restore.sh
```
