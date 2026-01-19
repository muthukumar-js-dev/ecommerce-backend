# Security Hardening Troubleshooting Guide

## Common Issues

### 1. Vault Sealed

**Symptoms:**
- Vault pods showing as not ready
- Applications can't access secrets
- Error: "Vault is sealed"

**Solution:**
```bash
# Check Vault status
kubectl exec -n vault vault-0 -- vault status

# Unseal Vault (requires 3 of 5 keys)
kubectl exec -n vault vault-0 -- vault operator unseal <KEY1>
kubectl exec -n vault vault-0 -- vault operator unseal <KEY2>
kubectl exec -n vault vault-0 -- vault operator unseal <KEY3>

# Repeat for all Vault pods
for i in 0 1 2; do
  kubectl exec -n vault vault-$i -- vault operator unseal <KEY1>
  kubectl exec -n vault vault-$i -- vault operator unseal <KEY2>
  kubectl exec -n vault vault-$i -- vault operator unseal <KEY3>
done
```

---

### 2. Network Policy Blocking Traffic

**Symptoms:**
- Services can't communicate
- Connection timeouts
- DNS resolution failures

**Diagnosis:**
```bash
# Test connectivity from a pod
kubectl run test-pod --rm -i --tty --image=busybox -n ecommerce-prod -- /bin/sh
wget -O- http://core-service:3000

# Check network policies
kubectl get networkpolicies -n ecommerce-prod
kubectl describe networkpolicy core-service-policy -n ecommerce-prod
```

**Solution:**
```bash
# Temporarily disable network policy for testing
kubectl delete networkpolicy core-service-policy -n ecommerce-prod

# If it works, update the policy to allow required traffic
# Then reapply
kubectl apply -f k8s/security/network-policies.yaml
```

---

### 3. RBAC Permission Denied

**Symptoms:**
- Error: "forbidden: User cannot..."
- Services can't access Kubernetes API
- Deployment failures

**Diagnosis:**
```bash
# Check service account permissions
kubectl auth can-i --list --as=system:serviceaccount:ecommerce-prod:ecommerce-sa

# Check role bindings
kubectl get rolebindings -n ecommerce-prod
kubectl describe rolebinding ecommerce-rolebinding -n ecommerce-prod
```

**Solution:**
```bash
# Verify service account exists
kubectl get sa ecommerce-sa -n ecommerce-prod

# Check role has required permissions
kubectl get role ecommerce-role -n ecommerce-prod -o yaml

# Reapply RBAC if needed
kubectl apply -f k8s/security/rbac.yaml
```

---

### 4. Pod Security Policy Violations

**Symptoms:**
- Pods not starting
- Error: "violates PodSecurity"
- Admission webhook denying pods

**Diagnosis:**
```bash
# Check pod events
kubectl describe pod <pod-name> -n ecommerce-prod

# Check PSP
kubectl get psp
kubectl describe psp restricted
```

**Solution:**
```yaml
# Update deployment to comply with PSP
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: app
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
```

---

### 5. TLS Certificate Issues

**Symptoms:**
- HTTPS not working
- Certificate errors
- Cert-manager errors

**Diagnosis:**
```bash
# Check cert-manager
kubectl get pods -n cert-manager

# Check certificate status
kubectl get certificate -n ecommerce-prod
kubectl describe certificate api-certificate -n ecommerce-prod

# Check certificate secret
kubectl get secret api-tls -n ecommerce-prod
```

**Solution:**
```bash
# Delete and recreate certificate
kubectl delete certificate api-certificate -n ecommerce-prod
kubectl apply -f k8s/security/tls-config.yaml

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Verify ClusterIssuer
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-prod
```

---

### 6. Secrets Not Injected

**Symptoms:**
- Environment variables empty
- Application can't find secrets
- Vault agent not running

**Diagnosis:**
```bash
# Check pod has Vault annotations
kubectl get pod <pod-name> -n ecommerce-prod -o yaml | grep vault

# Check Vault agent sidecar
kubectl logs <pod-name> -c vault-agent -n ecommerce-prod

# Check Vault role
kubectl exec -n vault vault-0 -- vault read auth/kubernetes/role/ecommerce
```

**Solution:**
```bash
# Verify Vault annotations in deployment
kubectl get deployment core-service -n ecommerce-prod -o yaml | grep -A 10 annotations

# Recreate pod to trigger injection
kubectl rollout restart deployment core-service -n ecommerce-prod

# Check Vault agent template
kubectl exec -n vault vault-0 -- vault read ecommerce/data/prod/jwt
```

---

### 7. Image Pull Failures

**Symptoms:**
- Error: "ImagePullBackOff"
- Error: "ErrImagePull"
- Pods not starting

**Diagnosis:**
```bash
# Check pod events
kubectl describe pod <pod-name> -n ecommerce-prod

# Check image pull secrets
kubectl get secrets -n ecommerce-prod | grep docker
```

**Solution:**
```bash
# Create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  --docker-email=<email> \
  -n ecommerce-prod

# Add to service account
kubectl patch serviceaccount ecommerce-sa -n ecommerce-prod \
  -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

---

### 8. Security Scan Failures

**Symptoms:**
- CI/CD pipeline failing
- Trivy reporting vulnerabilities
- Security gates blocking deployment

**Diagnosis:**
```bash
# Run Trivy locally
trivy image ecommerce/core-service:latest

# Check for HIGH/CRITICAL vulnerabilities
trivy image --severity HIGH,CRITICAL ecommerce/core-service:latest
```

**Solution:**
```bash
# Update base image
# In Dockerfile:
FROM node:18-alpine  # Use latest secure version

# Update dependencies
npm audit fix

# Rebuild image
docker build -t ecommerce/core-service:latest .

# Rescan
trivy image ecommerce/core-service:latest
```

---

### 9. Ingress TLS Not Working

**Symptoms:**
- HTTP works but HTTPS doesn't
- Certificate warnings
- SSL redirect not working

**Diagnosis:**
```bash
# Check ingress
kubectl get ingress -n ecommerce-prod
kubectl describe ingress api-ingress -n ecommerce-prod

# Check TLS secret
kubectl get secret api-tls -n ecommerce-prod
kubectl describe secret api-tls -n ecommerce-prod
```

**Solution:**
```bash
# Verify cert-manager annotations
kubectl get ingress api-ingress -n ecommerce-prod -o yaml | grep cert-manager

# Check certificate is ready
kubectl get certificate api-certificate -n ecommerce-prod

# Force certificate renewal
kubectl delete secret api-tls -n ecommerce-prod
kubectl delete certificate api-certificate -n ecommerce-prod
kubectl apply -f k8s/security/tls-config.yaml
```

---

### 10. Audit Logging Not Working

**Symptoms:**
- No audit logs
- Security events not recorded
- Compliance issues

**Diagnosis:**
```bash
# Check if audit logging is enabled
kubectl get pod -n kube-system kube-apiserver-* -o yaml | grep audit

# Check audit log location
kubectl exec -n kube-system kube-apiserver-* -- ls /var/log/kubernetes/
```

**Solution:**
```yaml
# Enable audit logging in API server
# Add to kube-apiserver manifest:
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
```

---

## Prevention Best Practices

1. **Regular Security Audits:** Monthly security checklist reviews
2. **Automated Scanning:** CI/CD security gates
3. **Secrets Rotation:** 90-day rotation policy
4. **Network Policies:** Test before enforcing
5. **RBAC:** Least privilege principle
6. **Monitoring:** Security event alerts
7. **Documentation:** Keep runbooks updated
8. **Training:** Regular security training
9. **Backups:** Test recovery procedures
10. **Updates:** Keep all components updated

## Getting Help

1. Check pod logs: `kubectl logs <pod> -n ecommerce-prod`
2. Check events: `kubectl get events -n ecommerce-prod`
3. Review security checklist
4. Consult documentation
5. Contact security team
