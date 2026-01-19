# Cluster Access Management

## Overview

This guide covers how to manage access to the Kubernetes cluster for team members, including kubeconfig setup, RBAC configuration, and service account management.

## Kubeconfig Setup

### Local Development (Kind)

```bash
# Kind automatically updates kubeconfig when cluster is created
kind create cluster --name ecommerce

# Verify context
kubectl config current-context

# Should show: kind-ecommerce
```

### Production (EKS)

```bash
# Update kubeconfig for EKS cluster
aws eks update-kubeconfig --region ap-south-1 --name ecommerce-prod

# Verify context
kubectl config current-context

# Should show: arn:aws:eks:ap-south-1:ACCOUNT_ID:cluster/ecommerce-prod
```

### Multiple Contexts

```bash
# List all contexts
kubectl config get-contexts

# Switch context
kubectl config use-context kind-ecommerce

# Set default namespace for context
kubectl config set-context --current --namespace=ecommerce-prod
```

### Sharing Kubeconfig

**For Team Members:**

1. **Generate kubeconfig for user:**
   ```bash
   # Create service account
   kubectl create serviceaccount developer -n ecommerce-prod
   
   # Create role binding
   kubectl create rolebinding developer-binding \
     --clusterrole=edit \
     --serviceaccount=ecommerce-prod:developer \
     --namespace=ecommerce-prod
   
   # Get service account token
   kubectl create token developer -n ecommerce-prod --duration=8760h
   ```

2. **Create kubeconfig file:**
   ```yaml
   apiVersion: v1
   kind: Config
   clusters:
     - name: ecommerce-cluster
       cluster:
         server: https://YOUR_CLUSTER_ENDPOINT
         certificate-authority-data: YOUR_CA_DATA
   contexts:
     - name: ecommerce-context
       context:
         cluster: ecommerce-cluster
         user: developer
         namespace: ecommerce-prod
   current-context: ecommerce-context
   users:
     - name: developer
       user:
         token: YOUR_SERVICE_ACCOUNT_TOKEN
   ```

3. **Share securely:**
   - Use encrypted communication
   - Set expiration on tokens
   - Rotate regularly

## RBAC Configuration

### Roles and ClusterRoles

#### Developer Role (Namespace-scoped)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: ecommerce-prod
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get", "list"]
```

Apply:
```bash
kubectl apply -f developer-role.yaml
```

#### DevOps Role (Cluster-wide)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: devops
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
  - nonResourceURLs: ["*"]
    verbs: ["*"]
```

#### Read-Only Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: viewer
  namespace: ecommerce-prod
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch"]
```

### RoleBindings

#### Bind User to Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: ecommerce-prod
subjects:
  - kind: User
    name: john.doe@example.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

#### Bind Service Account to Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: sa-developer-binding
  namespace: ecommerce-prod
subjects:
  - kind: ServiceAccount
    name: developer
    namespace: ecommerce-prod
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

#### Bind Group to ClusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: devops-team-binding
subjects:
  - kind: Group
    name: devops-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: devops
  apiGroup: rbac.authorization.k8s.io
```

## Service Account Management

### Create Service Account

```bash
# Create service account
kubectl create serviceaccount ci-cd -n ecommerce-prod

# Create role for CI/CD
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ci-cd-role
  namespace: ecommerce-prod
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
EOF

# Bind service account to role
kubectl create rolebinding ci-cd-binding \
  --role=ci-cd-role \
  --serviceaccount=ecommerce-prod:ci-cd \
  --namespace=ecommerce-prod
```

### Get Service Account Token

```bash
# Create token (Kubernetes 1.24+)
kubectl create token ci-cd -n ecommerce-prod --duration=8760h

# For older versions, get from secret
kubectl get secret -n ecommerce-prod \
  $(kubectl get sa ci-cd -n ecommerce-prod -o jsonpath='{.secrets[0].name}') \
  -o jsonpath='{.data.token}' | base64 --decode
```

### Use Service Account in Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
  namespace: ecommerce-prod
spec:
  serviceAccountName: ci-cd
  containers:
    - name: app
      image: myapp:latest
```

## Team Access Levels

### Level 1: Viewer (Read-Only)

**Permissions:**
- View pods, services, deployments
- View logs
- View metrics

**Use Case:** Stakeholders, QA team

**Setup:**
```bash
kubectl create serviceaccount viewer -n ecommerce-prod
kubectl create rolebinding viewer-binding \
  --clusterrole=view \
  --serviceaccount=ecommerce-prod:viewer \
  --namespace=ecommerce-prod
```

### Level 2: Developer

**Permissions:**
- All viewer permissions
- Port-forward
- Execute into pods
- View secrets (limited)

**Use Case:** Developers

**Setup:**
```bash
kubectl create serviceaccount developer -n ecommerce-prod
kubectl create rolebinding developer-binding \
  --clusterrole=edit \
  --serviceaccount=ecommerce-prod:developer \
  --namespace=ecommerce-prod
```

### Level 3: DevOps (Admin)

**Permissions:**
- Full cluster access
- Create/delete resources
- Manage RBAC
- Access all namespaces

**Use Case:** DevOps team, SRE

**Setup:**
```bash
kubectl create serviceaccount devops -n kube-system
kubectl create clusterrolebinding devops-binding \
  --clusterrole=cluster-admin \
  --serviceaccount=kube-system:devops
```

## AWS IAM Integration (EKS)

### Map IAM User to Kubernetes

```bash
# Edit aws-auth ConfigMap
kubectl edit configmap aws-auth -n kube-system

# Add user mapping
mapUsers: |
  - userarn: arn:aws:iam::ACCOUNT_ID:user/john.doe
    username: john.doe
    groups:
      - developers
```

### Map IAM Role to Kubernetes

```yaml
mapRoles: |
  - rolearn: arn:aws:iam::ACCOUNT_ID:role/DevOpsRole
    username: devops-user
    groups:
      - system:masters
```

### Create IAM Role for Service Account (IRSA)

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name EcommerceS3Access \
  --policy-document file://s3-policy.json

# Associate IAM role with service account
eksctl create iamserviceaccount \
  --cluster=ecommerce-prod \
  --namespace=ecommerce-prod \
  --name=ecommerce-sa \
  --attach-policy-arn=arn:aws:iam::ACCOUNT_ID:policy/EcommerceS3Access \
  --approve
```

## Access Auditing

### Enable Audit Logging

```yaml
# EKS: Already enabled in eks-cluster.yaml
cloudWatch:
  clusterLogging:
    enableTypes:
      - api
      - audit
      - authenticator
```

### View Audit Logs

```bash
# CloudWatch Logs (EKS)
aws logs tail /aws/eks/ecommerce-prod/cluster --follow

# Check who accessed what
kubectl get events --all-namespaces --sort-by='.lastTimestamp'
```

### Monitor Access

```bash
# Check recent API calls
kubectl get events --all-namespaces | grep -i auth

# Check failed authentication attempts
kubectl logs -n kube-system -l component=kube-apiserver | grep -i "authentication failed"
```

## Best Practices

### 1. Principle of Least Privilege
- Grant minimum necessary permissions
- Use namespace-scoped roles when possible
- Avoid cluster-admin unless necessary

### 2. Regular Access Reviews
```bash
# List all role bindings
kubectl get rolebindings --all-namespaces

# List all cluster role bindings
kubectl get clusterrolebindings
```

### 3. Token Rotation
```bash
# Rotate service account tokens every 90 days
kubectl create token ci-cd -n ecommerce-prod --duration=2160h

# Delete old tokens
kubectl delete secret <old-token-secret> -n ecommerce-prod
```

### 4. Use Groups
```yaml
# Assign roles to groups, not individual users
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
```

### 5. Audit Trail
- Enable audit logging
- Monitor access patterns
- Review permissions quarterly

## Revoking Access

### Remove User Access

```bash
# Delete role binding
kubectl delete rolebinding developer-binding -n ecommerce-prod

# Delete service account
kubectl delete serviceaccount developer -n ecommerce-prod
```

### Remove IAM User (EKS)

```bash
# Edit aws-auth ConfigMap
kubectl edit configmap aws-auth -n kube-system

# Remove user entry and save
```

## Emergency Access

### Break-Glass Account

```bash
# Create emergency admin account
kubectl create serviceaccount emergency-admin -n kube-system
kubectl create clusterrolebinding emergency-admin-binding \
  --clusterrole=cluster-admin \
  --serviceaccount=kube-system:emergency-admin

# Store token securely (e.g., HashiCorp Vault)
kubectl create token emergency-admin -n kube-system --duration=8760h
```

### Use Only in Emergencies
- Document usage
- Rotate token after use
- Review access logs

## Troubleshooting Access Issues

### Permission Denied

```bash
# Check current user
kubectl auth whoami

# Check if user can perform action
kubectl auth can-i create deployments -n ecommerce-prod

# Check all permissions
kubectl auth can-i --list -n ecommerce-prod
```

### Service Account Not Working

```bash
# Verify service account exists
kubectl get sa -n ecommerce-prod

# Check role binding
kubectl get rolebinding -n ecommerce-prod

# Describe role binding
kubectl describe rolebinding developer-binding -n ecommerce-prod
```

## Additional Resources

- [Kubernetes RBAC Documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [EKS IAM Roles for Service Accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [kubectl auth](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#kubectl-context-and-configuration)
