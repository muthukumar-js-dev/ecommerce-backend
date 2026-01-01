# Phase 4 - Task 2: Containerize All Services

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Task 1 (Kubernetes Setup)

---

## Objective

Create optimized, secure Docker images for all microservices using multi-stage builds, implement container best practices, and setup automated image builds.

---

## Context

Containerization provides:
- **Consistency:** Same environment across dev, staging, production
- **Isolation:** Process and resource isolation
- **Portability:** Run anywhere Docker runs
- **Efficiency:** Lightweight compared to VMs
- **Scalability:** Easy horizontal scaling

---

## Implementation Steps

### Step 1: Core Service Dockerfile

**Create `Dockerfile` for core service:**

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 3: Production
FROM node:18-alpine
LABEL maintainer="backend-team@example.com"
LABEL version="1.0.0"
LABEL description="E-Commerce Core Service"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["dumb-init", "node", "dist/main.js"]
```

### Step 2: .dockerignore File

**Create `.dockerignore`:**

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.*
dist
coverage
.vscode
.idea
*.md
tests
.github
Dockerfile
docker-compose*.yml
k8s
.dockerignore
```

### Step 3: Payment Service Dockerfile

**Create `payment-service/Dockerfile`:**

```dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
RUN apk add --no-cache dumb-init curl
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["dumb-init", "node", "dist/main.js"]
```

### Step 4: Notification Service Dockerfile

**Create `notification-service/Dockerfile`:**

```dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/templates ./templates
COPY package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3002

CMD ["dumb-init", "node", "dist/main.js"]
```

### Step 5: Docker Compose for Local Development

**Create `docker-compose.yml`:**

```yaml
version: '3.8'

services:
  core-service:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/ecommerce
      - REDIS_HOST=redis
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - mongo
      - redis
      - kafka
    volumes:
      - ./src:/app/src
    command: npm run dev

  payment-service:
    build:
      context: ./payment-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/payment-service
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - mongo
      - kafka

  notification-service:
    build:
      context: ./notification-service
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - kafka

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

volumes:
  mongo-data:
  redis-data:
```

### Step 6: Container Registry Setup

**AWS ECR Setup:**

```bash
# Create ECR repositories
aws ecr create-repository --repository-name ecommerce/core-service
aws ecr create-repository --repository-name ecommerce/payment-service
aws ecr create-repository --repository-name ecommerce/notification-service

# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com
```

### Step 7: Build and Push Scripts

**Create `scripts/docker/build-and-push.sh`:**

```bash
#!/bin/bash

set -e

SERVICE_NAME=${1}
VERSION=${2:-latest}
REGISTRY=${3:-123456789012.dkr.ecr.ap-south-1.amazonaws.com}

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: ./build-and-push.sh <service-name> [version] [registry]"
  exit 1
fi

IMAGE_NAME="${REGISTRY}/ecommerce/${SERVICE_NAME}"
IMAGE_TAG="${IMAGE_NAME}:${VERSION}"
IMAGE_LATEST="${IMAGE_NAME}:latest"

echo "Building ${SERVICE_NAME}..."

# Build image
if [ "$SERVICE_NAME" = "core-service" ]; then
  docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} .
else
  docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} ./${SERVICE_NAME}
fi

# Security scan
echo "Scanning image for vulnerabilities..."
trivy image --severity HIGH,CRITICAL ${IMAGE_TAG}

# Push to registry
echo "Pushing to registry..."
docker push ${IMAGE_TAG}
docker push ${IMAGE_LATEST}

echo "Successfully built and pushed ${IMAGE_TAG}"
```

**Make executable:**

```bash
chmod +x scripts/docker/build-and-push.sh
```

### Step 8: Image Optimization

**Optimization techniques applied:**

1. **Multi-stage builds:** Separate build and runtime stages
2. **Alpine Linux:** Smaller base image (~5MB vs ~900MB)
3. **Layer caching:** Order COPY commands efficiently
4. **Production dependencies only:** `npm ci --only=production`
5. **Cache cleaning:** `npm cache clean --force`
6. **Non-root user:** Security best practice
7. **Health checks:** Built-in container health monitoring

**Size comparison:**
- Before optimization: ~1.2GB
- After optimization: ~150MB
- Reduction: 87.5%

### Step 9: Security Scanning

**Install Trivy:**

```bash
choco install trivy
```

**Scan images:**

```bash
# Scan for vulnerabilities
trivy image ecommerce/core-service:latest

# Scan with specific severity
trivy image --severity HIGH,CRITICAL ecommerce/core-service:latest

# Generate report
trivy image --format json --output report.json ecommerce/core-service:latest
```

### Step 10: CI/CD Integration

**GitHub Actions workflow:**

**Create `.github/workflows/docker-build.yml`:**

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: ap-south-1
  ECR_REGISTRY: 123456789012.dkr.ecr.ap-south-1.amazonaws.com

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [core-service, payment-service, notification-service]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build image
        run: |
          if [ "${{ matrix.service }}" = "core-service" ]; then
            docker build -t ${{ env.ECR_REGISTRY }}/ecommerce/${{ matrix.service }}:${{ github.sha }} .
          else
            docker build -t ${{ env.ECR_REGISTRY }}/ecommerce/${{ matrix.service }}:${{ github.sha }} ./${{ matrix.service }}
          fi

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.ECR_REGISTRY }}/ecommerce/${{ matrix.service }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Push image
        if: github.event_name == 'push'
        run: |
          docker tag ${{ env.ECR_REGISTRY }}/ecommerce/${{ matrix.service }}:${{ github.sha }} \
            ${{ env.ECR_REGISTRY }}/ecommerce/${{ matrix.service }}:latest
          docker push ${{ env.ECR_REGISTRY }}/ecommerce/${{ matrix.service }}:${{ github.sha }}
          docker push ${{ env.ECR_REGISTRY }}/ecommerce/${{ matrix.service }}:latest
```

---

## Testing

**Test locally:**

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f core-service

# Test health endpoint
curl http://localhost:3000/health

# Stop services
docker-compose down
```

**Test individual service:**

```bash
# Build
docker build -t ecommerce/core-service:test .

# Run
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/ecommerce \
  ecommerce/core-service:test

# Inspect
docker inspect ecommerce/core-service:test

# Check size
docker images ecommerce/core-service:test
```

---

## Deliverables

- [ ] Dockerfiles for all services
- [ ] Multi-stage builds implemented
- [ ] .dockerignore files
- [ ] Docker Compose for local dev
- [ ] Container registry setup (ECR)
- [ ] Build and push scripts
- [ ] Security scanning with Trivy
- [ ] CI/CD pipeline
- [ ] Image optimization (< 200MB)
- [ ] Documentation

---

## Best Practices Checklist

- [ ] Use official base images
- [ ] Multi-stage builds
- [ ] Non-root user
- [ ] Health checks
- [ ] Proper signal handling (dumb-init)
- [ ] Minimal layers
- [ ] Security scanning
- [ ] Version tagging
- [ ] .dockerignore file
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 3: Implement Redis Caching**
2. Deploy containers to Kubernetes
3. Setup automated builds

---

**Task Owner:** DevOps + Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
