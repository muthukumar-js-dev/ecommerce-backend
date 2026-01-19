#!/bin/bash

# ECR Login Script
# Usage: ./ecr-login.sh [region]

set -e

REGION=${1:-ap-south-1}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Logging in to AWS ECR...${NC}"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)

if [ -z "$ACCOUNT_ID" ]; then
  echo -e "${RED}Error: Failed to get AWS account ID${NC}"
  echo "Please configure AWS CLI with: aws configure"
  exit 1
fi

echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo ""

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Successfully logged in to ECR${NC}"
  echo "Registry: ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
else
  echo -e "${RED}✗ Failed to login to ECR${NC}"
  exit 1
fi
