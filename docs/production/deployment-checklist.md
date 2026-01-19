# Production Deployment Checklist

## Pre-Deployment

### Code & Build
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Changelog updated

### Infrastructure
- [ ] Kubernetes cluster ready
- [ ] Namespaces created
- [ ] Resource quotas set
- [ ] Network policies applied
- [ ] RBAC configured
- [ ] Secrets in Vault

### Database
- [ ] Migrations tested
- [ ] Indexes created
- [ ] Sharding configured
- [ ] Backup verified
- [ ] Connection pooling optimized

### Monitoring
- [ ] Prometheus configured
- [ ] Grafana dashboards created
- [ ] Alerts configured
- [ ] Log aggregation working
- [ ] APM enabled

## Deployment

### Pre-Deployment Steps
- [ ] Notify stakeholders
- [ ] Create deployment ticket
- [ ] Backup current state
- [ ] Tag release in Git
- [ ] Update status page

### Deployment Steps
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production (blue-green)
- [ ] Run health checks
- [ ] Monitor metrics
- [ ] Verify functionality

### Post-Deployment
- [ ] Update documentation
- [ ] Close deployment ticket
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Monitor for 24 hours

## Rollback Plan

- [ ] Rollback procedure documented
- [ ] Previous version tagged
- [ ] Database rollback tested
- [ ] Rollback decision criteria defined

## Sign-Off

- [ ] Engineering Lead: ___________
- [ ] DevOps Lead: ___________
- [ ] Product Manager: ___________
- [ ] Date: ___________
