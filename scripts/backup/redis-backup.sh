#!/bin/bash

# Redis Backup Script
# Backs up Redis RDB snapshots to S3

set -e

# Configuration
BACKUP_DIR="/tmp/redis-backups"
S3_BUCKET="s3://ecommerce-backups/redis"
REDIS_HOST="${REDIS_HOST:-redis-master.ecommerce-prod.svc.cluster.local}"
REDIS_PORT="${REDIS_PORT:-6379}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="redis_backup_${TIMESTAMP}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Redis Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Create backup directory
mkdir -p $BACKUP_DIR

# Trigger Redis BGSAVE
echo -e "${YELLOW}Triggering Redis BGSAVE...${NC}"
redis-cli -h $REDIS_HOST -p $REDIS_PORT BGSAVE

# Wait for BGSAVE to complete
echo -e "${YELLOW}Waiting for BGSAVE to complete...${NC}"
while [ $(redis-cli -h $REDIS_HOST -p $REDIS_PORT LASTSAVE) -eq $(redis-cli -h $REDIS_HOST -p $REDIS_PORT LASTSAVE) ]; do
    sleep 1
done

# Copy RDB file
echo -e "${YELLOW}Copying RDB file...${NC}"
kubectl cp ecommerce-prod/redis-master-0:/data/dump.rdb "$BACKUP_DIR/${BACKUP_NAME}.rdb"

# Compress backup
echo -e "${YELLOW}Compressing backup...${NC}"
gzip "$BACKUP_DIR/${BACKUP_NAME}.rdb"

# Upload to S3
echo -e "${YELLOW}Uploading to S3...${NC}"
aws s3 cp "$BACKUP_DIR/${BACKUP_NAME}.rdb.gz" "$S3_BUCKET/${BACKUP_NAME}.rdb.gz" \
    --storage-class STANDARD_IA \
    --server-side-encryption AES256

echo -e "${GREEN}✓ Backup uploaded to S3${NC}"

# Create metadata
cat > "$BACKUP_DIR/${BACKUP_NAME}_metadata.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "redis_host": "${REDIS_HOST}",
  "backup_size": "$(stat -f%z "$BACKUP_DIR/${BACKUP_NAME}.rdb.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/${BACKUP_NAME}.rdb.gz")",
  "status": "completed"
}
EOF

aws s3 cp "$BACKUP_DIR/${BACKUP_NAME}_metadata.json" "$S3_BUCKET/${BACKUP_NAME}_metadata.json"

# Cleanup local backup
rm -f "$BACKUP_DIR/${BACKUP_NAME}.rdb.gz"
rm -f "$BACKUP_DIR/${BACKUP_NAME}_metadata.json"

# Delete old backups (keep last 7 days)
echo -e "${YELLOW}Cleaning up old backups...${NC}"
aws s3 ls "$S3_BUCKET/" | while read -r line; do
    createDate=$(echo $line | awk '{print $1" "$2}')
    createDate=$(date -d "$createDate" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$createDate" +%s 2>/dev/null || echo 0)
    olderThan=$(date -d "7 days ago" +%s 2>/dev/null || date -v-7d +%s)
    if [[ $createDate -lt $olderThan ]] && [[ $createDate -ne 0 ]]; then
        fileName=$(echo $line | awk '{print $4}')
        if [[ $fileName != "" ]]; then
            echo "Removing old backup: $fileName"
            aws s3 rm "$S3_BUCKET/$fileName"
        fi
    fi
done

echo -e "${GREEN}✓ Old backups cleaned up${NC}"
echo ""
echo -e "${GREEN}Backup completed: ${BACKUP_NAME}.rdb.gz${NC}"
