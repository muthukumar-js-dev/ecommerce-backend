# Developer Setup Guide

## Welcome!

This guide will help you set up your local development environment for the E-Commerce Platform.

---

## Prerequisites

### Required Software

- **Node.js:** 20.x LTS ([Download](https://nodejs.org/))
- **Docker:** Latest version ([Download](https://www.docker.com/))
- **kubectl:** Latest version ([Install](https://kubernetes.io/docs/tasks/tools/))
- **Git:** Latest version

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Docker
  - Kubernetes

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ecommerce-backend.git
cd ecommerce-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
# Required variables:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
# - STRIPE_SECRET_KEY
```

### 4. Start Local Services

```bash
# Start MongoDB and Redis with Docker Compose
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

### 6. Seed Database (Optional)

```bash
npm run db:seed
```

---

## Running the Application

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# Application will be available at http://localhost:3000
```

### Production Mode

```bash
# Build application
npm run build

# Start production server
npm start
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Test Coverage

```bash
npm run test:coverage
```

---

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Formatting

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format:fix
```

### Type Checking

```bash
npm run type-check
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write code
- Add tests
- Update documentation

### 3. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature"

# Commit message format:
# feat: new feature
# fix: bug fix
# docs: documentation
# test: tests
# refactor: code refactoring
```

### 4. Push and Create PR

```bash
# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# - Add description
# - Link related issues
# - Request reviewers
```

---

## Debugging

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Application",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug with Chrome DevTools

```bash
# Start with inspect flag
node --inspect src/index.ts

# Open chrome://inspect in Chrome
```

---

## Useful Commands

```bash
# Generate API documentation
npm run docs:generate

# Run database migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Generate new migration
npm run db:migration:create <name>

# View logs
npm run logs

# Clean build artifacts
npm run clean
```

---

## Common Issues

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check if MongoDB is running
docker-compose ps

# Restart MongoDB
docker-compose restart mongodb
```

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Project Structure

```
ecommerce-backend/
├── src/
│   ├── api/              # API routes and controllers
│   ├── domain/           # Domain models and business logic
│   ├── infrastructure/   # External services, database
│   └── index.ts          # Application entry point
├── tests/                # Test files
├── docs/                 # Documentation
├── k8s/                  # Kubernetes manifests
├── scripts/              # Utility scripts
└── package.json
```

---

## Getting Help

- **Slack:** #engineering channel
- **Documentation:** `/docs` directory
- **Wiki:** [Internal Wiki](https://wiki.company.com)
- **Team Lead:** @team-lead

---

## Next Steps

1. Read [Architecture Documentation](../architecture/system-architecture.md)
2. Review [API Documentation](http://localhost:3000/api-docs)
3. Check [Troubleshooting Guide](../troubleshooting/common-issues.md)
4. Join team standup meetings

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
