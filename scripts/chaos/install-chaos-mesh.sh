#!/bin/bash

# Chaos Mesh Installation Script
# Installs Chaos Mesh for chaos engineering experiments

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Installing Chaos Mesh${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo -e "${RED}✗ Helm is not installed${NC}"
    echo "Please install Helm: https://helm.sh/docs/intro/install/"
    exit 1
fi

echo -e "${GREEN}✓ Helm is installed${NC}"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}✗ kubectl is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ kubectl is installed${NC}"
echo ""

# Add Chaos Mesh Helm repository
echo -e "${BLUE}=== 1. Adding Chaos Mesh Helm Repository ===${NC}"
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update
echo -e "${GREEN}✓ Helm repository added${NC}"
echo ""

# Create namespace
echo -e "${BLUE}=== 2. Creating Namespace ===${NC}"
kubectl create namespace chaos-testing --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✓ Namespace created${NC}"
echo ""

# Install Chaos Mesh
echo -e "${BLUE}=== 3. Installing Chaos Mesh ===${NC}"
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace=chaos-testing \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock \
  --set dashboard.create=true \
  --set dashboard.securityMode=false \
  --version 2.5.0

echo -e "${GREEN}✓ Chaos Mesh installed${NC}"
echo ""

# Wait for deployment
echo -e "${BLUE}=== 4. Waiting for Pods to be Ready ===${NC}"
kubectl wait --for=condition=Ready pods --all -n chaos-testing --timeout=300s

echo -e "${GREEN}✓ All pods are ready${NC}"
echo ""

# Verify installation
echo -e "${BLUE}=== 5. Verifying Installation ===${NC}"
kubectl get pods -n chaos-testing

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ Chaos Mesh Installation Complete${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Display access information
echo -e "${YELLOW}Access Chaos Dashboard:${NC}"
echo "  kubectl port-forward -n chaos-testing svc/chaos-dashboard 2333:2333"
echo "  Then open: http://localhost:2333"
echo ""

echo -e "${YELLOW}Useful Commands:${NC}"
echo "  # List chaos experiments"
echo "  kubectl get podchaos,networkchaos,stresschaos -n chaos-testing"
echo ""
echo "  # View chaos dashboard"
echo "  kubectl get svc -n chaos-testing"
echo ""
echo "  # Uninstall Chaos Mesh"
echo "  helm uninstall chaos-mesh -n chaos-testing"
echo ""
