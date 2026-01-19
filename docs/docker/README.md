# Docker Setup Guide

## Overview

This guide covers the Docker containerization setup for the e-commerce backend microservices, including local development with Docker Compose and production deployment to container registries.

## Prerequisites

- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- Docker Compose V2
- Git
- (Optional) Trivy for security scanning
- (Optional) AWS CLI for ECR access

## Quick Start

### Local Development with Docker Compose

1. **Clone the repository:**
   ```bash
   cd D:\github\ecommerce-backend
   ```

2. **Build all services:**
   ```bash
   docker-compose build
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Check service status:**
   ```bash
   docker-compose ps
   ```

5. **View logs:**
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f core-service
   ```

6. **Test health endpoints:**
   ```bash
   curl http://localhost:3000/health  # Core service
   curl http://localhost:3001/health  # Payment service
   curl http://localhost:3002/health  # Notification service
   ```

7. **Stop all services:**
   ```bash
   docker-compose down
   ```

## Service Architecture

### Core Service
- **Port:** 3000
- **Dependencies:** MongoDB, Redis, Kafka
- **Image Size:** ~150MB
- **Health Check:** `/health`

### Payment Service
- **Port:** 3001
- **Dependencies:** MongoDB, Kafka
- **Image Size:** ~140MB
- **Health Check:** `/health`

### Notification Service
- **Port:** 3002
- **Dependencies:** Kafka
- **Image Size:** ~145MB
- **Health Check:** `/health`

## Building Images

### Build Individual Service

```bash
# Core service
docker build -t ecommerce/core-service:latest .

# Payment service
docker build -t ecommerce/payment-service:latest ./payment-service

# Notification service
docker build -t ecommerce/notification-service:latest ./notification-service
```

### Build All Services

```bash
bash scripts/docker/build-all.sh latest local-registry
```

### Build with Version Tag

```bash
bash scripts/docker/build-and-push.sh core-service v1.0.0 local-registry
```

## Image Optimization

Our Docker images use several optimization techniques:

1. **Multi-stage builds** - Separate build and runtime stages
2. **Alpine Linux** - Minimal base image (~5MB vs ~900MB)
3. **Layer caching** - Efficient COPY command ordering
4. **Production dependencies only** - `npm ci --only=production`
5. **Cache cleaning** - `npm cache clean --force`
6. **Non-root user** - Security best practice
7. **dumb-init** - Proper signal handling

### Size Comparison

| Service | Before | After | Reduction |
|---------|--------|-------|-----------|
| Core | ~1.2GB | ~150MB | 87.5% |
| Payment | ~1.1GB | ~140MB | 87.3% |
| Notification | ~1.15GB | ~145MB | 87.4% |

## Security

### Non-Root User

All containers run as non-root user `nodejs` (UID 1001):

```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs
```

### Security Scanning

Scan images for vulnerabilities using Trivy:

```bash
# Install Trivy
choco install trivy

# Scan image
trivy image --severity HIGH,CRITICAL ecommerce/core-service:latest

# Generate report
trivy image --format json --output report.json ecommerce/core-service:latest
```

### Health Checks

All images include health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

## Container Registry

### AWS ECR Setup

1. **Create repositories:**
   ```bash
   aws ecr create-repository --repository-name ecommerce/core-service --region ap-south-1
   aws ecr create-repository --repository-name ecommerce/payment-service --region ap-south-1
   aws ecr create-repository --repository-name ecommerce/notification-service --region ap-south-1
   ```

2. **Login to ECR:**
   ```bash
   aws ecr get-login-password --region ap-south-1 | \
     docker login --username AWS --password-stdin \
     123456789012.dkr.ecr.ap-south-1.amazonaws.com
   ```

3. **Build and push:**
   ```bash
   bash scripts/docker/build-and-push.sh core-service v1.0.0 123456789012.dkr.ecr.ap-south-1.amazonaws.com
   ```

## Development Workflow

### Hot Reload Development

The Docker Compose setup includes volume mounts for hot-reload:

```yaml
volumes:
  - ./src:/app/src
  - ./dist:/app/dist
```

### Debugging

1. **Access container shell:**
   ```bash
   docker-compose exec core-service sh
   ```

2. **View container logs:**
   ```bash
   docker-compose logs -f core-service
   ```

3. **Inspect container:**
   ```bash
   docker inspect ecommerce-core
   ```

## Environment Variables

### Required Variables

Set these in `.env` file:

```env
# Stripe (Payment Service)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid (Notification Service)
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@example.com
```

### Optional Variables

```env
NODE_ENV=development
LOG_LEVEL=debug
```

## Testing

### Test All Images

```bash
bash scripts/docker/test-images.sh
```

### Manual Testing

```bash
# Build test image
docker build -t ecommerce/core-service:test .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/ecommerce \
  ecommerce/core-service:test

# Test health endpoint
curl http://localhost:3000/health
```

## CI/CD Integration

### GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/docker-build.yml`) that:

1. Builds all services on push to main/develop
2. Runs Trivy security scans
3. Uploads scan results to GitHub Security
4. Pushes images to ECR (on main/develop branches)

### Required Secrets

Configure these in GitHub repository settings:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Best Practices

1. **Always use specific version tags** - Avoid `latest` in production
2. **Scan images regularly** - Use Trivy or similar tools
3. **Keep images small** - Remove unnecessary dependencies
4. **Use .dockerignore** - Exclude unnecessary files
5. **Run as non-root** - Security best practice
6. **Include health checks** - For container orchestration
7. **Use dumb-init** - Proper signal handling
8. **Layer caching** - Order COPY commands efficiently

## Common Commands

```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart service
docker-compose restart [service-name]

# Remove all containers and volumes
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build

# Scale service
docker-compose up -d --scale core-service=3
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Next Steps

1. Deploy to Kubernetes using Helm charts (see `k8s/` directory)
2. Setup monitoring with Prometheus and Grafana
3. Configure CI/CD pipeline for automated deployments
4. Implement image signing and verification

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
