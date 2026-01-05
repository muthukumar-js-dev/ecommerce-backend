#!/bin/bash

# E-Commerce Backend Rollback Script
# This script handles rolling back to the previous deployment

set -e

echo "========================================="
echo "E-Commerce Backend Rollback"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
APP_NAME="ecommerce-backend"
BACKUP_DIR="./backups"
HEALTH_CHECK_URL="http://localhost:3000/health"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Step 1: Find latest backup
log_info "Finding latest backup..."

if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup directory not found!"
    exit 1
fi

LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log_error "No backup found!"
    exit 1
fi

log_info "Latest backup: $LATEST_BACKUP"

# Step 2: Stop current application
log_info "Stopping current application..."
pm2 stop $APP_NAME 2>/dev/null || log_warn "Application not running"

# Step 3: Remove current dist
log_info "Removing current deployment..."
if [ -d "dist" ]; then
    rm -rf dist
    log_info "✓ Current deployment removed"
fi

# Step 4: Restore from backup
log_info "Restoring from backup..."
cp -r "$BACKUP_DIR/$LATEST_BACKUP" dist || {
    log_error "Failed to restore from backup!"
    exit 1
}
log_info "✓ Backup restored"

# Step 5: Start application
log_info "Starting application..."
pm2 start dist/main.js --name $APP_NAME --env production || {
    log_error "Failed to start application!"
    exit 1
}

# Step 6: Health check
log_info "Performing health check..."
sleep 5

if curl -f -s $HEALTH_CHECK_URL > /dev/null 2>&1; then
    log_info "✓ Health check passed"
else
    log_error "Health check failed!"
    log_error "Manual intervention required"
    exit 1
fi

# Step 7: Save PM2 configuration
pm2 save

log_info "========================================="
log_info "✓ Rollback completed successfully!"
log_info "========================================="
log_info "Restored from: $LATEST_BACKUP"
log_info "Application: $APP_NAME"
log_info "Status: Running"
log_info "========================================="

pm2 logs $APP_NAME --lines 20 --nostream

exit 0
