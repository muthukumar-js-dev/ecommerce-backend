# Security Audit Checklist

## Secrets Management

- [ ] All secrets stored in HashiCorp Vault
- [ ] No hardcoded secrets in code or configuration files
- [ ] Secrets rotation policy defined (90 days)
- [ ] Vault unsealed and accessible
- [ ] Vault backup configured
- [ ] Service accounts have Vault access configured
- [ ] Vault audit logging enabled

## Network Security

- [ ] Network policies enforced for all namespaces
- [ ] Default deny-all policy in place
- [ ] Pod-to-pod communication restricted
- [ ] Only required ports exposed
- [ ] TLS enabled for all external services
- [ ] TLS enabled for internal service communication
- [ ] Ingress configured with SSL redirect
- [ ] Certificate auto-renewal configured

## Access Control (RBAC)

- [ ] RBAC configured for all service accounts
- [ ] Least privilege principle applied
- [ ] No cluster-admin access for application services
- [ ] Service accounts have minimal required permissions
- [ ] Role bindings reviewed and documented
- [ ] No wildcard permissions granted
- [ ] Regular RBAC audit scheduled

## Container Security

- [ ] Running as non-root user
- [ ] Read-only root filesystem where possible
- [ ] No privileged containers
- [ ] Security capabilities dropped
- [ ] Resource limits set for all containers
- [ ] Image vulnerability scanning automated
- [ ] Only approved base images used
- [ ] Images signed and verified

## Pod Security

- [ ] Pod Security Policies/Standards applied
- [ ] No host network access
- [ ] No host PID access
- [ ] No host IPC access
- [ ] Volume types restricted
- [ ] AppArmor/SELinux profiles configured
- [ ] Seccomp profiles applied

## Image Security

- [ ] All images scanned with Trivy
- [ ] No HIGH or CRITICAL vulnerabilities
- [ ] Images pulled from trusted registries only
- [ ] Image pull secrets configured
- [ ] Regular image updates scheduled
- [ ] Vulnerability scanning in CI/CD pipeline

## Data Security

- [ ] Data encryption at rest enabled
- [ ] Data encryption in transit (TLS)
- [ ] Database authentication enabled
- [ ] Database access restricted by network policies
- [ ] Backup encryption enabled
- [ ] PII data identified and protected
- [ ] GDPR compliance verified

## Monitoring & Logging

- [ ] Security audit logs enabled
- [ ] Log aggregation configured
- [ ] Security alerts configured
- [ ] Failed authentication attempts monitored
- [ ] Anomaly detection enabled
- [ ] Log retention policy defined (90 days)
- [ ] Logs encrypted and access controlled

## Compliance

- [ ] GDPR compliance verified
- [ ] PCI DSS requirements met (if applicable)
- [ ] SOC 2 controls implemented
- [ ] Security policies documented
- [ ] Incident response plan in place
- [ ] Regular security training completed
- [ ] Third-party security audit passed

## Vulnerability Management

- [ ] Automated vulnerability scanning enabled
- [ ] CVE monitoring configured
- [ ] Patch management process defined
- [ ] Critical vulnerabilities patched within 24 hours
- [ ] High vulnerabilities patched within 7 days
- [ ] Vulnerability disclosure policy published

## API Security

- [ ] API authentication required (JWT)
- [ ] API rate limiting enabled
- [ ] API input validation implemented
- [ ] CORS configured properly
- [ ] API versioning implemented
- [ ] API documentation secured
- [ ] API keys rotated regularly

## Infrastructure Security

- [ ] Kubernetes version up to date
- [ ] Node OS patches applied
- [ ] etcd encrypted
- [ ] API server authentication enabled
- [ ] Admission controllers configured
- [ ] Audit logging enabled
- [ ] Cloud provider security best practices followed

## Secrets Rotation

- [ ] JWT secrets rotated every 90 days
- [ ] Database passwords rotated every 90 days
- [ ] API keys rotated every 90 days
- [ ] TLS certificates auto-renewed
- [ ] Service account tokens rotated
- [ ] Rotation procedures documented

## Incident Response

- [ ] Incident response plan documented
- [ ] Security contacts defined
- [ ] Escalation procedures defined
- [ ] Incident response drills conducted
- [ ] Post-incident review process defined
- [ ] Security incident tracking system in place

## Backup & Recovery

- [ ] Backup encryption enabled
- [ ] Backup access controlled
- [ ] Backup retention policy defined
- [ ] Disaster recovery plan tested
- [ ] Backup restoration tested monthly
- [ ] Off-site backup configured

## Third-Party Security

- [ ] Third-party dependencies scanned
- [ ] Vendor security assessments completed
- [ ] SLAs include security requirements
- [ ] Data processing agreements signed
- [ ] Third-party access monitored
- [ ] Regular vendor security reviews

## Sign-Off

**Security Lead:** ___________ **Date:** ___________

**DevOps Lead:** ___________ **Date:** ___________

**Compliance Officer:** ___________ **Date:** ___________

**Last Audit Date:** ___________

**Next Audit Date:** ___________

## Notes

_Add any exceptions, findings, or action items here:_

---

**Audit Frequency:** Quarterly

**Document Version:** 1.0

**Last Updated:** 2024-01-08
