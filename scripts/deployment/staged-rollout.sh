#!/bin/bash

# Staged Production Rollout Script
# Executes blue-green deployment with progressive traffic shifting

set -e

SERVICE_NAME=${1:-"core-service"}
NEW_VERSION=${2:-"v2.0.0"}
NAMESPACE="ecommerce-prod"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "Staged Production Rollout"
echo "========================================="
echo "Service: $SERVICE_NAME"
echo "New Version: $NEW_VERSION"
echo "Namespace: $NAMESPACE"
echo ""

# Pre-rollout checks
echo -e "${BLUE}=== 1. Pre-Rollout Checks ===${NC}"
echo ""

echo "  Verifying current blue deployment..."
if ! kubectl get deployment ${SERVICE_NAME}-blue -n $NAMESPACE &> /dev/null; then
    echo -e "${RED}✗ Blue deployment not found${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Blue deployment exists${NC}"

echo "  Checking backup status..."
echo -e "${GREEN}  ✓ Backup verification skipped (manual check required)${NC}"

echo "  Verifying monitoring systems..."
if kubectl get pods -n monitoring -l app=prometheus | grep -q Running; then
    echo -e "${GREEN}  ✓ Prometheus is running${NC}"
else
    echo -e "${YELLOW}  ⚠ Prometheus not accessible${NC}"
fi

if kubectl get pods -n monitoring -l app=grafana | grep -q Running; then
    echo -e "${GREEN}  ✓ Grafana is running${NC}"
else
    echo -e "${YELLOW}  ⚠ Grafana not accessible${NC}"
fi

# Deploy green version
echo ""
echo -e "${BLUE}=== 2. Deploying Green Version ===${NC}"
echo ""

echo "  Applying green deployment..."
kubectl apply -f k8s/deployments/blue-green/core-service-green.yaml

echo "  Waiting for green pods to be ready..."
kubectl wait --for=condition=ready pod \
    -l app=$SERVICE_NAME,version=green \
    -n $NAMESPACE \
    --timeout=300s || {
        echo -e "${RED}✗ Green pods failed to become ready${NC}"
        exit 1
    }

echo -e "${GREEN}  ✓ Green deployment ready${NC}"

# Run smoke tests on green
echo ""
echo -e "${BLUE}=== 3. Running Smoke Tests on Green ===${NC}"
echo ""

GREEN_POD=$(kubectl get pod -n $NAMESPACE -l app=$SERVICE_NAME,version=green -o jsonpath='{.items[0].metadata.name}')

if [ -z "$GREEN_POD" ]; then
    echo -e "${RED}✗ No green pods found${NC}"
    exit 1
fi

echo "  Testing health endpoint..."
if kubectl exec -n $NAMESPACE $GREEN_POD -- curl -sf http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}  ✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    exit 1
fi

echo "  Testing readiness endpoint..."
if kubectl exec -n $NAMESPACE $GREEN_POD -- curl -sf http://localhost:3000/ready > /dev/null; then
    echo -e "${GREEN}  ✓ Readiness check passed${NC}"
else
    echo -e "${RED}✗ Readiness check failed${NC}"
    exit 1
fi

# Start canary rollout
echo ""
echo -e "${BLUE}=== 4. Starting Progressive Traffic Shifting ===${NC}"
echo ""

npx ts-node scripts/deployment/traffic-shifter.ts $SERVICE_NAME $NEW_VERSION

# Verify rollout success
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${BLUE}=== 5. Rollout Successful - Cleaning Up ===${NC}"
    echo ""
    
    echo "  Scaling down blue deployment..."
    kubectl scale deployment ${SERVICE_NAME}-blue -n $NAMESPACE --replicas=0
    
    echo "  Waiting 5 minutes before cleanup..."
    sleep 300
    
    echo "  Deleting blue deployment..."
    kubectl delete deployment ${SERVICE_NAME}-blue -n $NAMESPACE
    
    echo "  Renaming green to blue for next deployment..."
    kubectl patch deployment ${SERVICE_NAME}-green -n $NAMESPACE \
        -p '{"metadata":{"name":"'${SERVICE_NAME}'-blue"}}'
    
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ Staged Rollout Completed Successfully!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "New version $NEW_VERSION is now serving 100% of traffic"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ Rollout Failed${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo "Check logs for details:"
    echo "  kubectl logs -n $NAMESPACE -l app=$SERVICE_NAME,version=green"
    exit 1
fi
