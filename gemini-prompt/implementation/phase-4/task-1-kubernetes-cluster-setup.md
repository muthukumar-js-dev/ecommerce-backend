# Phase 4 - Task 1: Kubernetes Cluster Setup

**Duration:** 5-6 days  
**Priority:** Critical (Blocking)  
**Dependencies:** Phase 3 Complete

---

## Objective

Setup production-grade Kubernetes cluster for container orchestration with namespaces, resource management, monitoring, and high availability.

---

## Context

Kubernetes will provide:
- **Container Orchestration:** Automated deployment and scaling
- **Self-Healing:** Automatic restart of failed containers
- **Load Balancing:** Built-in service discovery and load balancing
- **Rolling Updates:** Zero-downtime deployments
- **Resource Management:** CPU and memory limits

---

## Implementation Steps

### Step 1: Local Kubernetes Setup (Minikube/Kind)

**Install Minikube:**

```bash
# Windows (using Chocolatey)
choco install minikube

# Start Minikube
minikube start --cpus=4 --memory=8192 --driver=docker

# Verify
kubectl cluster-info
kubectl get nodes
```

**Or use Kind (Kubernetes in Docker):**

```bash
# Install Kind
choco install kind

# Create cluster
kind create cluster --name ecommerce --config kind-config.yaml
```

**Create `kind-config.yaml`:**

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
  - role: worker
```

### Step 2: Namespace Setup

**Create `k8s/namespaces/namespaces.yaml`:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ecommerce-prod
  labels:
    environment: production
    team: backend
---
apiVersion: v1
kind: Namespace
metadata:
  name: ecommerce-staging
  labels:
    environment: staging
    team: backend
---
apiVersion: v1
kind: Namespace
metadata:
  name: ecommerce-dev
  labels:
    environment: development
    team: backend
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    purpose: monitoring
---
apiVersion: v1
kind: Namespace
metadata:
  name: kafka
  labels:
    purpose: messaging
```

**Apply namespaces:**

```bash
kubectl apply -f k8s/namespaces/namespaces.yaml
```

### Step 3: Resource Quotas

**Create `k8s/namespaces/resource-quotas.yaml`:**

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: ecommerce-prod
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "5"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-limits
  namespace: ecommerce-prod
spec:
  limits:
    - max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: "100m"
        memory: 128Mi
      default:
        cpu: "500m"
        memory: 512Mi
      defaultRequest:
        cpu: "250m"
        memory: 256Mi
      type: Container
```

### Step 4: ConfigMaps and Secrets

**Create `k8s/config/configmap.yaml`:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: ecommerce-prod
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  KAFKA_BROKERS: "kafka-0.kafka-headless.kafka.svc.cluster.local:9092,kafka-1.kafka-headless.kafka.svc.cluster.local:9092,kafka-2.kafka-headless.kafka.svc.cluster.local:9092"
  REDIS_HOST: "redis-master.ecommerce-prod.svc.cluster.local"
  REDIS_PORT: "6379"
  MONGODB_URI: "mongodb://mongo-0.mongo-headless.ecommerce-prod.svc.cluster.local:27017,mongo-1.mongo-headless.ecommerce-prod.svc.cluster.local:27017,mongo-2.mongo-headless.ecommerce-prod.svc.cluster.local:27017/ecommerce?replicaSet=rs0"
```

**Create secrets (using kubectl):**

```bash
# Create secret for JWT
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=your-super-secret-key \
  --namespace=ecommerce-prod

# Create secret for Stripe
kubectl create secret generic stripe-secret \
  --from-literal=STRIPE_SECRET_KEY=sk_live_... \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_... \
  --namespace=ecommerce-prod

# Create secret for AWS
kubectl create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=AKIA... \
  --from-literal=AWS_SECRET_ACCESS_KEY=... \
  --namespace=ecommerce-prod
```

### Step 5: Persistent Volumes

**Create `k8s/storage/persistent-volumes.yaml`:**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mongodb-pv-0
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd
  hostPath:
    path: /mnt/data/mongodb-0
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc-0
  namespace: ecommerce-prod
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
```

### Step 6: Helm Setup

**Install Helm:**

```bash
choco install kubernetes-helm

# Verify
helm version
```

**Create Helm chart structure:**

```bash
helm create ecommerce-backend

# Directory structure:
ecommerce-backend/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── hpa.yaml
```

**Create `ecommerce-backend/Chart.yaml`:**

```yaml
apiVersion: v2
name: ecommerce-backend
description: E-Commerce Backend Microservices
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - ecommerce
  - microservices
  - nodejs
maintainers:
  - name: Backend Team
    email: backend@example.com
```

**Create `ecommerce-backend/values.yaml`:**

```yaml
replicaCount: 3

image:
  repository: your-registry/ecommerce-backend
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-tls
      hosts:
        - api.yourdomain.com

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}
```

### Step 7: Production Cluster Setup (AWS EKS)

**Install eksctl:**

```bash
choco install eksctl
```

**Create `eks-cluster.yaml`:**

```yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: ecommerce-prod
  region: ap-south-1
  version: "1.28"

vpc:
  cidr: 10.0.0.0/16
  nat:
    gateway: HighlyAvailable

managedNodeGroups:
  - name: core-services
    instanceType: t3.large
    desiredCapacity: 3
    minSize: 3
    maxSize: 10
    volumeSize: 100
    labels:
      role: core
    tags:
      nodegroup-role: core-services

  - name: worker-services
    instanceType: t3.medium
    desiredCapacity: 5
    minSize: 3
    maxSize: 20
    volumeSize: 50
    labels:
      role: worker
    tags:
      nodegroup-role: worker-services

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver

iam:
  withOIDC: true
  serviceAccounts:
    - metadata:
        name: ecommerce-sa
        namespace: ecommerce-prod
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonS3FullAccess
        - arn:aws:iam::aws:policy/AmazonSESFullAccess
```

**Create cluster:**

```bash
eksctl create cluster -f eks-cluster.yaml
```

### Step 8: Monitoring Setup

**Install Prometheus and Grafana using Helm:**

```bash
# Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi

# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  --set adminPassword=admin
```

### Step 9: Ingress Controller

**Install NGINX Ingress Controller:**

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.service.type=LoadBalancer
```

### Step 10: kubectl Configuration

**Create useful aliases:**

```bash
# Add to ~/.bashrc or ~/.zshrc
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kl='kubectl logs'
alias kex='kubectl exec -it'
alias kdel='kubectl delete'
alias kdes='kubectl describe'
```

**Create helper scripts:**

**Create `scripts/k8s/deploy.sh`:**

```bash
#!/bin/bash

NAMESPACE=${1:-ecommerce-prod}
ENVIRONMENT=${2:-production}

echo "Deploying to namespace: $NAMESPACE"

# Apply configurations
kubectl apply -f k8s/namespaces/ -n $NAMESPACE
kubectl apply -f k8s/config/ -n $NAMESPACE

# Deploy using Helm
helm upgrade --install ecommerce-backend ./ecommerce-backend \
  --namespace $NAMESPACE \
  --values ./ecommerce-backend/values-$ENVIRONMENT.yaml \
  --wait \
  --timeout 10m

echo "Deployment complete!"
```

---

## Testing

**Verify cluster:**

```bash
# Check nodes
kubectl get nodes

# Check namespaces
kubectl get namespaces

# Check resource quotas
kubectl get resourcequota -n ecommerce-prod

# Check storage
kubectl get pv
kubectl get pvc -n ecommerce-prod
```

---

## Deliverables

- [ ] Kubernetes cluster (local + production)
- [ ] Namespaces configured
- [ ] Resource quotas set
- [ ] ConfigMaps and Secrets created
- [ ] Persistent volumes configured
- [ ] Helm charts created
- [ ] Monitoring installed
- [ ] Ingress controller setup
- [ ] kubectl configured
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 2: Containerize All Services**
2. Deploy first service to Kubernetes
3. Setup CI/CD pipeline

---

**Task Owner:** DevOps Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
