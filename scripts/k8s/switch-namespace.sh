#!/bin/bash

# Quick namespace switching script
# Usage: ./switch-namespace.sh [namespace]

NAMESPACE=${1}

if [ -z "$NAMESPACE" ]; then
    echo "Current namespace:"
    kubectl config view --minify --output 'jsonpath={..namespace}'
    echo ""
    echo ""
    echo "Available namespaces:"
    kubectl get namespaces
    echo ""
    echo "Usage: ./switch-namespace.sh [namespace]"
    exit 0
fi

# Switch namespace
kubectl config set-context --current --namespace=$NAMESPACE

echo "✓ Switched to namespace: $NAMESPACE"
echo ""
echo "Current context:"
kubectl config get-contexts $(kubectl config current-context)
