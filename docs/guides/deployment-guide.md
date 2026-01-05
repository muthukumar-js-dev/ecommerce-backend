# Deployment Guide

## Overview

This guide covers deploying the e-commerce backend to production environments.

## Prerequisites

- Node.js 18+ installed
- MongoDB 6+ instance
- AWS account (for S3)
- Stripe account (for payments)
- Domain name and SSL certificate

## Environment Setup

### 1. Environment Variables

Create `.env.production` file:

```bash
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://username:password@host:27017/ecommerce?authSource=admin
MONGODB_MAX_POOL_SIZE=50
MONGODB_MIN_POOL_SIZE=10

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-ecommerce-bucket

# Email (SendGrid/SES)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_API_KEY=your_email_api_key

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/ecommerce/app.log

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your_newrelic_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### 2. Security Checklist

- [ ] Change all default secrets
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable helmet middleware
- [ ] Configure CSP headers
- [ ] Set secure cookie flags
- [ ] Disable directory listing
- [ ] Remove development dependencies

## Deployment Options

### Option 1: Traditional Server (PM2)

#### 1. Install Dependencies

```bash
# On server
cd /var/www/ecommerce-backend
npm ci --production
```

#### 2. Build Application

```bash
npm run build
```

#### 3. Install PM2

```bash
npm install -g pm2
```

#### 4. Create PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ecommerce-api',
    script: './dist/main.js',
    instances: 4,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/ecommerce/error.log',
    out_file: '/var/log/ecommerce/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### 5. Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### 6. PM2 Commands

```bash
# View logs
pm2 logs ecommerce-api

# Monitor
pm2 monit

# Restart
pm2 restart ecommerce-api

# Stop
pm2 stop ecommerce-api

# Delete
pm2 delete ecommerce-api

# Reload (zero-downtime)
pm2 reload ecommerce-api
```

### Option 2: Docker

#### 1. Create Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy built app
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/ecommerce
    env_file:
      - .env.production
    depends_on:
      - mongo
    restart: unless-stopped
    networks:
      - ecommerce-network

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped
    networks:
      - ecommerce-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - ecommerce-network

volumes:
  mongo-data:

networks:
  ecommerce-network:
    driver: bridge
```

#### 3. Build and Run

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Option 3: Kubernetes

#### 1. Create Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecommerce-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ecommerce-api
  template:
    metadata:
      labels:
        app: ecommerce-api
    spec:
      containers:
      - name: api
        image: your-registry/ecommerce-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: ecommerce-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### 2. Create Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: ecommerce-api-service
spec:
  selector:
    app: ecommerce-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### 3. Deploy

```bash
# Apply configurations
kubectl apply -f k8s/

# Check status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/ecommerce-api

# Scale
kubectl scale deployment ecommerce-api --replicas=5
```

## Nginx Configuration

### Reverse Proxy Setup

```nginx
# /etc/nginx/sites-available/ecommerce-api
upstream api_backend {
    least_conn;
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/api.access.log;
    error_log /var/log/nginx/api.error.log;

    # Proxy Settings
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

## Database Setup

### MongoDB Production Configuration

```javascript
// MongoDB connection with production settings
const mongoOptions = {
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  retryReads: true,
  readPreference: 'primaryPreferred',
  w: 'majority',
  journal: true
};
```

### Database Indexes

```bash
# Create indexes for performance
mongosh "mongodb://host:27017/ecommerce" --eval "
  db.users.createIndex({ email: 1 }, { unique: true });
  db.users.createIndex({ role: 1 });
  db.products.createIndex({ sku: 1 }, { unique: true });
  db.products.createIndex({ category: 1, isActive: 1 });
  db.orders.createIndex({ userId: 1, createdAt: -1 });
  db.orders.createIndex({ orderNumber: 1 }, { unique: true });
"
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
MONGODB_URI="mongodb://user:pass@host:27017"

# Create backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"

# Compress
tar -czf "$BACKUP_DIR/$DATE.tar.gz" "$BACKUP_DIR/$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$DATE.tar.gz" s3://your-backup-bucket/mongodb/

# Keep only last 7 days locally
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
```

## Monitoring

### Health Check Endpoint

```typescript
// src/infrastructure/http/controllers/health.controller.ts
export class HealthController {
  async check(req: Request, res: Response): Promise<void> {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mongodb: await this.checkMongoDB(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };

    const statusCode = health.mongodb === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  }

  private async checkMongoDB(): Promise<string> {
    try {
      await mongoose.connection.db.admin().ping();
      return 'ok';
    } catch (error) {
      return 'error';
    }
  }
}
```

### Logging

```typescript
// Production logging configuration
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## Zero-Downtime Deployment

### Blue-Green Deployment

```bash
# 1. Deploy to green environment
pm2 start ecosystem.config.js --name ecommerce-api-green

# 2. Health check green
curl http://localhost:3001/health

# 3. Switch nginx to green
# Update nginx config to point to green

# 4. Reload nginx
sudo nginx -s reload

# 5. Stop blue
pm2 stop ecommerce-api-blue

# 6. Rename green to blue for next deployment
pm2 delete ecommerce-api-blue
pm2 restart ecommerce-api-green --name ecommerce-api-blue
```

### Rolling Update (PM2)

```bash
# Zero-downtime reload
pm2 reload ecommerce-api
```

## Troubleshooting

### Common Issues

**High Memory Usage:**
```bash
# Check memory
pm2 monit

# Restart with memory limit
pm2 restart ecommerce-api --max-memory-restart 1G
```

**Database Connection Issues:**
```bash
# Check MongoDB status
systemctl status mongod

# Check connections
mongosh --eval "db.serverStatus().connections"
```

**Slow Response Times:**
```bash
# Check logs
pm2 logs ecommerce-api --lines 100

# Monitor performance
pm2 monit
```

## Security Hardening

### 1. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Fail2Ban

```bash
# Install fail2ban
sudo apt-get install fail2ban

# Configure for nginx
sudo nano /etc/fail2ban/jail.local
```

### 3. SSL/TLS

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Performance Optimization

### 1. Enable Compression

```nginx
# In nginx.conf
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. Caching

```nginx
# Cache static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Connection Pooling

Already configured in MongoDB options (maxPoolSize: 50).

## Rollback Procedure

```bash
# 1. Stop current version
pm2 stop ecommerce-api

# 2. Restore previous version
git checkout <previous-commit>
npm ci --production
npm run build

# 3. Restart
pm2 restart ecommerce-api

# 4. Verify
curl http://localhost:3000/health
```

## Related Documentation

- [Developer Guide](./developer-guide.md)
- [Testing Guide](./testing-guide.md)
- [Architecture Overview](../architecture/overview.md)
