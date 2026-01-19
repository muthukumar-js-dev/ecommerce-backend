# Frequently Asked Questions

## Development

### Q: How do I run the application locally?
```bash
npm install
npm run dev
```

### Q: How do I run tests?
```bash
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests
```

### Q: How do I fix linting errors?
```bash
npm run lint:fix
npm run format
```

### Q: What's the branching strategy?
- `main`: Production code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `hotfix/*`: Emergency fixes

## Architecture

### Q: Why use CQRS?
CQRS allows us to optimize reads and writes independently, scale them separately, and use different data models for different use cases.

### Q: When should I use events?
Use events for:
- Cross-service communication
- Async operations
- Audit trail
- State changes that other services need to know about

### Q: How does sharding work?
Database is sharded by userId using hash-based sharding. Queries automatically route to the correct shard based on the shard key.

## Deployment

### Q: How do I deploy to staging?
```bash
git push origin feature/my-feature
# CI/CD automatically deploys to staging
```

### Q: How do I rollback a deployment?
```bash
bash scripts/deployment/rollback.sh
```

### Q: How do I check deployment status?
```bash
kubectl get pods -n ecommerce
kubectl rollout status deployment/main-app -n ecommerce
```

## Troubleshooting

### Q: Application won't start locally
1. Check MongoDB is running
2. Check Redis is running
3. Check Kafka is running
4. Verify environment variables in `.env`

### Q: Tests are failing
1. Run `npm run test:verbose` for details
2. Check test database connection
3. Ensure MongoDB Memory Server is working
4. Clear test cache: `npm run test -- --clearCache`

### Q: How do I debug in production?
1. Check logs: `kubectl logs -f deployment/main-app`
2. Check metrics in Grafana
3. Check traces in Jaeger
4. Review recent deployments

## Monitoring

### Q: Where can I see application metrics?
Grafana: http://grafana.profitcart.com

### Q: How do I create an alert?
Edit Prometheus alert rules in `monitoring/prometheus/alerts.yaml`

### Q: How do I trace a request?
Use Jaeger UI with the request ID from response headers
