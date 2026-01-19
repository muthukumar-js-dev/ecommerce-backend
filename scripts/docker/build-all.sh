#!/bin/bash

# Build All Services Script
# Usage: ./build-all.sh [version] [registry]

set -e

VERSION=${1:-latest}
REGISTRY=${2:-123456789012.dkr.ecr.ap-south-1.amazonaws.com}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICES=("core-service" "payment-service" "notification-service")

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building All Services${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Version: ${VERSION}"
echo "Registry: ${REGISTRY}"
echo ""

# Build each service
for SERVICE in "${SERVICES[@]}"; do
  echo -e "${YELLOW}Building ${SERVICE}...${NC}"
  bash scripts/docker/build-and-push.sh ${SERVICE} ${VERSION} ${REGISTRY}
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to build ${SERVICE}${NC}"
    exit 1
  fi
  
  echo ""
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Services Built Successfully${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Built services:"
for SERVICE in "${SERVICES[@]}"; do
  echo "  ✓ ${SERVICE}"
done
echo ""
