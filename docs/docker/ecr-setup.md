# AWS ECR Setup Guide

## Overview

This guide covers setting up Amazon Elastic Container Registry (ECR) for storing Docker images of the e-commerce backend microservices.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally

## Installation

### Install AWS CLI

**Windows (using Chocolatey):**
```powershell
choco install awscli
```

**Verify installation:**
```bash
aws --version
```

### Configure AWS CLI

```bash
aws configure
```

Enter your credentials:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `ap-south-1`
- Default output format: `json`

## Creating ECR Repositories

### Create Repositories for All Services

```bash
# Core Service
aws ecr create-repository \
  --repository-name ecommerce/core-service \
  --region ap-south-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Payment Service
aws ecr create-repository \
  --repository-name ecommerce/payment-service \
  --region ap-south-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Notification Service
aws ecr create-repository \
  --repository-name ecommerce/notification-service \
  --region ap-south-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

### Verify Repositories

```bash
aws ecr describe-repositories --region ap-south-1
```

## Repository Configuration

### Enable Image Scanning

```bash
aws ecr put-image-scanning-configuration \
  --repository-name ecommerce/core-service \
  --image-scanning-configuration scanOnPush=true \
  --region ap-south-1
```

### Set Lifecycle Policy

**Create lifecycle policy file (`lifecycle-policy.json`):**

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Remove untagged images older than 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

**Apply lifecycle policy:**

```bash
aws ecr put-lifecycle-policy \
  --repository-name ecommerce/core-service \
  --lifecycle-policy-text file://lifecycle-policy.json \
  --region ap-south-1
```

### Set Repository Policy

**Create repository policy file (`repository-policy.json`):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPushPull",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::123456789012:user/ci-cd-user",
          "arn:aws:iam::123456789012:role/EKSNodeRole"
        ]
      },
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ]
    }
  ]
}
```

**Apply repository policy:**

```bash
aws ecr set-repository-policy \
  --repository-name ecommerce/core-service \
  --policy-text file://repository-policy.json \
  --region ap-south-1
```

## Authentication

### Login to ECR

```bash
# Get login password and pipe to docker login
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com
```

**Note:** Replace `123456789012` with your AWS account ID.

### Get Account ID

```bash
aws sts get-caller-identity --query Account --output text
```

### Create Login Script

**Create `scripts/docker/ecr-login.sh`:**

```bash
#!/bin/bash

REGION=${1:-ap-south-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Logging in to ECR..."
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"

aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

if [ $? -eq 0 ]; then
  echo "✓ Successfully logged in to ECR"
else
  echo "✗ Failed to login to ECR"
  exit 1
fi
```

**Make executable:**

```bash
chmod +x scripts/docker/ecr-login.sh
```

**Usage:**

```bash
bash scripts/docker/ecr-login.sh ap-south-1
```

## Pushing Images

### Tag Image for ECR

```bash
# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Tag image
docker tag ecommerce/core-service:latest \
  ${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/ecommerce/core-service:latest
```

### Push Image

```bash
docker push ${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/ecommerce/core-service:latest
```

### Using Build Script

```bash
# Build and push
bash scripts/docker/build-and-push.sh core-service v1.0.0 ${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com
```

## Pulling Images

### Pull from ECR

```bash
# Login first
bash scripts/docker/ecr-login.sh

# Pull image
docker pull ${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/ecommerce/core-service:latest
```

## IAM Permissions

### Required Permissions for CI/CD User

**Create IAM policy (`ecr-push-pull-policy.json`):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetRepositoryPolicy",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": [
        "arn:aws:ecr:ap-south-1:123456789012:repository/ecommerce/*"
      ]
    }
  ]
}
```

**Create and attach policy:**

```bash
# Create policy
aws iam create-policy \
  --policy-name ECRPushPullPolicy \
  --policy-document file://ecr-push-pull-policy.json

# Attach to user
aws iam attach-user-policy \
  --user-name ci-cd-user \
  --policy-arn arn:aws:iam::123456789012:policy/ECRPushPullPolicy
```

## Cross-Region Replication

### Enable Replication

```bash
# Create replication configuration
aws ecr put-replication-configuration \
  --replication-configuration file://replication-config.json \
  --region ap-south-1
```

**replication-config.json:**

```json
{
  "rules": [
    {
      "destinations": [
        {
          "region": "us-east-1",
          "registryId": "123456789012"
        }
      ]
    }
  ]
}
```

## Monitoring and Logging

### Enable CloudWatch Logs

ECR automatically logs to CloudWatch. View logs:

```bash
aws logs tail /aws/ecr/ecommerce/core-service --follow
```

### View Image Scan Results

```bash
aws ecr describe-image-scan-findings \
  --repository-name ecommerce/core-service \
  --image-id imageTag=latest \
  --region ap-south-1
```

## Cost Optimization

### Lifecycle Policies

Automatically delete old images to reduce storage costs:

```bash
# Apply lifecycle policy (see above)
aws ecr put-lifecycle-policy \
  --repository-name ecommerce/core-service \
  --lifecycle-policy-text file://lifecycle-policy.json
```

### Monitor Storage Usage

```bash
# List images with size
aws ecr list-images \
  --repository-name ecommerce/core-service \
  --region ap-south-1
```

## Cleanup

### Delete Repository

```bash
# Delete repository (WARNING: This deletes all images)
aws ecr delete-repository \
  --repository-name ecommerce/core-service \
  --region ap-south-1 \
  --force
```

### Delete Specific Image

```bash
aws ecr batch-delete-image \
  --repository-name ecommerce/core-service \
  --image-ids imageTag=v1.0.0 \
  --region ap-south-1
```

## Troubleshooting

### Authentication Issues

```bash
# Check credentials
aws sts get-caller-identity

# Re-login
bash scripts/docker/ecr-login.sh
```

### Permission Denied

```bash
# Check IAM permissions
aws iam get-user-policy --user-name ci-cd-user --policy-name ECRPushPullPolicy
```

### Repository Not Found

```bash
# List repositories
aws ecr describe-repositories --region ap-south-1

# Create if missing
aws ecr create-repository --repository-name ecommerce/core-service
```

## Best Practices

1. **Enable image scanning** - Detect vulnerabilities automatically
2. **Use lifecycle policies** - Automatically clean up old images
3. **Tag images properly** - Use semantic versioning
4. **Enable encryption** - Use AES256 encryption
5. **Set repository policies** - Control access
6. **Monitor costs** - Review storage usage regularly
7. **Use IAM roles** - For EKS pods (IRSA)
8. **Enable replication** - For disaster recovery

## Additional Resources

- [ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [ECR Best Practices](https://docs.aws.amazon.com/AmazonECR/latest/userguide/best-practices.html)
- [ECR Pricing](https://aws.amazon.com/ecr/pricing/)
