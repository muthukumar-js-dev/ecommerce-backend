#!/bin/bash

# Test Docker Images Script
# Tests built images for size, health checks, and basic functionality

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SERVICES=("core-service" "payment-service" "notification-service")
PORTS=("3000" "3001" "3002")
MAX_SIZE_MB=200

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Testing Docker Images${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Test each service
for i in "${!SERVICES[@]}"; do
  SERVICE="${SERVICES[$i]}"
  PORT="${PORTS[$i]}"
  IMAGE="ecommerce/${SERVICE}:test"
  
  echo -e "${YELLOW}Testing ${SERVICE}...${NC}"
  
  # Check if image exists
  if ! docker images ${IMAGE} --format "{{.Repository}}:{{.Tag}}" | grep -q ${IMAGE}; then
    echo -e "${RED}✗ Image not found: ${IMAGE}${NC}"
    echo "  Build it first with: docker build -t ${IMAGE} ."
    continue
  fi
  
  # Check image size
  SIZE=$(docker images ${IMAGE} --format "{{.Size}}")
  SIZE_MB=$(docker images ${IMAGE} --format "{{.Size}}" | sed 's/MB//' | sed 's/GB/*1000/' | bc 2>/dev/null || echo "0")
  
  echo "  Image size: ${SIZE}"
  
  if (( $(echo "$SIZE_MB > $MAX_SIZE_MB" | bc -l 2>/dev/null || echo "0") )); then
    echo -e "  ${YELLOW}⚠ Warning: Image size exceeds ${MAX_SIZE_MB}MB${NC}"
  else
    echo -e "  ${GREEN}✓ Image size OK${NC}"
  fi
  
  # Test container startup
  echo "  Starting container..."
  CONTAINER_ID=$(docker run -d -p ${PORT}:${PORT} ${IMAGE})
  
  if [ -z "$CONTAINER_ID" ]; then
    echo -e "  ${RED}✗ Failed to start container${NC}"
    continue
  fi
  
  # Wait for container to be ready
  echo "  Waiting for service to start..."
  sleep 10
  
  # Check if container is still running
  if ! docker ps | grep -q ${CONTAINER_ID}; then
    echo -e "  ${RED}✗ Container exited${NC}"
    echo "  Logs:"
    docker logs ${CONTAINER_ID}
    docker rm ${CONTAINER_ID} 2>/dev/null || true
    continue
  fi
  
  # Test health endpoint
  echo "  Testing health endpoint..."
  if curl -f http://localhost:${PORT}/health &> /dev/null; then
    echo -e "  ${GREEN}✓ Health check passed${NC}"
  else
    echo -e "  ${RED}✗ Health check failed${NC}"
  fi
  
  # Cleanup
  echo "  Cleaning up..."
  docker stop ${CONTAINER_ID} > /dev/null
  docker rm ${CONTAINER_ID} > /dev/null
  
  echo -e "${GREEN}✓ ${SERVICE} test complete${NC}"
  echo ""
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Testing Complete${NC}"
echo -e "${GREEN}========================================${NC}"
