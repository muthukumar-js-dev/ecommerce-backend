# Phase 4 - Task 6: Security Hardening

**Duration:** 6-7 days  
**Priority:** Critical  
**Dependencies:** Tasks 1-5 (Infrastructure Ready)

---

## Objective

Implement comprehensive security measures including HashiCorp Vault for secrets management, Network Policies for pod-to-pod security, RBAC for access control, and security scanning.

---

## Context

Security hardening provides:
- **Secrets Management:** Centralized secret storage
- **Network Security:** Pod-to-pod communication control
- **Access Control:** Role-based permissions
- **Vulnerability Scanning:** Automated security checks
- **Compliance:** Meet security standards

---

## Implementation Steps

### Step 1: HashiCorp Vault Installation

**Install Vault using Helm:**

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set server.ha.enabled=true \
  --set server.ha.replicas=3 \
  --set ui.enabled=true \
  --set ui.serviceType=LoadBalancer
```

**Initialize and unseal Vault:**

```bash
# Initialize Vault
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-keys.json

# Extract unseal keys and root token
UNSEAL_KEY_1=$(cat vault-keys.json | jq -r '.unseal_keys_b64[0]')
UNSEAL_KEY_2=$(cat vault-keys.json | jq -r '.unseal_keys_b64[1]')
UNSEAL_KEY_3=$(cat vault-keys.json | jq -r '.unseal_keys_b64[2]')
ROOT_TOKEN=$(cat vault-keys.json | jq -r '.root_token')

# Unseal all Vault pods
for i in 0 1 2; do
  kubectl exec -n vault vault-$i -- vault operator unseal $UNSEAL_KEY_1
  kubectl exec -n vault vault-$i -- vault operator unseal $UNSEAL_KEY_2
  kubectl exec -n vault vault-$i -- vault operator unseal $UNSEAL_KEY_3
done
```

### Step 2: Configure Vault Secrets

**Enable KV secrets engine:**

```bash
# Login to Vault
kubectl exec -n vault vault-0 -- vault login $ROOT_TOKEN

# Enable KV v2 secrets engine
kubectl exec -n vault vault-0 -- vault secrets enable -path=ecommerce kv-v2

# Store secrets
kubectl exec -n vault vault-0 -- vault kv put ecommerce/prod/jwt \
  JWT_SECRET="your-super-secret-jwt-key"

kubectl exec -n vault vault-0 -- vault kv put ecommerce/prod/stripe \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..."

kubectl exec -n vault vault-0 -- vault kv put ecommerce/prod/aws \
  AWS_ACCESS_KEY_ID="AKIA..." \
  AWS_SECRET_ACCESS_KEY="..."

kubectl exec -n vault vault-0 -- vault kv put ecommerce/prod/mongodb \
  MONGODB_URI="mongodb://..."

kubectl exec -n vault vault-0 -- vault kv put ecommerce/prod/redis \
  REDIS_PASSWORD="..."
```

### Step 3: Kubernetes Auth Method

**Enable Kubernetes auth:**

```bash
kubectl exec -n vault vault-0 -- vault auth enable kubernetes

kubectl exec -n vault vault-0 -- vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"
```

**Create Vault policy:**

```bash
kubectl exec -n vault vault-0 -- vault policy write ecommerce-policy - <<EOF
path "ecommerce/data/prod/*" {
  capabilities = ["read"]
}
EOF
```

**Create Kubernetes role:**

```bash
kubectl exec -n vault vault-0 -- vault write auth/kubernetes/role/ecommerce \
  bound_service_account_names=ecommerce-sa \
  bound_service_account_namespaces=ecommerce-prod \
  policies=ecommerce-policy \
  ttl=24h
```

### Step 4: Vault Sidecar Injector

**Create ServiceAccount:**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecommerce-sa
  namespace: ecommerce-prod
```

**Update deployment with Vault annotations:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core-service
  namespace: ecommerce-prod
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "ecommerce"
        vault.hashicorp.com/agent-inject-secret-jwt: "ecommerce/data/prod/jwt"
        vault.hashicorp.com/agent-inject-template-jwt: |
          {{- with secret "ecommerce/data/prod/jwt" -}}
          export JWT_SECRET="{{ .Data.data.JWT_SECRET }}"
          {{- end }}
        vault.hashicorp.com/agent-inject-secret-stripe: "ecommerce/data/prod/stripe"
        vault.hashicorp.com/agent-inject-template-stripe: |
          {{- with secret "ecommerce/data/prod/stripe" -}}
          export STRIPE_SECRET_KEY="{{ .Data.data.STRIPE_SECRET_KEY }}"
          export STRIPE_WEBHOOK_SECRET="{{ .Data.data.STRIPE_WEBHOOK_SECRET }}"
          {{- end }}
    spec:
      serviceAccountName: ecommerce-sa
      containers:
        - name: core-service
          image: ecommerce/core-service:latest
          command: ["/bin/sh", "-c"]
          args:
            - source /vault/secrets/jwt && source /vault/secrets/stripe && node dist/main.js
```

### Step 5: Network Policies

**Create default deny policy:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: ecommerce-prod
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

**Create core service network policy:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: core-service-policy
  namespace: ecommerce-prod
spec:
  podSelector:
    matchLabels:
      app: core-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from API Gateway
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 3000
  egress:
    # Allow to MongoDB
    - to:
        - podSelector:
            matchLabels:
              app: mongodb
      ports:
        - protocol: TCP
          port: 27017
    
    # Allow to Redis
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    
    # Allow to Kafka
    - to:
        - podSelector:
            matchLabels:
              app: kafka
      ports:
        - protocol: TCP
          port: 9092
    
    # Allow DNS
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 53
        - protocol: UDP
          port: 53
    
    # Allow HTTPS for external APIs
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443
```

**Create payment service network policy:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-policy
  namespace: ecommerce-prod
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 3001
  egress:
    # MongoDB, Kafka, DNS, HTTPS (Stripe API)
    - to:
        - podSelector:
            matchLabels:
              app: mongodb
      ports:
        - protocol: TCP
          port: 27017
    - to:
        - podSelector:
            matchLabels:
              app: kafka
      ports:
        - protocol: TCP
          port: 9092
    - ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 53
        - protocol: UDP
          port: 53
```

### Step 6: RBAC Configuration

**Create Role for service accounts:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ecommerce-role
  namespace: ecommerce-prod
rules:
  # Read-only access to pods and services
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  
  # Read deployments
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list"]
  
  # No write permissions
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ecommerce-rolebinding
  namespace: ecommerce-prod
subjects:
  - kind: ServiceAccount
    name: ecommerce-sa
    namespace: ecommerce-prod
roleRef:
  kind: Role
  name: ecommerce-role
  apiGroup: rbac.authorization.k8s.io
```

**Create ClusterRole for monitoring:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-role
rules:
  - apiGroups: [""]
    resources: ["nodes", "nodes/proxy", "services", "endpoints", "pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus-rolebinding
subjects:
  - kind: ServiceAccount
    name: prometheus
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: prometheus-role
  apiGroup: rbac.authorization.k8s.io
```

### Step 7: Pod Security Standards

**Create Pod Security Policy:**

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: false
```

### Step 8: Security Scanning

**Install Trivy:**

```bash
choco install trivy
```

**Scan container images:**

```bash
# Scan for vulnerabilities
trivy image --severity HIGH,CRITICAL ecommerce/core-service:latest

# Generate report
trivy image --format json --output trivy-report.json ecommerce/core-service:latest

# Scan Kubernetes manifests
trivy config k8s/
```

**Automated scanning in CI/CD:**

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'ecommerce/core-service:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### Step 9: TLS/SSL Configuration

**Create TLS certificates:**

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

**Update Ingress with TLS:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: ecommerce-prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - api.yourdomain.com
      secretName: api-tls
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 80
```

### Step 10: Security Audit Checklist

**Create `docs/security/security-checklist.md`:**

```markdown
# Security Checklist

## Secrets Management
- [ ] All secrets stored in Vault
- [ ] No hardcoded secrets in code
- [ ] Secrets rotation policy defined
- [ ] Vault unsealed and accessible

## Network Security
- [ ] Network policies enforced
- [ ] Default deny policy in place
- [ ] Pod-to-pod communication restricted
- [ ] TLS enabled for all services

## Access Control
- [ ] RBAC configured
- [ ] Service accounts created
- [ ] Least privilege principle applied
- [ ] No cluster-admin access for apps

## Container Security
- [ ] Running as non-root user
- [ ] Read-only root filesystem
- [ ] No privileged containers
- [ ] Security scanning automated

## Compliance
- [ ] GDPR compliance verified
- [ ] Data encryption at rest
- [ ] Data encryption in transit
- [ ] Audit logging enabled
```

---

## Testing

**Test network policies:**

```bash
# Try to access from unauthorized pod
kubectl run test-pod --rm -i --tty --image=busybox -- /bin/sh
wget -O- http://core-service:3000  # Should fail

# Try from authorized pod (api-gateway)
kubectl exec -it api-gateway-pod -- curl http://core-service:3000  # Should succeed
```

---

## Deliverables

- [ ] Vault installed and configured
- [ ] All secrets migrated to Vault
- [ ] Network policies enforced
- [ ] RBAC configured
- [ ] Pod security policies applied
- [ ] Security scanning automated
- [ ] TLS certificates configured
- [ ] Security audit passed
- [ ] Documentation complete

---

## Next Steps

After completing this task:
1. Proceed to **Task 7: CDN & Performance Optimization**
2. Regular security audits
3. Secrets rotation

---

**Task Owner:** Security + DevOps Team  
**Reviewer:** Security Lead  
**Estimated Effort:** 6-7 days  
**Status:** Not Started
