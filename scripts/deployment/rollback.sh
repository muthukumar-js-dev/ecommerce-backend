#!/bin/bash

# Emergency Rollback Script
# Quickly reverts to previous stable version

set -e

SERVICE_NAME=${1:-"core-service"}
NAMESPACE="ecommerce-prod"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "Emergency Rollback"
echo "========================================="
echo "Service: $SERVICE_NAME"
echo "Namespace: $NAMESPACE"
echo ""

echo -e "${YELLOW}⚠️  WARNING: This will immediately revert to the blue (stable) version${NC}"
echo ""
read -p "Continue with rollback? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

echo ""
echo -e "${RED}=== 1. Reverting Traffic to Blue ===${NC}"
echo ""

# Shift all traffic back to blue
kubectl patch service $SERVICE_NAME -n $NAMESPACE --type=json -p='[
    {
        "op": "replace",
        "path": "/spec/selector/version",
        "value": "blue"
    }
]'

echo -e "${GREEN}  ✓ Traffic reverted to blue version${NC}"

echo ""
echo -e "${RED}=== 2. Scaling Down Green Deployment ===${NC}"
echo ""

# Scale down green deployment
kubectl scale deployment ${SERVICE_NAME}-green -n $NAMESPACE --replicas=0

echo -e "${GREEN}  ✓ Green deployment scaled to 0${NC}"

echo ""
echo -e "${RED}=== 3. Verifying Blue Deployment ===${NC}"
echo ""

# Check blue deployment health
BLUE_READY=$(kubectl get deployment ${SERVICE_NAME}-blue -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
BLUE_DESIRED=$(kubectl get deployment ${SERVICE_NAME}-blue -n $NAMESPACE -o jsonpath='{.spec.replicas}')

echo "  Blue deployment: $BLUE_READY/$BLUE_DESIRED pods ready"

if [ "$BLUE_READY" == "$BLUE_DESIRED" ]; then
    echo -e "${GREEN}  ✓ Blue deployment is healthy${NC}"
else
    echo -e "${YELLOW}  ⚠ Blue deployment may not be fully ready${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Rollback Completed${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "All traffic is now routed to the blue (stable) version"
echo ""
echo "Next steps:"
echo "  1. Investigate the issue with green deployment"
echo "  2. Review logs: kubectl logs -n $NAMESPACE -l app=$SERVICE_NAME,version=green"
echo "  3. Delete green deployment when ready: kubectl delete deployment ${SERVICE_NAME}-green -n $NAMESPACE"
