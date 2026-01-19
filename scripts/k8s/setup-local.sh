#!/bin/bash

# Local Kubernetes cluster setup using Kind
# This script creates a Kind cluster and installs necessary components

set -e

echo "========================================="
echo "Setting up Local Kubernetes Cluster"
echo "========================================="

# Check if Kind is installed
if ! command -v kind &> /dev/null; then
    echo "Error: Kind is not installed"
    echo "Install with: choco install kind"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    echo "Install with: choco install kubernetes-cli"
    exit 1
fi

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo "Error: Helm is not installed"
    echo "Install with: choco install kubernetes-helm"
    exit 1
fi

# Delete existing cluster if it exists
if kind get clusters | grep -q "ecommerce"; then
    echo "Deleting existing cluster..."
    kind delete cluster --name ecommerce
fi

# Create Kind cluster
echo "Creating Kind cluster..."
kind create cluster --name ecommerce --config k8s/kind-config.yaml
echo "✓ Cluster created"

# Wait for cluster to be ready
echo "Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s
echo "✓ Cluster ready"

# Create namespaces
echo "Creating namespaces..."
kubectl apply -f k8s/namespaces/namespaces.yaml
echo "✓ Namespaces created"

# Apply resource quotas
echo "Applying resource quotas..."
kubectl apply -f k8s/namespaces/resource-quotas.yaml
echo "✓ Resource quotas applied"

# Apply ConfigMaps
echo "Applying ConfigMaps..."
kubectl apply -f k8s/config/configmap.yaml
echo "✓ ConfigMaps applied"

# Apply storage classes and persistent volumes
echo "Creating storage resources..."
kubectl apply -f k8s/storage/storage-class.yaml
kubectl apply -f k8s/storage/persistent-volumes.yaml
echo "✓ Storage resources created"

# Install NGINX Ingress Controller
echo "Installing NGINX Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443 \
  --wait

echo "✓ NGINX Ingress Controller installed"

# Install Prometheus and Grafana
echo "Installing Prometheus and Grafana..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Update prometheus-values.yaml for local development
sed -i 's/ebs-gp3/fast-ssd/g' k8s/monitoring/prometheus-values.yaml

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus-values.yaml \
  --wait

echo "✓ Monitoring stack installed"

# Get Grafana admin password
GRAFANA_PASSWORD=$(kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode)

echo ""
echo "========================================="
echo "Local Cluster Setup Complete!"
echo "========================================="
echo ""
echo "Cluster Info:"
kubectl cluster-info
echo ""
echo "Nodes:"
kubectl get nodes
echo ""
echo "Namespaces:"
kubectl get namespaces
echo ""
echo "========================================="
echo "Access Information"
echo "========================================="
echo ""
echo "Ingress HTTP:  http://localhost:30080"
echo "Ingress HTTPS: https://localhost:30443"
echo ""
echo "Grafana:"
echo "  URL: http://localhost:3001 (after port-forward)"
echo "  Username: admin"
echo "  Password: $GRAFANA_PASSWORD"
echo ""
echo "To access Grafana:"
echo "  kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80"
echo ""
echo "To access Prometheus:"
echo "  kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo ""
echo "========================================="
echo "Next Steps"
echo "========================================="
echo ""
echo "1. Create secrets (see k8s/config/secrets-template.yaml)"
echo "2. Deploy application: ./scripts/k8s/deploy.sh ecommerce-dev development"
echo "3. Access application at http://localhost:30080"
echo ""
