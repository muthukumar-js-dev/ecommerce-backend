# AWS EKS Cluster Setup Guide

## Prerequisites

### 1. Install Required Tools

**AWS CLI:**
```powershell
# Windows (using Chocolatey)
choco install awscli

# Verify installation
aws --version

# Configure AWS credentials
aws configure
```

**eksctl:**
```powershell
# Windows (using Chocolatey)
choco install eksctl

# Verify installation
eksctl version
```

**kubectl:**
```powershell
# Windows (using Chocolatey)
choco install kubernetes-cli

# Verify installation
kubectl version --client
```

**Helm:**
```powershell
# Windows (using Chocolatey)
choco install kubernetes-helm

# Verify installation
helm version
```

### 2. AWS Account Setup

- Ensure you have an AWS account with appropriate permissions
- Required IAM permissions:
  - EC2 (full access)
  - EKS (full access)
  - CloudFormation (full access)
  - IAM (create roles and policies)
  - VPC (full access)

## Cluster Creation

### Step 1: Create EKS Cluster

```bash
# Navigate to project directory
cd D:\github\ecommerce-backend

# Create cluster using eksctl
eksctl create cluster -f k8s/production/eks-cluster.yaml

# This will take approximately 15-20 minutes
```

### Step 2: Verify Cluster

```bash
# Get cluster info
kubectl cluster-info

# Get nodes
kubectl get nodes

# Verify node groups
eksctl get nodegroup --cluster=ecommerce-prod --region=ap-south-1
```

### Step 3: Configure kubectl Context

```bash
# Update kubeconfig
aws eks update-kubeconfig --region ap-south-1 --name ecommerce-prod

# Verify context
kubectl config current-context

# Test connection
kubectl get svc
```

## Post-Creation Setup

### 1. Create Namespaces

```bash
kubectl apply -f k8s/namespaces/namespaces.yaml
kubectl get namespaces
```

### 2. Apply Resource Quotas

```bash
kubectl apply -f k8s/namespaces/resource-quotas.yaml
kubectl get resourcequota -n ecommerce-prod
```

### 3. Create Secrets

```bash
# JWT Secret
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=your-super-secret-key \
  --from-literal=JWT_EXPIRES_IN=7d \
  --namespace=ecommerce-prod

# Stripe Secret
kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_SECRET_KEY=sk_live_... \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_... \
  --namespace=ecommerce-prod

# AWS Credentials (if needed for application)
kubectl create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=AKIA... \
  --from-literal=AWS_SECRET_ACCESS_KEY=... \
  --from-literal=AWS_REGION=ap-south-1 \
  --namespace=ecommerce-prod
```

### 4. Apply ConfigMaps

```bash
kubectl apply -f k8s/config/configmap.yaml
kubectl get configmap -n ecommerce-prod
```

### 5. Install Cluster Autoscaler

```bash
# Deploy cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Annotate service account
kubectl annotate serviceaccount cluster-autoscaler \
  -n kube-system \
  eks.amazonaws.com/role-arn=arn:aws:iam::YOUR_ACCOUNT_ID:role/cluster-autoscaler

# Edit deployment to add cluster name
kubectl -n kube-system edit deployment cluster-autoscaler
# Add: --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/ecommerce-prod
```

## Monitoring and Logging

### Install CloudWatch Container Insights

```bash
# Create namespace
kubectl create namespace amazon-cloudwatch

# Deploy CloudWatch agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cloudwatch-namespace.yaml

kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent/cwagent-serviceaccount.yaml
```

## Cleanup (When Needed)

```bash
# Delete cluster
eksctl delete cluster --name=ecommerce-prod --region=ap-south-1

# This will delete all resources including:
# - Node groups
# - VPC
# - CloudFormation stacks
# - IAM roles
```

## Cost Optimization

### Recommendations:
1. Use Spot Instances for non-critical workloads
2. Enable cluster autoscaler to scale down during low traffic
3. Use Fargate for specific workloads
4. Monitor costs using AWS Cost Explorer
5. Set up billing alerts

### Estimated Monthly Costs:
- Control Plane: $73/month
- t3.large nodes (3): ~$150/month
- t3.medium nodes (5): ~$150/month
- EBS volumes: ~$50/month
- Data transfer: Variable
- **Total: ~$400-500/month**

## Security Best Practices

1. **Enable Pod Security Standards:**
   ```bash
   kubectl label namespace ecommerce-prod pod-security.kubernetes.io/enforce=restricted
   ```

2. **Enable Network Policies:**
   - Install Calico or AWS VPC CNI network policies

3. **Regular Updates:**
   ```bash
   # Update cluster version
   eksctl upgrade cluster --name=ecommerce-prod --region=ap-south-1 --approve

   # Update node groups
   eksctl upgrade nodegroup --cluster=ecommerce-prod --name=core-services --region=ap-south-1
   ```

4. **Enable Secrets Encryption:**
   - Configure KMS encryption for secrets at rest

## Troubleshooting

### Common Issues:

**1. Nodes not joining cluster:**
```bash
# Check node group status
eksctl get nodegroup --cluster=ecommerce-prod --region=ap-south-1

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name eksctl-ecommerce-prod-nodegroup-core-services
```

**2. kubectl connection issues:**
```bash
# Update kubeconfig
aws eks update-kubeconfig --region ap-south-1 --name ecommerce-prod --kubeconfig ~/.kube/config
```

**3. IAM permissions issues:**
```bash
# Verify IAM role
aws sts get-caller-identity

# Check OIDC provider
eksctl utils associate-iam-oidc-provider --cluster=ecommerce-prod --region=ap-south-1 --approve
```

## Next Steps

1. Install NGINX Ingress Controller (see `k8s/ingress/ingress-setup.md`)
2. Install Prometheus and Grafana (see `k8s/monitoring/monitoring-setup.md`)
3. Deploy application using Helm (see `scripts/k8s/deploy.sh`)
