# Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Build Process](#build-process)
- [Deployment Methods](#deployment-methods)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Node.js >= 18.x
- MongoDB >= 6.0
- Docker >= 20.x (for containerized deployment)
- PM2 (for process management)
- Git

### Required Access
- Production server SSH access
- MongoDB connection string
- AWS credentials (for S3)
- Stripe API keys
- Environment variables

---

## Environment Setup

### 1. Create Production Environment File

Copy the example file:
```bash
cp .env.production.example .env.production
```

### 2. Configure Environment Variables

Edit `.env.production` with your production values:

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://your-production-mongo:27017/ecommerce

# JWT
JWT_SECRET=your-secure-random-secret-key
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# AWS
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. Security Checklist

- [ ] Change all default secrets
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Restrict CORS to your domain only
- [ ] Use production Stripe keys
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up SSL certificates

---

## Build Process

### Local Build

```bash
# Install dependencies
npm ci

# Run tests
npm test

# Type check
npm run type-check

# Build for production
npm run build:clean
```

### Verify Build

```bash
# Check dist folder
ls -la dist/

# Test production build locally
NODE_ENV=production node dist/main.js
```

---

## Deployment Methods

### Method 1: Docker Deployment (Recommended)

#### Build Docker Image

```bash
# Build image
docker build -t ecommerce-backend:latest .

# Verify image
docker images | grep ecommerce-backend
```

#### Run with Docker Compose

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

#### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

---

### Method 2: PM2 Deployment

#### Install PM2

```bash
npm install -g pm2
```

#### Deploy with Script

```bash
# Make scripts executable
chmod +x scripts/deploy.sh
chmod +x scripts/rollback.sh

# Run deployment
./scripts/deploy.sh
```

#### Manual PM2 Commands

```bash
# Start application
pm2 start dist/main.js --name ecommerce-backend --env production

# Stop application
pm2 stop ecommerce-backend

# Restart application
pm2 restart ecommerce-backend

# View logs
pm2 logs ecommerce-backend

# Monitor
pm2 monit

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

---

### Method 3: Kubernetes Deployment

#### Create Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecommerce-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ecommerce-backend
  template:
    metadata:
      labels:
        app: ecommerce-backend
    spec:
      containers:
      - name: backend
        image: ecommerce-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: ecommerce-secrets
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Deploy to Kubernetes

```bash
# Create secrets
kubectl create secret generic ecommerce-secrets --from-env-file=.env.production

# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods
kubectl logs -f deployment/ecommerce-backend
```

---

## Health Checks

### Endpoints

#### 1. Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": 1704357600000,
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "memory": {
      "status": "healthy",
      "usage": 256,
      "limit": 512,
      "percentage": 50
    }
  }
}
```

#### 2. Readiness Probe
```bash
curl http://localhost:3000/ready
```

#### 3. Liveness Probe
```bash
curl http://localhost:3000/live
```

### Automated Health Monitoring

Add to cron for periodic checks:
```bash
# Check every 5 minutes
*/5 * * * * curl -f http://localhost:3000/health || /path/to/alert-script.sh
```

---

## Monitoring

### Application Logs

#### PM2 Logs
```bash
# View logs
pm2 logs ecommerce-backend

# View error logs only
pm2 logs ecommerce-backend --err

# Clear logs
pm2 flush
```

#### Docker Logs
```bash
# Follow logs
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

### Metrics

Access Prometheus metrics:
```bash
curl http://localhost:3000/metrics
```

### Error Tracking

If Sentry is configured, errors are automatically tracked at:
```
https://sentry.io/organizations/your-org/issues/
```

---

## Rollback Procedure

### Automatic Rollback

If deployment fails health checks, automatic rollback occurs.

### Manual Rollback

```bash
# Run rollback script
./scripts/rollback.sh
```

### PM2 Rollback

```bash
# Stop current
pm2 stop ecommerce-backend

# Restore from backup
cp -r backups/backup_YYYYMMDD_HHMMSS dist

# Start
pm2 start dist/main.js --name ecommerce-backend
```

### Docker Rollback

```bash
# Stop current containers
docker-compose down

# Use previous image
docker run -d --name ecommerce-backend ecommerce-backend:previous

# Or rebuild from previous commit
git checkout previous-commit
docker build -t ecommerce-backend:rollback .
docker-compose up -d
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Type check passing (`npm run type-check`)
- [ ] Lint check passing (`npm run lint`)
- [ ] Code reviewed and approved
- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Team notified

### Deployment

- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Run tests
- [ ] Build application
- [ ] Create backup
- [ ] Deploy new version
- [ ] Health check passes
- [ ] Verify endpoints
- [ ] Check logs for errors

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify database connections
- [ ] Test critical user flows
- [ ] Monitor resource usage
- [ ] Update documentation
- [ ] Notify team of completion

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
pm2 logs ecommerce-backend --err
```

**Common issues:**
- Missing environment variables
- Database connection failure
- Port already in use
- Build errors

**Solutions:**
```bash
# Check environment
cat .env.production

# Test database connection
mongosh $MONGODB_URI

# Check port
lsof -i :3000

# Rebuild
npm run build:clean
```

### Health Check Failing

**Check database:**
```bash
mongosh $MONGODB_URI --eval "db.runCommand({ping: 1})"
```

**Check application:**
```bash
curl -v http://localhost:3000/health
```

**Check logs:**
```bash
pm2 logs ecommerce-backend
```

### High Memory Usage

**Check memory:**
```bash
pm2 monit
```

**Restart application:**
```bash
pm2 restart ecommerce-backend
```

**Increase memory limit:**
```bash
pm2 start dist/main.js --name ecommerce-backend --max-memory-restart 1G
```

### Database Connection Issues

**Verify connection string:**
```bash
echo $MONGODB_URI
```

**Test connection:**
```bash
mongosh $MONGODB_URI
```

**Check firewall:**
```bash
telnet mongo-host 27017
```

---

## Performance Optimization

### PM2 Cluster Mode

```bash
pm2 start dist/main.js -i max --name ecommerce-backend
```

### Nginx Reverse Proxy

```nginx
upstream backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Security Best Practices

1. **Use HTTPS** - Always use SSL/TLS in production
2. **Environment Variables** - Never commit secrets to git
3. **Rate Limiting** - Configure appropriate rate limits
4. **CORS** - Restrict to your domain only
5. **Helmet** - Security headers already configured
6. **Updates** - Keep dependencies updated
7. **Monitoring** - Set up alerts for errors
8. **Backups** - Regular database backups
9. **Access Control** - Limit SSH and database access
10. **Audit Logs** - Monitor access and changes

---

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Monitor response times
- Verify backups

**Weekly:**
- Review security alerts
- Check disk space
- Update dependencies (if needed)

**Monthly:**
- Performance review
- Security audit
- Database optimization

---

## Support

For deployment issues:
1. Check this guide
2. Review application logs
3. Check health endpoints
4. Contact DevOps team
5. Create incident ticket

---

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [API Documentation](http://localhost:3000/api-docs)
