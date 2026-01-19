#!/bin/bash

# Deployment script for E-Commerce Backend
# Usage: ./deploy.sh [namespace] [environment] [image-tag]

set -e

# Default values
NAMESPACE=${1:-ecommerce-prod}
ENVIRONMENT=${2:-production}
IMAGE_TAG=${3:-latest}

echo "========================================="
echo "E-Commerce Backend Deployment"
echo "========================================="
echo "Namespace: $NAMESPACE"
echo "Environment: $ENVIRONMENT"
echo "Image Tag: $IMAGE_TAG"
echo "========================================="

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo "Error: helm is not installed"
    exit 1
fi

# Check cluster connection
echo "Checking cluster connection..."
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: Cannot connect to Kubernetes cluster"
    exit 1
fi

echo "✓ Connected to cluster"

# Create namespace if it doesn't exist
echo "Creating namespace if not exists..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
echo "✓ Namespace ready"

# Apply namespaces and resource quotas
echo "Applying namespaces and resource quotas..."
kubectl apply -f k8s/namespaces/namespaces.yaml
kubectl apply -f k8s/namespaces/resource-quotas.yaml
echo "✓ Namespaces and quotas applied"

# Apply ConfigMaps
echo "Applying ConfigMaps..."
kubectl apply -f k8s/config/configmap.yaml
echo "✓ ConfigMaps applied"

# Check if secrets exist
echo "Checking secrets..."
SECRETS=("jwt-secret" "stripe-secret" "aws-credentials")
MISSING_SECRETS=()

for secret in "${SECRETS[@]}"; do
    if ! kubectl get secret $secret -n $NAMESPACE &> /dev/null; then
        MISSING_SECRETS+=($secret)
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo "Warning: The following secrets are missing:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "  - $secret"
    done
    echo "Please create them before proceeding. See k8s/config/secrets-template.yaml"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy using Helm
echo "Deploying application using Helm..."
helm upgrade --install ecommerce-backend ./helm/ecommerce-backend \
  --namespace $NAMESPACE \
  --values ./helm/ecommerce-backend/values-$ENVIRONMENT.yaml \
  --set image.tag=$IMAGE_TAG \
  --wait \
  --timeout 10m

echo "✓ Application deployed"

# Wait for rollout
echo "Waiting for deployment rollout..."
kubectl rollout status deployment/ecommerce-backend -n $NAMESPACE --timeout=5m
echo "✓ Deployment ready"

# Get deployment status
echo ""
echo "========================================="
echo "Deployment Status"
echo "========================================="
kubectl get pods -n $NAMESPACE
echo ""
kubectl get svc -n $NAMESPACE
echo ""
kubectl get ingress -n $NAMESPACE

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="

# Get ingress URL
INGRESS_HOST=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].spec.rules[0].host}')
if [ ! -z "$INGRESS_HOST" ]; then
    echo "Application URL: https://$INGRESS_HOST"
fi

echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/ecommerce-backend -n $NAMESPACE"
echo ""
echo "To scale deployment:"
echo "  kubectl scale deployment/ecommerce-backend --replicas=5 -n $NAMESPACE"
echo ""
