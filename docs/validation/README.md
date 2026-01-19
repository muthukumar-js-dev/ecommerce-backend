# Pre-Production Validation Guide

## Overview

This guide explains how to run comprehensive pre-production validation to ensure the e-commerce platform is ready for production deployment.

---

## Quick Start

```bash
# Run complete validation suite
bash scripts/validation/run-all-validations.sh

# Or run individual validations
bash scripts/validation/security-audit.sh
bash scripts/validation/performance-benchmark.sh
npx ts-node scripts/validation/security-validator.ts
npx ts-node scripts/validation/performance-validator.ts
npx ts-node scripts/validation/go-nogo-assessment.ts
```

---

## Validation Components

### 1. Security Audit

**Purpose:** Identify and address security vulnerabilities before production.

**What it checks:**
- Container image vulnerabilities (Trivy)
- Kubernetes manifest security (Trivy)
- Dependency vulnerabilities (npm audit)
- Secret leaks (TruffleHog)
- Network policies
- RBAC configuration
- TLS certificates
- Compliance (GDPR, PCI-DSS)

**Running:**
```bash
bash scripts/validation/security-audit.sh
```

**Output:** `./validation-results/security/YYYYMMDD_HHMMSS/`

**Success Criteria:**
- Zero critical vulnerabilities
- <5 high severity vulnerabilities
- No secrets in code
- All security checks passed

---

### 2. Performance Benchmarking

**Purpose:** Validate system performance meets production targets.

**What it tests:**
- API performance (Artillery)
- Database performance
- Cache performance
- Resource utilization
- End-to-end flows

**Running:**
```bash
bash scripts/validation/performance-benchmark.sh
```

**Output:** `./validation-results/performance/YYYYMMDD_HHMMSS/`

**Success Criteria:**
- P50 latency <100ms
- P95 latency <200ms
- P99 latency <500ms
- Throughput >100K RPS
- Error rate <0.1%
- CPU utilization <80%
- Memory utilization <85%
- Cache hit rate >80%

---

### 3. Security Validation

**Purpose:** Automated security checks against production criteria.

**What it validates:**
- Container security
- Network policies
- Secrets management
- RBAC configuration
- TLS certificates
- Compliance requirements

**Running:**
```bash
npx ts-node scripts/validation/security-validator.ts
```

**Success Criteria:**
- All security checks passed
- No critical or high severity issues

---

### 4. Performance Validation

**Purpose:** Automated performance validation against SLA targets.

**What it validates:**
- API latency (P50, P95, P99)
- Throughput (RPS)
- Error rate
- Resource utilization
- Database performance
- Cache performance

**Running:**
```bash
npx ts-node scripts/validation/performance-validator.ts
```

**Success Criteria:**
- All performance metrics within targets

---

### 5. Go/No-Go Assessment

**Purpose:** Final production readiness decision.

**What it assesses:**
- Security readiness
- Performance readiness
- Reliability readiness
- Operational readiness
- Business readiness

**Running:**
```bash
npx ts-node scripts/validation/go-nogo-assessment.ts
```

**Possible Outcomes:**
- ✅ **GO** - Ready for production
- ⚠️ **GO (with warnings)** - Ready with minor issues
- ❌ **NO-GO** - Blockers must be resolved

---

## Interpreting Results

### Security Audit Results

**Location:** `./validation-results/security/YYYYMMDD_HHMMSS/`

**Files:**
- `summary.txt` - Overall summary
- `*-scan.json` - Trivy scan results
- `npm-audit.json` - Dependency vulnerabilities
- `secrets-scan.json` - Secret scan results

**Action Items:**
1. Review all critical and high severity issues
2. Create tickets for remediation
3. Document accepted risks
4. Re-run audit after fixes

### Performance Results

**Location:** `./validation-results/performance/YYYYMMDD_HHMMSS/`

**Files:**
- `summary.txt` - Overall summary
- `api-performance.html` - Artillery report
- `db-performance.txt` - Database test results
- `cache-performance.txt` - Cache test results
- `resource-utilization.txt` - Resource usage

**Action Items:**
1. Compare metrics against targets
2. Identify bottlenecks
3. Optimize if needed
4. Re-run benchmarks

### Validation Reports

**Console Output:**
- ✅ Pass - Criteria met
- ❌ Fail - Criteria not met (blocker)
- ⚠️ Warning - Minor issue (non-blocker)

**Action Items:**
1. Address all failures
2. Document warnings
3. Re-run validation

---

## Troubleshooting

### Security Audit Issues

**Issue:** Trivy not found
```bash
# Install Trivy
brew install aquasecurity/trivy/trivy  # macOS
# or
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy
```

**Issue:** Container images not found
```bash
# Build images first
docker build -t ecommerce/core-service:latest .
```

**Issue:** Kubernetes cluster not accessible
```bash
# Update kubeconfig
aws eks update-kubeconfig --name ecommerce-prod --region ap-south-1
```

### Performance Benchmark Issues

**Issue:** Artillery not found
```bash
npm install -g artillery
```

**Issue:** Load tests failing
- Check if services are running
- Verify network connectivity
- Review error logs

### Validation Script Issues

**Issue:** TypeScript errors
```bash
# Install dependencies
npm install
```

**Issue:** Prometheus not accessible
- Validation will use mock values
- Deploy to cluster for real metrics

---

## Best Practices

1. **Run validations regularly**
   - Before each release
   - After major changes
   - Weekly in staging

2. **Automate in CI/CD**
   - Add to GitHub Actions
   - Run on pull requests
   - Block merges on failures

3. **Track trends**
   - Monitor performance over time
   - Track vulnerability counts
   - Review compliance status

4. **Document exceptions**
   - Accepted risks
   - Temporary workarounds
   - Planned improvements

5. **Keep tools updated**
   - Update Trivy regularly
   - Update dependencies
   - Review new security advisories

---

## Validation Checklist

Before production deployment:

- [ ] Security audit completed
- [ ] All critical vulnerabilities resolved
- [ ] Performance benchmarks passed
- [ ] Security validation passed
- [ ] Performance validation passed
- [ ] Go/No-Go assessment: GO
- [ ] Stakeholder approval obtained
- [ ] Documentation reviewed
- [ ] Team trained
- [ ] Rollback plan tested

---

## Support

For issues or questions:
- **Security:** security@yourdomain.com
- **Performance:** devops@yourdomain.com
- **General:** support@yourdomain.com

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
