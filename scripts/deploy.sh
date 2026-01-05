#!/bin/bash

# E-Commerce Backend Deployment Script
# This script handles the deployment of the application to production

set -e  # Exit on error

echo "========================================="
echo "E-Commerce Backend Deployment"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ecommerce-backend"
BACKUP_DIR="./backups"
HEALTH_CHECK_URL="http://localhost:3000/health"
MAX_HEALTH_CHECK_ATTEMPTS=10

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Pre-deployment checks
log_info "Running pre-deployment checks..."

if [ ! -f ".env.production" ]; then
    log_error ".env.production file not found!"
    log_info "Please create .env.production from .env.production.example"
    exit 1
fi

log_info "✓ Environment file exists"

# Step 2: Pull latest code
log_info "Pulling latest code from repository..."
git pull origin main || {
    log_error "Failed to pull latest code"
    exit 1
}
log_info "✓ Code updated"

# Step 3: Install dependencies
log_info "Installing dependencies..."
npm ci || {
    log_error "Failed to install dependencies"
    exit 1
}
log_info "✓ Dependencies installed"

# Step 4: Run tests
log_info "Running tests..."
npm run test:ci || {
    log_error "Tests failed! Aborting deployment."
    exit 1
}
log_info "✓ All tests passed"

# Step 5: Type check
log_info "Running type check..."
npm run type-check || {
    log_error "Type check failed! Aborting deployment."
    exit 1
}
log_info "✓ Type check passed"

# Step 6: Build application
log_info "Building application..."
npm run build:clean || {
    log_error "Build failed!"
    exit 1
}
log_info "✓ Build successful"

# Step 7: Create backup
log_info "Creating backup of current deployment..."
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}"

if [ -d "dist" ]; then
    cp -r dist "$BACKUP_DIR/$BACKUP_NAME" || log_warn "Backup creation failed"
    log_info "✓ Backup created: $BACKUP_DIR/$BACKUP_NAME"
else
    log_warn "No existing dist directory to backup"
fi

# Step 8: Stop current application (if using PM2)
log_info "Stopping current application..."
pm2 stop $APP_NAME 2>/dev/null || log_warn "Application not running"

# Step 9: Start new application
log_info "Starting new application..."
pm2 start dist/main.js --name $APP_NAME --env production || {
    log_error "Failed to start application"
    log_info "Attempting rollback..."
    ./scripts/rollback.sh
    exit 1
}

# Step 10: Health check
log_info "Performing health check..."
ATTEMPT=1
HEALTH_CHECK_PASSED=false

while [ $ATTEMPT -le $MAX_HEALTH_CHECK_ATTEMPTS ]; do
    log_info "Health check attempt $ATTEMPT/$MAX_HEALTH_CHECK_ATTEMPTS..."
    
    if curl -f -s $HEALTH_CHECK_URL > /dev/null 2>&1; then
        HEALTH_CHECK_PASSED=true
        break
    fi
    
    sleep 3
    ATTEMPT=$((ATTEMPT + 1))
done

if [ "$HEALTH_CHECK_PASSED" = false ]; then
    log_error "Health check failed after $MAX_HEALTH_CHECK_ATTEMPTS attempts"
    log_info "Rolling back deployment..."
    ./scripts/rollback.sh
    exit 1
fi

log_info "✓ Health check passed"

# Step 11: Save PM2 configuration
log_info "Saving PM2 configuration..."
pm2 save

log_info "========================================="
log_info "✓ Deployment completed successfully!"
log_info "========================================="
log_info "Application: $APP_NAME"
log_info "Status: Running"
log_info "Health: OK"
log_info "Backup: $BACKUP_DIR/$BACKUP_NAME"
log_info "========================================="

# Show application logs
log_info "Recent logs:"
pm2 logs $APP_NAME --lines 20 --nostream

exit 0
