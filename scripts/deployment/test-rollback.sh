#!/bin/bash

# Rollback Test Script
# Tests emergency rollback procedures

set -e

SERVICE_NAME=${1:-"core-service"}
NAMESPACE="ecommerce-staging"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "Rollback Procedure Test"
echo "========================================="
echo "Service: $SERVICE_NAME"
echo "Namespace: $NAMESPACE"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up test resources..."
    kubectl delete deployment ${SERVICE_NAME}-blue -n $NAMESPACE --ignore-not-found=true
    kubectl delete deployment ${SERVICE_NAME}-green -n $NAMESPACE --ignore-not-found=true
    kubectl delete service $SERVICE_NAME -n $NAMESPACE --ignore-not-found=true
}

# Set trap for cleanup
trap cleanup EXIT

echo -e "${BLUE}=== 1. Setting Up Test Environment ===${NC}"
echo ""

# Deploy blue (stable version)
echo "  Deploying blue (stable) version..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE_NAME}-blue
  namespace: $NAMESPACE
  labels:
    app: $SERVICE_NAME
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: $SERVICE_NAME
      version: blue
  template:
    metadata:
      labels:
        app: $SERVICE_NAME
        version: blue
    spec:
      containers:
        - name: $SERVICE_NAME
          image: nginx:1.21
          ports:
            - containerPort: 80
          env:
            - name: VERSION
              value: "blue-stable"
EOF

kubectl wait --for=condition=ready pod \
    -l app=$SERVICE_NAME,version=blue \
    -n $NAMESPACE \
    --timeout=60s

echo -e "${GREEN}  ✓ Blue deployment ready${NC}"

# Deploy green (new version)
echo "  Deploying green (new) version..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE_NAME}-green
  namespace: $NAMESPACE
  labels:
    app: $SERVICE_NAME
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: $SERVICE_NAME
      version: green
  template:
    metadata:
      labels:
        app: $SERVICE_NAME
        version: green
    spec:
      containers:
        - name: $SERVICE_NAME
          image: nginx:1.22
          ports:
            - containerPort: 80
          env:
            - name: VERSION
              value: "green-new"
EOF

kubectl wait --for=condition=ready pod \
    -l app=$SERVICE_NAME,version=green \
    -n $NAMESPACE \
    --timeout=60s

echo -e "${GREEN}  ✓ Green deployment ready${NC}"

# Create service pointing to green
echo "  Creating service pointing to green..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: $SERVICE_NAME
  namespace: $NAMESPACE
spec:
  selector:
    app: $SERVICE_NAME
    version: green
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
EOF

echo -e "${GREEN}  ✓ Service created (pointing to green)${NC}"

echo ""
echo -e "${BLUE}=== 2. Verifying Green is Active ===${NC}"
echo ""

CURRENT_VERSION=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}')
echo "  Current version: $CURRENT_VERSION"

if [ "$CURRENT_VERSION" == "green" ]; then
    echo -e "${GREEN}  ✓ Green version is active${NC}"
else
    echo -e "${RED}  ✗ Expected green, got: $CURRENT_VERSION${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}=== 3. Executing Emergency Rollback ===${NC}"
echo ""

START_TIME=$(date +%s)

echo "  Reverting traffic to blue..."
kubectl patch service $SERVICE_NAME -n $NAMESPACE --type=json -p='[
    {
        "op": "replace",
        "path": "/spec/selector/version",
        "value": "blue"
    }
]'

echo -e "${GREEN}  ✓ Traffic reverted to blue${NC}"

echo "  Scaling down green deployment..."
kubectl scale deployment ${SERVICE_NAME}-green -n $NAMESPACE --replicas=0

echo -e "${GREEN}  ✓ Green deployment scaled to 0${NC}"

END_TIME=$(date +%s)
ROLLBACK_TIME=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}=== 4. Verifying Rollback ===${NC}"
echo ""

# Verify service selector
CURRENT_VERSION=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.version}')
echo "  Current version: $CURRENT_VERSION"

if [ "$CURRENT_VERSION" == "blue" ]; then
    echo -e "${GREEN}  ✓ Rollback successful - traffic on blue${NC}"
else
    echo -e "${RED}  ✗ Rollback failed - current version: $CURRENT_VERSION${NC}"
    exit 1
fi

# Verify blue pods are healthy
BLUE_READY=$(kubectl get deployment ${SERVICE_NAME}-blue -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
BLUE_DESIRED=$(kubectl get deployment ${SERVICE_NAME}-blue -n $NAMESPACE -o jsonpath='{.spec.replicas}')

echo "  Blue deployment: $BLUE_READY/$BLUE_DESIRED pods ready"

if [ "$BLUE_READY" == "$BLUE_DESIRED" ]; then
    echo -e "${GREEN}  ✓ Blue deployment healthy${NC}"
else
    echo -e "${YELLOW}  ⚠ Blue deployment may not be fully ready${NC}"
fi

# Verify green is scaled down
GREEN_REPLICAS=$(kubectl get deployment ${SERVICE_NAME}-green -n $NAMESPACE -o jsonpath='{.spec.replicas}')

if [ "$GREEN_REPLICAS" == "0" ]; then
    echo -e "${GREEN}  ✓ Green deployment scaled to 0${NC}"
else
    echo -e "${RED}  ✗ Green deployment not scaled down${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Rollback Test PASSED${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Test Results:"
echo "  ✓ Environment setup successful"
echo "  ✓ Green version deployed and activated"
echo "  ✓ Emergency rollback executed"
echo "  ✓ Traffic reverted to blue"
echo "  ✓ Green deployment scaled down"
echo "  ✓ Blue deployment verified healthy"
echo ""
echo "Rollback Performance:"
echo "  Time taken: ${ROLLBACK_TIME} seconds"
if [ "$ROLLBACK_TIME" -lt 300 ]; then
    echo -e "  ${GREEN}✓ Rollback time < 5 minutes (target met)${NC}"
else
    echo -e "  ${YELLOW}⚠ Rollback time > 5 minutes${NC}"
fi
