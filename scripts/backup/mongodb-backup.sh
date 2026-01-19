#!/bin/bash

# MongoDB Backup Script
# Backs up MongoDB database to S3

set -e

# Configuration
BACKUP_DIR="/tmp/mongodb-backups"
S3_BUCKET="s3://ecommerce-backups/mongodb"
MONGODB_URI="${MONGODB_URI:-mongodb://mongos.ecommerce-prod.svc.cluster.local:27017}"
DATABASE="ecommerce"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MongoDB Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
echo -e "${YELLOW}Creating backup...${NC}"
mongodump --uri="$MONGODB_URI" --db=$DATABASE --out="$BACKUP_DIR/$BACKUP_NAME"
echo -e "${GREEN}✓ Backup created${NC}"

# Compress backup
echo -e "${YELLOW}Compressing backup...${NC}"
cd $BACKUP_DIR
tar -czf "${BACKUP_NAME}.tar.gz" $BACKUP_NAME
rm -rf $BACKUP_NAME
echo -e "${GREEN}✓ Backup compressed${NC}"

# Upload to S3
echo -e "${YELLOW}Uploading to S3...${NC}"
aws s3 cp "${BACKUP_NAME}.tar.gz" "$S3_BUCKET/${BACKUP_NAME}.tar.gz"
echo -e "${GREEN}✓ Backup uploaded to S3${NC}"

# Cleanup local backup
rm -f "${BACKUP_NAME}.tar.gz"

# Delete old backups (keep last 30 days)
echo -e "${YELLOW}Cleaning up old backups...${NC}"
aws s3 ls "$S3_BUCKET/" | while read -r line; do
    createDate=$(echo $line | awk '{print $1" "$2}')
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "30 days ago" +%s)
    if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo $line | awk '{print $4}')
        if [[ $fileName != "" ]]; then
            aws s3 rm "$S3_BUCKET/$fileName"
        fi
    fi
done
echo -e "${GREEN}✓ Old backups cleaned up${NC}"

echo ""
echo -e "${GREEN}Backup completed: ${BACKUP_NAME}.tar.gz${NC}"
