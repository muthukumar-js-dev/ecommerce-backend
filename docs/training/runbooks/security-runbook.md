# Security Runbook

## Authentication & Authorization

### JWT Token Management

**Check Token Validity:**
```bash
# Decode JWT token
echo "eyJhbGc..." | base64 -d

# Verify token expiration
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/verify
```

**Rotate Secrets:**
```bash
# Generate new JWT secret
openssl rand -base64 32

# Update Kubernetes secret
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=<new-secret> \
  --dry-run=client -o yaml | kubectl apply -f -

# Rolling restart to pick up new secret
kubectl rollout restart deployment/main-app -n ecommerce
```

### API Rate Limiting

**Check Rate Limit Status:**
```bash
# View current rate limits
curl http://kong-admin:8001/plugins | jq '.data[] | select(.name=="rate-limiting")'

# Check user's current rate limit
redis-cli GET "rate_limit:user:<user-id>"
```

**Adjust Rate Limits:**
```bash
# Update Kong rate limiting
curl -X PATCH http://kong-admin:8001/plugins/<plugin-id> \
  --data "config.minute=200" \
  --data "config.hour=20000"
```

## Security Incidents

### Suspected Breach Response

**1. Immediate Actions:**
```bash
# Disable affected user accounts
curl -X PATCH http://localhost:3000/api/users/<user-id> \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"status": "suspended"}'

# Revoke all active sessions
redis-cli KEYS "session:*" | xargs redis-cli DEL

# Enable enhanced logging
kubectl set env deployment/main-app LOG_LEVEL=debug -n ecommerce
```

**2. Investigation:**
```bash
# Check access logs
kubectl logs -f deployment/main-app -n ecommerce | grep "suspicious"

# Analyze failed login attempts
npm run logs:analyze -- --filter="failed_login" --last=24h

# Check for unusual API patterns
curl http://prometheus:9090/api/v1/query?query='rate(http_requests_total[5m])'
```

**3. Remediation:**
- Force password reset for affected users
- Review and update security policies
- Patch vulnerabilities
- Update incident report

### SQL Injection / NoSQL Injection

**Detection:**
```bash
# Check for suspicious queries in logs
grep -r "\\$where" logs/
grep -r "\\$regex" logs/

# Monitor query patterns
npm run logs:analyze -- --filter="database_query"
```

**Prevention:**
- All queries use parameterized statements
- Input validation on all endpoints
- MongoDB query sanitization enabled

### DDoS Attack

**Detection:**
```bash
# Check request rate
kubectl top pods -n ecommerce

# View traffic patterns
curl http://prometheus:9090/api/v1/query?query='sum(rate(http_requests_total[1m]))'
```

**Mitigation:**
```bash
# Enable aggressive rate limiting
curl -X PATCH http://kong-admin:8001/plugins/<rate-limit-plugin> \
  --data "config.minute=10"

# Block IP addresses
kubectl apply -f k8s/network-policies/block-ips.yaml

# Enable CloudFlare DDoS protection (if using)
# Via CloudFlare dashboard
```

## SSL/TLS Management

### Certificate Renewal

**Check Certificate Expiry:**
```bash
# Check cert expiration
echo | openssl s_client -servername api.profitcart.com -connect api.profitcart.com:443 2>/dev/null | openssl x509 -noout -dates

# List all certs in cluster
kubectl get certificates -A
```

**Renew Certificate:**
```bash
# Using cert-manager (automatic)
kubectl describe certificate main-app-tls -n ecommerce

# Manual renewal
certbot renew --dry-run
```

## Data Encryption

### Encrypt Sensitive Data

**At Rest:**
- Database encryption enabled (MongoDB encryption at rest)
- Kubernetes secrets encrypted with KMS
- Backup encryption enabled

**In Transit:**
- TLS 1.3 for all external communication
- mTLS for service-to-service communication
- VPN for database access

### Key Rotation

```bash
# Rotate encryption keys
kubectl create secret generic encryption-key \
  --from-literal=KEY=$(openssl rand -base64 32) \
  -n ecommerce

# Update application
kubectl rollout restart deployment/main-app -n ecommerce
```

## Compliance & Auditing

### GDPR Compliance

**User Data Export:**
```bash
# Export user data
curl -X GET http://localhost:3000/api/users/<user-id>/export \
  -H "Authorization: Bearer <token>"
```

**User Data Deletion:**
```bash
# Delete user and all associated data
curl -X DELETE http://localhost:3000/api/users/<user-id>/gdpr-delete \
  -H "Authorization: Bearer <admin-token>"
```

### Security Audit

**Run Security Scan:**
```bash
# Run security validation
npm run validate:security

# Scan for vulnerabilities
npm audit
npm audit fix

# Container scanning
trivy image profitcart/main-app:latest
```

**Review Access Logs:**
```bash
# Export access logs
kubectl logs deployment/main-app -n ecommerce --since=24h > access-logs.txt

# Analyze for suspicious activity
npm run logs:analyze -- --security-audit
```

## Secrets Management

### Rotate All Secrets

```bash
# Database password
kubectl create secret generic mongodb-secret \
  --from-literal=password=$(openssl rand -base64 32) \
  --dry-run=client -o yaml | kubectl apply -f -

# Redis password
kubectl create secret generic redis-secret \
  --from-literal=password=$(openssl rand -base64 32) \
  --dry-run=client -o yaml | kubectl apply -f -

# JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=$(openssl rand -base64 64) \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart all services
kubectl rollout restart deployment -n ecommerce
```

## Emergency Contacts

- **Security Team Lead:** [Contact]
- **DevOps On-Call:** [Contact]
- **Legal/Compliance:** [Contact]
- **External Security Firm:** [Contact]
