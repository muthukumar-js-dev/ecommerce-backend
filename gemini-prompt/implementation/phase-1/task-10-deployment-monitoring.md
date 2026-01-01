# Phase 1 - Task 10: Deployment & Monitoring

**Duration:** 3-4 days  
**Priority:** Critical  
**Dependencies:** Tasks 1-9 (All tasks complete)

---

## Objective

Prepare production build, deployment scripts, monitoring setup, and rollback plan for safe production deployment.

---

## Implementation Steps

### Step 1: Production Build Configuration

**Update `tsconfig.prod.json`:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false,
    "removeComments": true,
    "declaration": false
  },
  "exclude": ["tests", "**/*.test.ts", "**/*.spec.ts"]
}
```

**Create production build script in `package.json`:**

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.prod.json",
    "build:clean": "rm -rf dist && npm run build",
    "start:prod": "NODE_ENV=production node dist/main.js"
  }
}
```

### Step 2: Environment Configuration

**Create `.env.production.example`:**

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://mongo:27017/ecommerce

# JWT
JWT_SECRET=your-production-secret-here
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET=ecommerce-uploads

# Email
SENDGRID_API_KEY=...
FROM_EMAIL=noreply@yourdomain.com

# Monitoring
SENTRY_DSN=...
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Step 3: Docker Configuration

**Create `Dockerfile`:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**Create `docker-compose.prod.yml`:**

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
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
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo-data:
```

### Step 4: Deployment Scripts

**Create `scripts/deploy.sh`:**

```bash
#!/bin/bash

set -e

echo "Starting deployment..."

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run tests
npm test

# 4. Build
npm run build:clean

# 5. Backup current deployment
if [ -d "dist.backup" ]; then
  rm -rf dist.backup
fi
cp -r dist dist.backup

# 6. Stop current server
pm2 stop ecommerce-backend || true

# 7. Start new server
pm2 start dist/main.js --name ecommerce-backend

# 8. Wait for health check
sleep 5
curl -f http://localhost:3000/health || {
  echo "Health check failed, rolling back..."
  ./scripts/rollback.sh
  exit 1
}

echo "Deployment successful!"
```

**Create `scripts/rollback.sh`:**

```bash
#!/bin/bash

set -e

echo "Rolling back deployment..."

# 1. Stop current server
pm2 stop ecommerce-backend

# 2. Restore backup
rm -rf dist
mv dist.backup dist

# 3. Start server
pm2 start dist/main.js --name ecommerce-backend

# 4. Verify
sleep 5
curl -f http://localhost:3000/health

echo "Rollback successful!"
```

### Step 5: Monitoring Setup

**Install monitoring tools:**

```bash
npm install @sentry/node @sentry/tracing
npm install prom-client
```

**Create `src/infrastructure/monitoring/sentry.ts`:**

```typescript
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Application } from 'express';

export function setupSentry(app: Application): void {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app }),
      ],
      tracesSampleRate: 0.1,
    });

    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
}

export function setupSentryErrorHandler(app: Application): void {
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }
}
```

**Create `src/infrastructure/monitoring/metrics.ts`:**

```typescript
import { Router } from 'express';
import { register, collectDefaultMetrics } from 'prom-client';

// Collect default metrics
collectDefaultMetrics({ prefix: 'ecommerce_' });

export function createMetricsRoute(): Router {
  const router = Router();

  router.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  return router;
}
```

### Step 6: Health Checks

**Create `src/infrastructure/health/health-check.ts`:**

```typescript
import { Router } from 'express';
import mongoose from 'mongoose';

export function createHealthRoute(): Router {
  const router = Router();

  router.get('/health', async (req, res) => {
    const health = {
      uptime: process.uptime(),
      timestamp: Date.now(),
      status: 'healthy',
      checks: {
        database: 'unknown',
      },
    };

    try {
      // Check database connection
      if (mongoose.connection.readyState === 1) {
        health.checks.database = 'healthy';
      } else {
        health.checks.database = 'unhealthy';
        health.status = 'unhealthy';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      health.status = 'unhealthy';
      res.status(503).json(health);
    }
  });

  return router;
}
```

### Step 7: Logging Configuration

**Create `src/infrastructure/logging/logger.ts`:**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'ecommerce-backend',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup plan in place

### Deployment
- [ ] Build successful
- [ ] Docker images created
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Logs accessible

### Post-Deployment
- [ ] Verify all endpoints
- [ ] Check error rates
- [ ] Monitor performance
- [ ] Verify database connections
- [ ] Test rollback procedure

---

## Monitoring Dashboards

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate
   - Response time (P50, P95, P99)
   - Error rate
   - Active connections

2. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O

3. **Database Metrics**
   - Query performance
   - Connection pool
   - Slow queries

4. **Business Metrics**
   - User registrations
   - Orders placed
   - Revenue

---

## Deliverables

- [ ] Production build configuration
- [ ] Docker setup
- [ ] Deployment scripts
- [ ] Rollback plan
- [ ] Monitoring setup (Sentry)
- [ ] Metrics endpoint (Prometheus)
- [ ] Health check endpoint
- [ ] Logging configuration
- [ ] Deployment documentation

---

## Rollback Plan

1. **Immediate Rollback** (< 5 minutes)
   - Run `./scripts/rollback.sh`
   - Verify health check

2. **Database Rollback** (if needed)
   - Restore from backup
   - Run rollback migrations

3. **Communication**
   - Notify team
   - Update status page
   - Document incident

---

**Phase 1 Complete!** 🎉

Ready for **Phase 2: Architectural Refactor**

---

**Task Owner:** DevOps + Tech Lead  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
