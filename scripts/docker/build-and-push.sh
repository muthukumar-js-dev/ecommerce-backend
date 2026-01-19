#!/bin/bash

# Build and Push Docker Images Script
# Usage: ./build-and-push.sh <service-name> [version] [registry]

set -e

SERVICE_NAME=${1}
VERSION=${2:-latest}
REGISTRY=${3:-123456789012.dkr.ecr.ap-south-1.amazonaws.com}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$SERVICE_NAME" ]; then
  echo -e "${RED}Error: Service name is required${NC}"
  echo "Usage: ./build-and-push.sh <service-name> [version] [registry]"
  echo ""
  echo "Available services:"
  echo "  - core-service"
  echo "  - payment-service"
  echo "  - notification-service"
  exit 1
fi

IMAGE_NAME="${REGISTRY}/ecommerce/${SERVICE_NAME}"
IMAGE_TAG="${IMAGE_NAME}:${VERSION}"
IMAGE_LATEST="${IMAGE_NAME}:latest"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building ${SERVICE_NAME}${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Image: ${IMAGE_TAG}"
echo "Latest: ${IMAGE_LATEST}"
echo ""

# Determine build context
if [ "$SERVICE_NAME" = "core-service" ]; then
  BUILD_CONTEXT="."
  DOCKERFILE="Dockerfile"
else
  BUILD_CONTEXT="./${SERVICE_NAME}"
  DOCKERFILE="${SERVICE_NAME}/Dockerfile"
fi

# Check if Dockerfile exists
if [ ! -f "$DOCKERFILE" ]; then
  echo -e "${RED}Error: Dockerfile not found at ${DOCKERFILE}${NC}"
  exit 1
fi

# Build image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build \
  -t ${IMAGE_TAG} \
  -t ${IMAGE_LATEST} \
  -f ${DOCKERFILE} \
  ${BUILD_CONTEXT}

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Docker build failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Check image size
IMAGE_SIZE=$(docker images ${IMAGE_TAG} --format "{{.Size}}")
echo "Image size: ${IMAGE_SIZE}"
echo ""

# Security scan with Trivy (if available)
if command -v trivy &> /dev/null; then
  echo -e "${YELLOW}Scanning image for vulnerabilities...${NC}"
  trivy image --severity HIGH,CRITICAL ${IMAGE_TAG}
  
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Security scan found vulnerabilities${NC}"
    read -p "Continue with push? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${RED}Push cancelled${NC}"
      exit 1
    fi
  else
    echo -e "${GREEN}✓ No critical vulnerabilities found${NC}"
  fi
  echo ""
else
  echo -e "${YELLOW}Warning: Trivy not installed, skipping security scan${NC}"
  echo "Install with: choco install trivy"
  echo ""
fi

# Push to registry
if [ "$REGISTRY" != "local-registry" ]; then
  echo -e "${YELLOW}Pushing to registry...${NC}"
  
  # Push versioned tag
  docker push ${IMAGE_TAG}
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to push ${IMAGE_TAG}${NC}"
    exit 1
  fi
  
  # Push latest tag
  if [ "$VERSION" != "latest" ]; then
    docker push ${IMAGE_LATEST}
    if [ $? -ne 0 ]; then
      echo -e "${RED}Error: Failed to push ${IMAGE_LATEST}${NC}"
      exit 1
    fi
  fi
  
  echo -e "${GREEN}✓ Push successful${NC}"
else
  echo -e "${YELLOW}Skipping push (local registry)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Successfully built and pushed ${SERVICE_NAME}${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Image: ${IMAGE_TAG}"
echo "Size: ${IMAGE_SIZE}"
echo ""
