#!/bin/bash

# Cleanup script for Kubernetes resources
# Usage: ./cleanup.sh [cluster-type]
# cluster-type: kind (default) or eks

set -e

CLUSTER_TYPE=${1:-kind}

echo "========================================="
echo "Kubernetes Cluster Cleanup"
echo "========================================="
echo "Cluster Type: $CLUSTER_TYPE"
echo ""

read -p "This will delete all resources. Are you sure? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Cleanup cancelled"
    exit 0
fi

if [ "$CLUSTER_TYPE" == "kind" ]; then
    echo "Deleting Kind cluster..."
    kind delete cluster --name ecommerce
    echo "✓ Kind cluster deleted"
    
elif [ "$CLUSTER_TYPE" == "eks" ]; then
    echo "Deleting EKS cluster resources..."
    
    # Delete Helm releases
    echo "Deleting Helm releases..."
    helm uninstall ecommerce-backend -n ecommerce-prod --ignore-not-found
    helm uninstall prometheus -n monitoring --ignore-not-found
    helm uninstall ingress-nginx -n ingress-nginx --ignore-not-found
    helm uninstall cert-manager -n cert-manager --ignore-not-found
    
    # Delete namespaces (this will cascade delete all resources)
    echo "Deleting namespaces..."
    kubectl delete namespace ecommerce-prod --ignore-not-found
    kubectl delete namespace ecommerce-staging --ignore-not-found
    kubectl delete namespace ecommerce-dev --ignore-not-found
    kubectl delete namespace monitoring --ignore-not-found
    kubectl delete namespace kafka --ignore-not-found
    kubectl delete namespace ingress-nginx --ignore-not-found
    kubectl delete namespace cert-manager --ignore-not-found
    
    echo ""
    echo "To delete the EKS cluster completely, run:"
    echo "  eksctl delete cluster --name=ecommerce-prod --region=ap-south-1"
    echo ""
    
else
    echo "Unknown cluster type: $CLUSTER_TYPE"
    echo "Use 'kind' or 'eks'"
    exit 1
fi

echo ""
echo "========================================="
echo "Cleanup Complete!"
echo "========================================="
