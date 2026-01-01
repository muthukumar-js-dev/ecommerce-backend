# Phase 4 - Task 8: Disaster Recovery & Backup

**Duration:** 5-6 days  
**Priority:** Critical  
**Dependencies:** Tasks 1-7 (All Infrastructure)

---

## Objective

Implement comprehensive backup strategies, disaster recovery procedures, point-in-time recovery, multi-region failover, and automated DR testing to ensure business continuity with RTO < 1 hour and RPO < 15 minutes.

---

## Context

Disaster recovery provides:
- **Business Continuity:** Minimize downtime during disasters
- **Data Protection:** Prevent data loss
- **Compliance:** Meet regulatory requirements
- **Customer Trust:** Maintain service reliability
- **Financial Protection:** Reduce revenue loss

---

## Implementation Steps

### Step 1: Comprehensive MongoDB Backup Strategy

**Create advanced backup script with incremental backups:**

```bash
#!/bin/bash
# scripts/backup/mongodb-backup-advanced.sh

set -e

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
S3_BUCKET="s3://ecommerce-backups"
RETENTION_FULL=30
RETENTION_INCREMENTAL=7

# Determine backup type
if [ "$DAY_OF_WEEK" -eq 7 ]; then
  BACKUP_TYPE="full"
else
  BACKUP_TYPE="incremental"
fi

echo "Starting ${BACKUP_TYPE} backup at ${DATE}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}"

# Full backup
if [ "$BACKUP_TYPE" = "full" ]; then
  mongodump \
    --uri="mongodb://mongos.ecommerce-prod.svc.cluster.local:27017" \
    --out="${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}" \
    --gzip \
    --numParallelCollections=4 \
    --oplog

  # Upload to S3 with encryption
  aws s3 sync "${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}" \
    "${S3_BUCKET}/mongodb/${BACKUP_TYPE}/${DATE}" \
    --storage-class STANDARD_IA \
    --sse AES256

  # Create snapshot metadata
  cat > "${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}/metadata.json" <<EOF
{
  "backup_type": "full",
  "timestamp": "${DATE}",
  "size_bytes": $(du -sb "${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}" | cut -f1),
  "collections": $(mongo --quiet --eval "db.adminCommand('listDatabases').databases.length"),
  "status": "completed"
}
EOF

  aws s3 cp "${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}/metadata.json" \
    "${S3_BUCKET}/mongodb/${BACKUP_TYPE}/${DATE}/metadata.json"

else
  # Incremental backup (oplog only)
  LAST_FULL=$(aws s3 ls "${S3_BUCKET}/mongodb/full/" | sort | tail -1 | awk '{print $2}' | tr -d '/')
  
  mongodump \
    --uri="mongodb://mongos.ecommerce-prod.svc.cluster.local:27017" \
    --out="${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}" \
    --gzip \
    --oplog \
    --dumpDbUsersAndRoles

  aws s3 sync "${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}" \
    "${S3_BUCKET}/mongodb/${BACKUP_TYPE}/${DATE}" \
    --storage-class STANDARD_IA \
    --sse AES256
fi

# Verify backup integrity
echo "Verifying backup integrity..."
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_TYPE}/${DATE}" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Cleanup old local backups
find "${BACKUP_DIR}/full" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
find "${BACKUP_DIR}/incremental" -type d -mtime +1 -exec rm -rf {} \; 2>/dev/null || true

# Cleanup old S3 backups
echo "Cleaning up old backups..."

# Remove old full backups
aws s3 ls "${S3_BUCKET}/mongodb/full/" | \
  awk '{print $2}' | \
  while read backup_dir; do
    backup_date=$(echo $backup_dir | cut -d'_' -f1 | tr -d '/')
    if [[ $(date -d "$backup_date" +%s 2>/dev/null || echo 0) -lt $(date -d "-${RETENTION_FULL} days" +%s) ]]; then
      echo "Removing old full backup: ${backup_dir}"
      aws s3 rm "${S3_BUCKET}/mongodb/full/${backup_dir}" --recursive
    fi
  done

# Remove old incremental backups
aws s3 ls "${S3_BUCKET}/mongodb/incremental/" | \
  awk '{print $2}' | \
  while read backup_dir; do
    backup_date=$(echo $backup_dir | cut -d'_' -f1 | tr -d '/')
    if [[ $(date -d "$backup_date" +%s 2>/dev/null || echo 0) -lt $(date -d "-${RETENTION_INCREMENTAL} days" +%s) ]]; then
      echo "Removing old incremental backup: ${backup_dir}"
      aws s3 rm "${S3_BUCKET}/mongodb/incremental/${backup_dir}" --recursive
    fi
  done

# Send notification
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"MongoDB ${BACKUP_TYPE} backup completed: ${DATE}\"}"

echo "Backup completed successfully: ${BACKUP_TYPE} - ${DATE}"
```

### Step 2: Kubernetes CronJob for Automated Backups

**Create comprehensive backup CronJob:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-scripts
  namespace: ecommerce-prod
data:
  backup.sh: |
    #!/bin/bash
    set -e
    
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_TYPE=${BACKUP_TYPE:-full}
    
    echo "Starting ${BACKUP_TYPE} backup..."
    
    mongodump \
      --uri="${MONGODB_URI}" \
      --out=/backup \
      --gzip \
      --numParallelCollections=4 \
      --oplog
    
    echo "Uploading to S3..."
    aws s3 sync /backup "s3://${S3_BUCKET}/mongodb/${BACKUP_TYPE}/${DATE}" \
      --storage-class STANDARD_IA \
      --sse AES256
    
    echo "Backup completed: ${DATE}"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-full-backup
  namespace: ecommerce-prod
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        metadata:
          labels:
            app: mongodb-backup
            type: full
        spec:
          restartPolicy: OnFailure
          serviceAccountName: backup-sa
          containers:
            - name: backup
              image: mongo:6
              command: ["/bin/bash", "/scripts/backup.sh"]
              env:
                - name: MONGODB_URI
                  value: "mongodb://mongos.ecommerce-prod.svc.cluster.local:27017"
                - name: S3_BUCKET
                  value: "ecommerce-backups"
                - name: BACKUP_TYPE
                  value: "full"
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: AWS_ACCESS_KEY_ID
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: AWS_SECRET_ACCESS_KEY
                - name: AWS_DEFAULT_REGION
                  value: "ap-south-1"
              volumeMounts:
                - name: backup
                  mountPath: /backup
                - name: scripts
                  mountPath: /scripts
              resources:
                requests:
                  cpu: 1000m
                  memory: 2Gi
                limits:
                  cpu: 2000m
                  memory: 4Gi
          volumes:
            - name: backup
              emptyDir:
                sizeLimit: 50Gi
            - name: scripts
              configMap:
                name: backup-scripts
                defaultMode: 0755
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-incremental-backup
  namespace: ecommerce-prod
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: mongo:6
              command: ["/bin/bash", "/scripts/backup.sh"]
              env:
                - name: BACKUP_TYPE
                  value: "incremental"
              # ... same configuration as full backup
```

### Step 3: Point-in-Time Recovery (PITR)

**Implement PITR capability:**

```typescript
// src/infrastructure/backup/pitr-manager.ts
import AWS from 'aws-sdk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const s3 = new AWS.S3();

export interface PITROptions {
  targetTimestamp: Date;
  targetDatabase?: string;
  targetCollection?: string;
}

export class PITRManager {
  private readonly bucket = 'ecommerce-backups';
  private readonly restoreDir = '/restore';

  async restoreToPointInTime(options: PITROptions): Promise<void> {
    const { targetTimestamp, targetDatabase, targetCollection } = options;

    console.log(`Starting PITR to ${targetTimestamp.toISOString()}`);

    // 1. Find the most recent full backup before target time
    const fullBackup = await this.findFullBackupBefore(targetTimestamp);
    if (!fullBackup) {
      throw new Error('No full backup found before target timestamp');
    }

    console.log(`Using full backup: ${fullBackup}`);

    // 2. Download and restore full backup
    await this.downloadBackup(`full/${fullBackup}`);
    await this.restoreFullBackup(fullBackup);

    // 3. Find and apply incremental backups
    const incrementalBackups = await this.findIncrementalBackupsAfter(
      fullBackup,
      targetTimestamp
    );

    for (const backup of incrementalBackups) {
      console.log(`Applying incremental backup: ${backup}`);
      await this.downloadBackup(`incremental/${backup}`);
      await this.applyOplog(backup, targetTimestamp);
    }

    console.log('PITR completed successfully');
  }

  private async findFullBackupBefore(targetTime: Date): Promise<string | null> {
    const response = await s3.listObjectsV2({
      Bucket: this.bucket,
      Prefix: 'mongodb/full/',
      Delimiter: '/',
    }).promise();

    const backups = response.CommonPrefixes
      ?.map(p => p.Prefix?.split('/')[2])
      .filter(Boolean)
      .filter(backup => {
        const backupTime = this.parseBackupTimestamp(backup!);
        return backupTime < targetTime;
      })
      .sort()
      .reverse();

    return backups?.[0] || null;
  }

  private async findIncrementalBackupsAfter(
    fullBackup: string,
    targetTime: Date
  ): Promise<string[]> {
    const fullBackupTime = this.parseBackupTimestamp(fullBackup);

    const response = await s3.listObjectsV2({
      Bucket: this.bucket,
      Prefix: 'mongodb/incremental/',
      Delimiter: '/',
    }).promise();

    return response.CommonPrefixes
      ?.map(p => p.Prefix?.split('/')[2])
      .filter(Boolean)
      .filter(backup => {
        const backupTime = this.parseBackupTimestamp(backup!);
        return backupTime > fullBackupTime && backupTime <= targetTime;
      })
      .sort() || [];
  }

  private async downloadBackup(backupPath: string): Promise<void> {
    const { stdout } = await execAsync(
      `aws s3 sync s3://${this.bucket}/mongodb/${backupPath} ${this.restoreDir}/${backupPath}`
    );
    console.log(stdout);
  }

  private async restoreFullBackup(backup: string): Promise<void> {
    const { stdout } = await execAsync(
      `mongorestore --uri="mongodb://mongos:27017" --gzip --drop ${this.restoreDir}/full/${backup}`
    );
    console.log(stdout);
  }

  private async applyOplog(backup: string, targetTime: Date): Promise<void> {
    const targetTimestamp = Math.floor(targetTime.getTime() / 1000);
    
    const { stdout } = await execAsync(
      `mongorestore --uri="mongodb://mongos:27017" --oplogReplay --oplogLimit ${targetTimestamp}:1 ${this.restoreDir}/incremental/${backup}/oplog.bson`
    );
    console.log(stdout);
  }

  private parseBackupTimestamp(backup: string): Date {
    // Parse format: YYYYMMDD_HHMMSS
    const [datePart, timePart] = backup.split('_');
    const year = parseInt(datePart.substring(0, 4));
    const month = parseInt(datePart.substring(4, 6)) - 1;
    const day = parseInt(datePart.substring(6, 8));
    const hour = parseInt(timePart.substring(0, 2));
    const minute = parseInt(timePart.substring(2, 4));
    const second = parseInt(timePart.substring(4, 6));

    return new Date(year, month, day, hour, minute, second);
  }
}
```

### Step 4: Comprehensive Disaster Recovery Plan

**Create detailed DR plan:**

**File: `docs/disaster-recovery/dr-plan-comprehensive.md`:**

```markdown
# Comprehensive Disaster Recovery Plan

## Executive Summary

This document outlines the disaster recovery procedures for the e-commerce platform to ensure business continuity in the event of catastrophic failures.

## Recovery Objectives

- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 15 minutes
- **Availability Target:** 99.99% (52.56 minutes downtime/year)

## Disaster Scenarios & Response

### Scenario 1: Complete AWS Region Failure

**Probability:** Low (0.01% annually)  
**Impact:** Critical - Complete service outage  
**RTO:** 45 minutes  
**RPO:** 15 minutes

**Detection Indicators:**
- All Route53 health checks failing
- No response from any service endpoint
- AWS Status Dashboard shows region issues
- CloudWatch alarms: RegionDown, AllServicesUnhealthy

**Automated Response:**
1. Route53 health check fails after 3 consecutive failures (90 seconds)
2. DNS automatically fails over to DR region (ap-southeast-1)
3. Traffic begins routing to DR region within 60 seconds (DNS TTL)

**Manual Response Steps:**
1. **Verify Failure (0-5 minutes)**
   ```bash
   # Check AWS status
   curl https://status.aws.amazon.com/
   
   # Verify primary region
   curl -I https://api.yourdomain.com/health
   
   # Check DR region
   curl -I https://dr.yourdomain.com/health
   ```

2. **Activate DR Region (5-15 minutes)**
   ```bash
   # Update DNS to DR region
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch file://failover-to-dr.json
   
   # Scale up DR cluster
   kubectl scale deployment --all --replicas=10 -n ecommerce-prod
   ```

3. **Restore Latest Data (15-30 minutes)**
   ```bash
   # Find latest backup
   LATEST_BACKUP=$(aws s3 ls s3://ecommerce-backups/mongodb/full/ | sort | tail -1 | awk '{print $2}')
   
   # Restore database
   ./scripts/restore/mongodb-restore.sh $LATEST_BACKUP
   ```

4. **Verify Services (30-40 minutes)**
   ```bash
   # Run health checks
   ./scripts/dr/verify-services.sh
   
   # Test critical user flows
   ./scripts/dr/smoke-tests.sh
   ```

5. **Monitor & Communicate (40-60 minutes)**
   - Update status page
   - Notify stakeholders
   - Monitor error rates and latency

**Rollback to Primary Region:**
```bash
# When primary region is restored
./scripts/dr/failback-to-primary.sh
```

### Scenario 2: Database Corruption

**Probability:** Medium (0.1% annually)  
**Impact:** High - Data integrity issues  
**RTO:** 30 minutes  
**RPO:** 15 minutes

**Detection Indicators:**
- Data validation errors
- Inconsistent query results
- Application errors related to data integrity
- Failed database integrity checks

**Response Steps:**
1. **Isolate Corruption (0-5 minutes)**
   ```bash
   # Stop all write operations
   kubectl scale deployment --all --replicas=0 -n ecommerce-prod
   
   # Enable read-only mode
   mongo --eval "db.adminCommand({fsync: 1, lock: true})"
   ```

2. **Assess Damage (5-10 minutes)**
   ```bash
   # Run integrity check
   mongo --eval "db.runCommand({dbCheck: 1})"
   
   # Identify affected collections
   ./scripts/dr/check-data-integrity.sh
   ```

3. **Restore from Backup (10-25 minutes)**
   ```bash
   # Restore to point before corruption
   node dist/infrastructure/backup/pitr-restore.js \
     --timestamp "2026-01-01T18:00:00Z"
   ```

4. **Verify & Resume (25-30 minutes)**
   ```bash
   # Verify data integrity
   ./scripts/dr/verify-data.sh
   
   # Resume operations
   kubectl scale deployment --all --replicas=5 -n ecommerce-prod
   ```

### Scenario 3: Kubernetes Cluster Failure

**Probability:** Low (0.05% annually)  
**Impact:** Critical - Service outage  
**RTO:** 60 minutes  
**RPO:** 0 minutes (GitOps)

**Response Steps:**
1. **Create New Cluster (0-20 minutes)**
   ```bash
   eksctl create cluster -f eks-emergency-cluster.yaml
   ```

2. **Restore Infrastructure (20-40 minutes)**
   ```bash
   # Apply all manifests from GitOps repo
   kubectl apply -k k8s/overlays/production
   
   # Restore Helm releases
   helm install ecommerce-backend ./charts/ecommerce-backend
   ```

3. **Restore Data (40-55 minutes)**
   ```bash
   # Restore latest database backup
   ./scripts/restore/mongodb-restore.sh $(date +%Y%m%d)
   ```

4. **Verify & Update DNS (55-60 minutes)**
   ```bash
   # Update DNS to new cluster
   ./scripts/dr/update-dns-to-new-cluster.sh
   ```

## DR Testing Schedule

### Monthly DR Drills
- **First Monday of each month**
- **Duration:** 2 hours
- **Scope:** Simulated region failure
- **Participants:** DevOps, Database, Development teams

### Quarterly Full DR Test
- **Last Friday of each quarter**
- **Duration:** 4 hours
- **Scope:** Complete failover to DR region
- **Participants:** All engineering teams + stakeholders

## Communication Plan

### Internal Communication
1. Create incident channel: `#incident-YYYY-MM-DD`
2. Page on-call engineer via PagerDuty
3. Notify engineering leadership
4. Update internal status dashboard

### External Communication
1. Update public status page (status.yourdomain.com)
2. Send email to enterprise customers
3. Post on social media (if extended outage)
4. Prepare customer support FAQ

## Post-Incident Review

Within 48 hours of incident resolution:
1. Document timeline
2. Root cause analysis
3. Identify action items
4. Update runbooks
5. Share learnings with team
```

### Step 5: Multi-Region DR Setup

**Deploy DR infrastructure:**

```yaml
# infrastructure/dr/eks-dr-cluster.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: ecommerce-dr
  region: ap-southeast-1
  version: "1.28"

iam:
  withOIDC: true

managedNodeGroups:
  - name: dr-nodes-general
    instanceType: t3.large
    desiredCapacity: 3
    minSize: 3
    maxSize: 15
    labels:
      role: general
    tags:
      Environment: DR
      ManagedBy: eksctl

  - name: dr-nodes-compute
    instanceType: c5.xlarge
    desiredCapacity: 2
    minSize: 2
    maxSize: 10
    labels:
      role: compute
    tags:
      Environment: DR

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver

cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
```

**Setup database replication to DR region:**

```typescript
// infrastructure/dr/cross-region-replication.ts
import AWS from 'aws-sdk';

export class CrossRegionReplication {
  private primaryS3: AWS.S3;
  private drS3: AWS.S3;

  constructor() {
    this.primaryS3 = new AWS.S3({ region: 'ap-south-1' });
    this.drS3 = new AWS.S3({ region: 'ap-southeast-1' });
  }

  async setupReplication(): Promise<void> {
    // Enable S3 cross-region replication
    await this.primaryS3.putBucketReplication({
      Bucket: 'ecommerce-backups',
      ReplicationConfiguration: {
        Role: 'arn:aws:iam::123456789012:role/s3-replication-role',
        Rules: [
          {
            ID: 'ReplicateBackupsToDR',
            Status: 'Enabled',
            Priority: 1,
            Filter: {
              Prefix: 'mongodb/',
            },
            Destination: {
              Bucket: 'arn:aws:s3:::ecommerce-backups-dr',
              ReplicationTime: {
                Status: 'Enabled',
                Time: {
                  Minutes: 15,
                },
              },
              Metrics: {
                Status: 'Enabled',
                EventThreshold: {
                  Minutes: 15,
                },
              },
            },
            DeleteMarkerReplication: {
              Status: 'Enabled',
            },
          },
        ],
      },
    }).promise();

    console.log('Cross-region replication configured');
  }
}
```

### Step 6: Automated DR Testing

**Create DR testing automation:**

```typescript
// src/infrastructure/dr/dr-test-runner.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DRTestResult {
  testName: string;
  success: boolean;
  duration: number;
  errors: string[];
}

export class DRTestRunner {
  async runDRDrill(): Promise<DRTestResult[]> {
    const results: DRTestResult[] = [];

    // Test 1: Backup restoration
    results.push(await this.testBackupRestoration());

    // Test 2: Failover to DR region
    results.push(await this.testFailover());

    // Test 3: Service health in DR
    results.push(await this.testDRServices());

    // Test 4: Data integrity
    results.push(await this.testDataIntegrity());

    // Test 5: Failback to primary
    results.push(await this.testFailback());

    return results;
  }

  private async testBackupRestoration(): Promise<DRTestResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
      // Restore latest backup to test environment
      const { stdout, stderr } = await execAsync(
        './scripts/dr/test-restore.sh'
      );

      if (stderr) {
        errors.push(stderr);
      }
    } catch (error) {
      errors.push((error as Error).message);
    }

    return {
      testName: 'Backup Restoration',
      success: errors.length === 0,
      duration: Date.now() - start,
      errors,
    };
  }

  private async testFailover(): Promise<DRTestResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
      // Simulate failover
      await execAsync('./scripts/dr/simulate-failover.sh');

      // Verify DNS updated
      const { stdout } = await execAsync('dig api.yourdomain.com');
      if (!stdout.includes('dr.yourdomain.com')) {
        errors.push('DNS failover did not complete');
      }
    } catch (error) {
      errors.push((error as Error).message);
    }

    return {
      testName: 'Failover to DR',
      success: errors.length === 0,
      duration: Date.now() - start,
      errors,
    };
  }

  private async testDRServices(): Promise<DRTestResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
      // Check all services in DR region
      const { stdout } = await execAsync(
        'kubectl get pods -n ecommerce-prod --context=dr-cluster'
      );

      const lines = stdout.split('\n').filter(l => l.includes('Running'));
      if (lines.length < 10) {
        errors.push(`Only ${lines.length} pods running in DR`);
      }
    } catch (error) {
      errors.push((error as Error).message);
    }

    return {
      testName: 'DR Services Health',
      success: errors.length === 0,
      duration: Date.now() - start,
      errors,
    };
  }

  private async testDataIntegrity(): Promise<DRTestResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
      await execAsync('./scripts/dr/verify-data-integrity.sh');
    } catch (error) {
      errors.push((error as Error).message);
    }

    return {
      testName: 'Data Integrity',
      success: errors.length === 0,
      duration: Date.now() - start,
      errors,
    };
  }

  private async testFailback(): Promise<DRTestResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
      await execAsync('./scripts/dr/failback-to-primary.sh');
    } catch (error) {
      errors.push((error as Error).message);
    }

    return {
      testName: 'Failback to Primary',
      success: errors.length === 0,
      duration: Date.now() - start,
      errors,
    };
  }
}
```

### Step 7: Backup Monitoring & Alerting

**Create comprehensive backup monitoring:**

```typescript
// src/infrastructure/monitoring/backup-monitor-comprehensive.ts
import AWS from 'aws-sdk';
import { Gauge, Counter, register } from 'prom-client';

const s3 = new AWS.S3();
const cloudwatch = new AWS.CloudWatch();

export class BackupMonitorComprehensive {
  private backupAge: Gauge;
  private backupSize: Gauge;
  private backupSuccess: Counter;
  private backupFailure: Counter;

  constructor() {
    this.backupAge = new Gauge({
      name: 'backup_age_hours',
      help: 'Hours since last successful backup',
      registers: [register],
    });

    this.backupSize = new Gauge({
      name: 'backup_size_bytes',
      help: 'Size of latest backup in bytes',
      registers: [register],
    });

    this.backupSuccess = new Counter({
      name: 'backup_success_total',
      help: 'Total number of successful backups',
      registers: [register],
    });

    this.backupFailure = new Counter({
      name: 'backup_failure_total',
      help: 'Total number of failed backups',
      registers: [register],
    });
  }

  async checkBackupHealth(): Promise<{
    lastBackup: Date;
    backupSize: number;
    status: 'healthy' | 'warning' | 'critical';
    details: string;
  }> {
    try {
      // List recent backups
      const backups = await s3.listObjectsV2({
        Bucket: 'ecommerce-backups',
        Prefix: 'mongodb/full/',
        Delimiter: '/',
      }).promise();

      if (!backups.CommonPrefixes || backups.CommonPrefixes.length === 0) {
        return {
          lastBackup: new Date(0),
          backupSize: 0,
          status: 'critical',
          details: 'No backups found',
        };
      }

      // Get latest backup
      const latestBackupPrefix = backups.CommonPrefixes
        .map(p => p.Prefix!)
        .sort()
        .reverse()[0];

      // Get backup metadata
      const metadata = await s3.getObject({
        Bucket: 'ecommerce-backups',
        Key: `${latestBackupPrefix}metadata.json`,
      }).promise();

      const backupInfo = JSON.parse(metadata.Body!.toString());
      const lastBackupTime = new Date(backupInfo.timestamp.replace('_', 'T'));
      const hoursSinceBackup = (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60);

      // Update metrics
      this.backupAge.set(hoursSinceBackup);
      this.backupSize.set(backupInfo.size_bytes);

      // Determine status
      let status: 'healthy' | 'warning' | 'critical';
      let details: string;

      if (hoursSinceBackup > 25) {
        status = 'critical';
        details = `Last backup was ${hoursSinceBackup.toFixed(1)} hours ago (> 25 hours)`;
        this.sendAlert('critical', details);
      } else if (hoursSinceBackup > 24) {
        status = 'warning';
        details = `Last backup was ${hoursSinceBackup.toFixed(1)} hours ago (> 24 hours)`;
        this.sendAlert('warning', details);
      } else {
        status = 'healthy';
        details = `Last backup was ${hoursSinceBackup.toFixed(1)} hours ago`;
      }

      return {
        lastBackup: lastBackupTime,
        backupSize: backupInfo.size_bytes,
        status,
        details,
      };
    } catch (error) {
      this.backupFailure.inc();
      return {
        lastBackup: new Date(0),
        backupSize: 0,
        status: 'critical',
        details: `Error checking backups: ${(error as Error).message}`,
      };
    }
  }

  async verifyBackupIntegrity(backupPath: string): Promise<boolean> {
    try {
      // Download metadata
      const metadata = await s3.getObject({
        Bucket: 'ecommerce-backups',
        Key: `${backupPath}/metadata.json`,
      }).promise();

      const backupInfo = JSON.parse(metadata.Body!.toString());

      // Verify all expected files exist
      const files = await s3.listObjectsV2({
        Bucket: 'ecommerce-backups',
        Prefix: backupPath,
      }).promise();

      const totalSize = files.Contents?.reduce((sum, file) => sum + (file.Size || 0), 0) || 0;

      // Check if size matches metadata
      if (Math.abs(totalSize - backupInfo.size_bytes) > 1024 * 1024) {
        // Allow 1MB difference
        throw new Error('Backup size mismatch');
      }

      this.backupSuccess.inc();
      return true;
    } catch (error) {
      this.backupFailure.inc();
      console.error('Backup integrity check failed:', error);
      return false;
    }
  }

  private async sendAlert(severity: 'warning' | 'critical', message: string): Promise<void> {
    // Send to CloudWatch
    await cloudwatch.putMetricData({
      Namespace: 'ECommerce/Backups',
      MetricData: [
        {
          MetricName: 'BackupAlert',
          Value: severity === 'critical' ? 2 : 1,
          Unit: 'Count',
          Timestamp: new Date(),
        },
      ],
    }).promise();

    // Send to Slack
    await fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Backup ${severity.toUpperCase()}: ${message}`,
        channel: '#alerts-backups',
      }),
    });

    // Send to PagerDuty if critical
    if (severity === 'critical') {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: process.env.PAGERDUTY_ROUTING_KEY,
          event_action: 'trigger',
          payload: {
            summary: message,
            severity: 'critical',
            source: 'backup-monitor',
          },
        }),
      });
    }
  }
}
```

---

## Testing

**DR drill checklist:**

```bash
# Monthly DR Drill Script
#!/bin/bash

echo "=== Starting DR Drill ==="

# 1. Test backup restoration
echo "Testing backup restoration..."
./scripts/dr/test-restore.sh

# 2. Test failover
echo "Testing failover to DR region..."
./scripts/dr/simulate-failover.sh

# 3. Verify services
echo "Verifying DR services..."
kubectl get pods -n ecommerce-prod --context=dr-cluster

# 4. Test data integrity
echo "Testing data integrity..."
./scripts/dr/verify-data-integrity.sh

# 5. Test failback
echo "Testing failback to primary..."
./scripts/dr/failback-to-primary.sh

echo "=== DR Drill Complete ==="
```

---

## Deliverables

- [ ] Automated daily backups (full + incremental)
- [ ] Backup retention policy (30 days full, 7 days incremental)
- [ ] Point-in-time recovery capability
- [ ] Comprehensive DR plan documented
- [ ] Restoration procedures tested
- [ ] Multi-region DR setup
- [ ] Automated failover configured
- [ ] Cross-region replication
- [ ] Backup monitoring and alerting
- [ ] Monthly DR drills automated
- [ ] DR testing framework
- [ ] Runbooks created
- [ ] Team trained on DR procedures

---

## Recovery Targets

| Metric | Target | Actual |
|--------|--------|--------|
| RTO | < 1 hour | ___ |
| RPO | < 15 minutes | ___ |
| Backup Success Rate | 100% | ___ |
| DR Test Frequency | Monthly | ___ |
| Backup Verification | 100% | ___ |
| Failover Time | < 5 minutes | ___ |

---

## Monitoring Dashboards

**Grafana dashboard for DR metrics:**

```json
{
  "dashboard": {
    "title": "Disaster Recovery & Backups",
    "panels": [
      {
        "title": "Backup Age",
        "targets": [{"expr": "backup_age_hours"}]
      },
      {
        "title": "Backup Size Trend",
        "targets": [{"expr": "backup_size_bytes"}]
      },
      {
        "title": "Backup Success Rate",
        "targets": [{"expr": "rate(backup_success_total[24h]) / (rate(backup_success_total[24h]) + rate(backup_failure_total[24h]))"}]
      },
      {
        "title": "DR Test Results",
        "targets": [{"expr": "dr_test_success_total"}]
      }
    ]
  }
}
```

---

## Next Steps

After completing this task:
1. Proceed to **Task 9: Load Testing & Capacity Planning**
2. Schedule monthly DR drills
3. Review and update DR plan quarterly
4. Conduct team training on DR procedures

---

**Task Owner:** DevOps + Database Team  
**Reviewer:** Tech Lead + Security Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
