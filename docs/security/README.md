# Security Hardening Setup Guide

## Overview

Comprehensive security hardening for the e-commerce backend including HashiCorp Vault for secrets management, network policies, RBAC, pod security policies, and security scanning.

## Quick Start

### 1. Install HashiCorp Vault

```bash
# Add Hashicorp Helm repo
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Vault
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set server.ha.enabled=true \
  --set server.ha.replicas=3

# Verify installation
kubectl get pods -n vault
```

### 2. Initialize Vault

```bash
# Run initialization script
bash scripts/vault/init-vault.sh

# Save vault-keys.json securely
# This file contains unseal keys and root token
```

### 3. Deploy Security Policies

```bash
# Apply network policies
kubectl apply -f k8s/security/network-policies.yaml

# Apply RBAC
kubectl apply -f k8s/security/rbac.yaml

# Apply pod security policies
kubectl apply -f k8s/security/pod-security-policy.yaml
```

### 4. Verify Security

```bash
# Check network policies
kubectl get networkpolicies -n ecommerce-prod

# Check RBAC
kubectl get roles,rolebindings -n ecommerce-prod

# Test network isolation
kubectl run test-pod --rm -i --tty --image=busybox -- /bin/sh
wget -O- http://core-service:3000  # Should fail
```

## Security Checklist

### Secrets Management
- [x] Vault installed and configured
- [x] All secrets stored in Vault
- [ ] Secrets rotation policy defined
- [ ] Vault backup configured

### Network Security
- [x] Network policies enforced
- [x] Default deny policy in place
- [x] Pod-to-pod communication restricted
- [ ] TLS enabled for all services

### Access Control
- [x] RBAC configured
- [x] Service accounts created
- [x] Least privilege principle applied
- [x] No cluster-admin access for apps

### Container Security
- [x] Pod security policies defined
- [x] Running as non-root user
- [ ] Security scanning automated
- [ ] Image signing enabled

## Best Practices

1. **Never commit secrets** to version control
2. **Rotate secrets** regularly (every 90 days)
3. **Use network policies** to restrict traffic
4. **Apply least privilege** RBAC
5. **Scan images** for vulnerabilities
6. **Enable audit logging** for compliance
7. **Use TLS** for all communications
8. **Regular security audits** quarterly

## Troubleshooting

### Vault Sealed

```bash
# Unseal Vault
kubectl exec -n vault vault-0 -- vault operator unseal <KEY>
```

### Network Policy Blocking Traffic

```bash
# Check network policies
kubectl describe networkpolicy <policy-name> -n ecommerce-prod

# Test connectivity
kubectl run test-pod --rm -i --tty --image=busybox -- /bin/sh
```

### RBAC Permission Denied

```bash
# Check service account permissions
kubectl auth can-i --list --as=system:serviceaccount:ecommerce-prod:ecommerce-sa
```

## Additional Resources

- [Vault Documentation](https://www.vaultproject.io/docs)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
