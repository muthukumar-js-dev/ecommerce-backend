# Secrets Management Guide

## Overview

This guide covers best practices for managing secrets in Kubernetes for the e-commerce backend.

## Important Security Rules

> [!CAUTION]
> **NEVER commit secrets to Git!** All secret values should be created manually or through a secure secret management system.

## Creating Secrets

### Method 1: kubectl create secret (Recommended for Development)

```bash
# JWT Secret
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=your-super-secret-key-minimum-32-characters \
  --from-literal=JWT_EXPIRES_IN=7d \
  --namespace=ecommerce-prod

# Stripe Secrets
kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret \
  --namespace=ecommerce-prod

# AWS Credentials
kubectl create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=AKIA_your_access_key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your_secret_access_key \
  --from-literal=AWS_REGION=ap-south-1 \
  --namespace=ecommerce-prod

# Database Credentials
kubectl create secret generic db-credentials \
  --from-literal=MONGODB_USERNAME=admin \
  --from-literal=MONGODB_PASSWORD=your_secure_password \
  --from-literal=REDIS_PASSWORD=your_redis_password \
  --namespace=ecommerce-prod

# Email Service Credentials
kubectl create secret generic email-credentials \
  --from-literal=SENDGRID_API_KEY=SG.your_sendgrid_api_key \
  --namespace=ecommerce-prod
```

### Method 2: From Files

```bash
# Create secret from file
kubectl create secret generic tls-cert \
  --from-file=tls.crt=path/to/tls.crt \
  --from-file=tls.key=path/to/tls.key \
  --namespace=ecommerce-prod

# Create secret from env file
kubectl create secret generic app-secrets \
  --from-env-file=.env.secrets \
  --namespace=ecommerce-prod
```

### Method 3: From YAML (Use with Caution)

```yaml
# secrets.yaml (DO NOT COMMIT TO GIT)
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
  namespace: ecommerce-prod
type: Opaque
stringData:  # Use stringData for plain text (will be base64 encoded)
  JWT_SECRET: "your-super-secret-key"
  JWT_EXPIRES_IN: "7d"
```

Apply:
```bash
kubectl apply -f secrets.yaml
# DELETE THE FILE IMMEDIATELY AFTER APPLYING
rm secrets.yaml
```

## External Secret Management (Recommended for Production)

### Option 1: AWS Secrets Manager

**Install External Secrets Operator:**
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

**Create SecretStore:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: ecommerce-prod
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-south-1
      auth:
        jwt:
          serviceAccountRef:
            name: ecommerce-sa
```

**Create ExternalSecret:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: jwt-secret
  namespace: ecommerce-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: jwt-secret
    creationPolicy: Owner
  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: ecommerce/jwt-secret
```

### Option 2: HashiCorp Vault

**Install Vault:**
```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace
```

**Configure Vault Kubernetes Auth:**
```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443"

# Create policy
vault policy write ecommerce-policy - <<EOF
path "secret/data/ecommerce/*" {
  capabilities = ["read"]
}
EOF

# Create role
vault write auth/kubernetes/role/ecommerce \
  bound_service_account_names=ecommerce-sa \
  bound_service_account_namespaces=ecommerce-prod \
  policies=ecommerce-policy \
  ttl=24h
```

**Use Vault Agent Injector:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecommerce-backend
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "ecommerce"
        vault.hashicorp.com/agent-inject-secret-jwt: "secret/data/ecommerce/jwt"
```

## Viewing Secrets

### List Secrets
```bash
kubectl get secrets -n ecommerce-prod
```

### Describe Secret (doesn't show values)
```bash
kubectl describe secret jwt-secret -n ecommerce-prod
```

### View Secret Values (Use with Caution)
```bash
# Get all secret data
kubectl get secret jwt-secret -n ecommerce-prod -o jsonpath='{.data}'

# Decode specific key
kubectl get secret jwt-secret -n ecommerce-prod \
  -o jsonpath='{.data.JWT_SECRET}' | base64 --decode

# Get all keys decoded (requires jq)
kubectl get secret jwt-secret -n ecommerce-prod -o json | \
  jq -r '.data | to_entries[] | "\(.key): \(.value | @base64d)"'
```

## Updating Secrets

### Update Existing Secret
```bash
# Update single key
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=new-secret-key \
  --namespace=ecommerce-prod \
  --dry-run=client -o yaml | kubectl apply -f -

# Or patch
kubectl patch secret jwt-secret -n ecommerce-prod \
  -p '{"stringData":{"JWT_SECRET":"new-secret-key"}}'
```

### Restart Pods After Secret Update
```bash
# Pods don't automatically restart when secrets change
kubectl rollout restart deployment/ecommerce-backend -n ecommerce-prod
```

## Secret Rotation

### Automated Rotation Strategy

1. **Create new secret version:**
   ```bash
   kubectl create secret generic jwt-secret-v2 \
     --from-literal=JWT_SECRET=new-secret-key \
     --namespace=ecommerce-prod
   ```

2. **Update deployment to use new secret:**
   ```yaml
   env:
     - name: JWT_SECRET
       valueFrom:
         secretKeyRef:
           name: jwt-secret-v2  # Changed from jwt-secret
           key: JWT_SECRET
   ```

3. **Deploy and verify:**
   ```bash
   kubectl apply -f deployment.yaml
   kubectl rollout status deployment/ecommerce-backend -n ecommerce-prod
   ```

4. **Delete old secret:**
   ```bash
   kubectl delete secret jwt-secret -n ecommerce-prod
   ```

### Rotation Schedule

- **JWT Secrets:** Every 90 days
- **API Keys:** Every 180 days
- **Database Passwords:** Every 90 days
- **TLS Certificates:** Automated with cert-manager

## Best Practices

### 1. Principle of Least Privilege
- Create separate secrets for each service
- Use namespace isolation
- Limit secret access with RBAC

### 2. Encryption at Rest
```bash
# Enable encryption at rest (EKS)
# Already configured in eks-cluster.yaml
```

### 3. Audit Secret Access
```bash
# Enable audit logging
# Check who accessed secrets
kubectl get events -n ecommerce-prod | grep secret
```

### 4. Use Separate Secrets Per Environment
```bash
# Development
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=dev-secret \
  --namespace=ecommerce-dev

# Production
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=prod-secret \
  --namespace=ecommerce-prod
```

### 5. Never Log Secret Values
```typescript
// BAD
console.log('JWT Secret:', process.env.JWT_SECRET);

// GOOD
console.log('JWT Secret configured:', !!process.env.JWT_SECRET);
```

### 6. Use Strong Secrets
```bash
# Generate strong random secrets
openssl rand -base64 32

# For passwords
openssl rand -base64 24 | tr -d "=+/" | cut -c1-25
```

## Secret Templates

See `k8s/config/secrets-template.yaml` for YAML templates of all required secrets.

## Troubleshooting

### Secret Not Found
```bash
# Check if secret exists
kubectl get secret jwt-secret -n ecommerce-prod

# Check namespace
kubectl get secrets --all-namespaces | grep jwt-secret
```

### Pod Can't Access Secret
```bash
# Check pod events
kubectl describe pod <pod-name> -n ecommerce-prod

# Verify secret is mounted
kubectl exec <pod-name> -n ecommerce-prod -- env | grep JWT
```

### Secret Not Updating in Pod
```bash
# Secrets are mounted as files and may take time to update
# Force restart
kubectl rollout restart deployment/ecommerce-backend -n ecommerce-prod
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Create Kubernetes Secrets
  run: |
    kubectl create secret generic jwt-secret \
      --from-literal=JWT_SECRET=${{ secrets.JWT_SECRET }} \
      --namespace=ecommerce-prod \
      --dry-run=client -o yaml | kubectl apply -f -
```

### Using Sealed Secrets (GitOps)
```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Create sealed secret
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml

# Commit sealed-secret.yaml to Git (safe!)
git add sealed-secret.yaml
```

## Emergency Procedures

### Compromised Secret
1. **Immediately rotate the secret**
2. **Update all services using the secret**
3. **Audit access logs**
4. **Investigate the breach**
5. **Update incident response documentation**

### Lost Secret
1. **Check backup systems (Vault, AWS Secrets Manager)**
2. **Check CI/CD secret stores**
3. **Generate new secret if unrecoverable**
4. **Update all dependent services**

## Compliance

### GDPR/PCI-DSS Requirements
- Encrypt secrets at rest ✓
- Encrypt secrets in transit ✓
- Audit secret access ✓
- Regular secret rotation ✓
- Secure secret deletion ✓

## Additional Resources

- [Kubernetes Secrets Documentation](https://kubernetes.io/docs/concepts/configuration/secret/)
- [External Secrets Operator](https://external-secrets.io/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
