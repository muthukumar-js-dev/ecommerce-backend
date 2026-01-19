# Docker Troubleshooting Guide

## Common Issues and Solutions

### Build Issues

#### Issue: npm ci fails during build

**Symptoms:**
```
npm ERR! cipm can only install packages when your package.json and package-lock.json are in sync
```

**Solution:**
```bash
# Delete package-lock.json and node_modules
rm package-lock.json
rm -rf node_modules

# Regenerate lock file
npm install

# Rebuild image
docker build -t ecommerce/core-service:latest .
```

#### Issue: Build context too large

**Symptoms:**
```
Sending build context to Docker daemon  2.5GB
```

**Solution:**
- Check `.dockerignore` file includes:
  ```
  node_modules
  dist
  .git
  tests
  coverage
  ```
- Clean up unnecessary files before building

#### Issue: Layer caching not working

**Solution:**
```bash
# Clear Docker build cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t ecommerce/core-service:latest .
```

### Runtime Issues

#### Issue: Container exits immediately

**Diagnosis:**
```bash
# Check container logs
docker logs <container-id>

# Check exit code
docker inspect <container-id> --format='{{.State.ExitCode}}'
```

**Common Causes:**
1. **Missing environment variables:**
   ```bash
   # Check required env vars
   docker run -e NODE_ENV=development -e MONGODB_URI=mongodb://... ecommerce/core-service:latest
   ```

2. **Port already in use:**
   ```bash
   # Check what's using the port
   netstat -ano | findstr :3000
   
   # Use different port
   docker run -p 3001:3000 ecommerce/core-service:latest
   ```

3. **Application crash:**
   ```bash
   # View detailed logs
   docker logs -f <container-id>
   ```

#### Issue: Health check failing

**Diagnosis:**
```bash
# Check health status
docker inspect <container-id> --format='{{.State.Health.Status}}'

# View health check logs
docker inspect <container-id> --format='{{range .State.Health.Log}}{{.Output}}{{end}}'
```

**Solutions:**
1. **Increase start period:**
   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
     CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
   ```

2. **Check health endpoint:**
   ```bash
   # Access container
   docker exec -it <container-id> sh
   
   # Test health endpoint
   wget -O- http://localhost:3000/health
   ```

### Network Issues

#### Issue: Cannot connect to MongoDB/Redis/Kafka

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**

1. **Use Docker network:**
   ```bash
   # Create network
   docker network create ecommerce-network
   
   # Run containers on same network
   docker run --network ecommerce-network --name mongo mongo:6
   docker run --network ecommerce-network -e MONGODB_URI=mongodb://mongo:27017/ecommerce ecommerce/core-service:latest
   ```

2. **Use host.docker.internal (Windows/Mac):**
   ```bash
   docker run -e MONGODB_URI=mongodb://host.docker.internal:27017/ecommerce ecommerce/core-service:latest
   ```

3. **Check service is running:**
   ```bash
   docker ps | grep mongo
   ```

#### Issue: Services can't communicate

**Diagnosis:**
```bash
# Check network
docker network inspect ecommerce-network

# Test connectivity
docker exec <container-id> ping mongo
docker exec <container-id> nc -zv mongo 27017
```

**Solution:**
```bash
# Ensure all services on same network
docker-compose up -d
```

### Docker Compose Issues

#### Issue: Services start in wrong order

**Solution:**
```yaml
services:
  core-service:
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
```

#### Issue: Volume mounts not working

**Symptoms:**
- Changes to source code not reflected in container

**Solutions:**

1. **Check volume syntax:**
   ```yaml
   volumes:
     - ./src:/app/src  # Correct
     # NOT: - src:/app/src
   ```

2. **Restart containers:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **Check file permissions (Linux):**
   ```bash
   ls -la src/
   # Should match container user (1001)
   ```

#### Issue: Port conflicts

**Symptoms:**
```
Error: bind: address already in use
```

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :3000

# Kill process or change port in docker-compose.yml
ports:
  - "3001:3000"  # Map to different host port
```

### Image Size Issues

#### Issue: Image too large (>200MB)

**Diagnosis:**
```bash
# Check image size
docker images ecommerce/core-service:latest

# Analyze layers
docker history ecommerce/core-service:latest
```

**Solutions:**

1. **Use multi-stage builds:**
   ```dockerfile
   FROM node:18-alpine AS builder
   # Build stage
   
   FROM node:18-alpine
   COPY --from=builder /app/dist ./dist
   ```

2. **Clean npm cache:**
   ```dockerfile
   RUN npm ci --only=production && npm cache clean --force
   ```

3. **Remove dev dependencies:**
   ```dockerfile
   RUN npm prune --production
   ```

4. **Use .dockerignore:**
   ```
   node_modules
   tests
   coverage
   .git
   ```

### Security Scan Issues

#### Issue: Trivy scan fails

**Solution:**
```bash
# Update Trivy database
trivy image --download-db-only

# Scan with specific severity
trivy image --severity HIGH,CRITICAL ecommerce/core-service:latest

# Ignore unfixed vulnerabilities
trivy image --ignore-unfixed ecommerce/core-service:latest
```

#### Issue: Too many vulnerabilities

**Solutions:**

1. **Update base image:**
   ```dockerfile
   FROM node:18-alpine  # Use latest patch version
   ```

2. **Update dependencies:**
   ```bash
   npm update
   npm audit fix
   ```

3. **Use specific versions:**
   ```dockerfile
   FROM node:18.19.0-alpine3.19
   ```

### Performance Issues

#### Issue: Slow build times

**Solutions:**

1. **Use build cache:**
   ```bash
   # Don't use --no-cache unless necessary
   docker build -t ecommerce/core-service:latest .
   ```

2. **Optimize layer order:**
   ```dockerfile
   # Copy package files first (changes less frequently)
   COPY package*.json ./
   RUN npm ci
   
   # Copy source code last (changes frequently)
   COPY src ./src
   ```

3. **Use BuildKit:**
   ```bash
   # Enable BuildKit
   export DOCKER_BUILDKIT=1
   docker build -t ecommerce/core-service:latest .
   ```

#### Issue: Container using too much memory

**Diagnosis:**
```bash
# Check container stats
docker stats <container-id>
```

**Solutions:**

1. **Set memory limits:**
   ```bash
   docker run -m 512m ecommerce/core-service:latest
   ```

2. **In docker-compose.yml:**
   ```yaml
   services:
     core-service:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

3. **Optimize Node.js:**
   ```bash
   # Set max old space size
   docker run -e NODE_OPTIONS="--max-old-space-size=512" ecommerce/core-service:latest
   ```

### ECR Issues

#### Issue: Authentication failed

**Solution:**
```bash
# Re-authenticate
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com
```

#### Issue: Repository does not exist

**Solution:**
```bash
# Create repository
aws ecr create-repository --repository-name ecommerce/core-service --region ap-south-1
```

#### Issue: Push denied

**Solution:**
```bash
# Check IAM permissions
aws iam get-user

# Ensure user has ecr:PutImage permission
```

## Debugging Tools

### Access Container Shell

```bash
# Docker Compose
docker-compose exec core-service sh

# Docker run
docker exec -it <container-id> sh
```

### View Logs

```bash
# Follow logs
docker logs -f <container-id>

# Last 100 lines
docker logs --tail 100 <container-id>

# Since timestamp
docker logs --since 2024-01-01T00:00:00 <container-id>
```

### Inspect Container

```bash
# Full details
docker inspect <container-id>

# Specific field
docker inspect <container-id> --format='{{.State.Status}}'
docker inspect <container-id> --format='{{.NetworkSettings.IPAddress}}'
```

### Check Resource Usage

```bash
# Real-time stats
docker stats

# Specific container
docker stats <container-id>
```

## Best Practices to Avoid Issues

1. **Always use .dockerignore**
2. **Pin dependency versions**
3. **Use health checks**
4. **Set resource limits**
5. **Use multi-stage builds**
6. **Run as non-root user**
7. **Keep images small**
8. **Scan for vulnerabilities**
9. **Use specific image tags**
10. **Test locally before pushing**

## Getting Help

1. Check Docker logs first
2. Review this troubleshooting guide
3. Search Docker documentation
4. Check GitHub issues
5. Contact DevOps team

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Troubleshooting](https://docs.docker.com/compose/faq/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
