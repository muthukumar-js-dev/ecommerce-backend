#!/bin/bash

# Cluster verification script
# Checks health and status of all cluster components

set -e

echo "========================================="
echo "Kubernetes Cluster Verification"
echo "========================================="

# Check cluster connection
echo "1. Checking cluster connection..."
if kubectl cluster-info &> /dev/null; then
    echo "✓ Cluster is accessible"
    kubectl cluster-info
else
    echo "✗ Cannot connect to cluster"
    exit 1
fi

echo ""

# Check nodes
echo "2. Checking nodes..."
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
READY_NODES=$(kubectl get nodes --no-headers | grep " Ready" | wc -l)

echo "Total nodes: $NODE_COUNT"
echo "Ready nodes: $READY_NODES"

if [ $NODE_COUNT -eq $READY_NODES ]; then
    echo "✓ All nodes are ready"
    kubectl get nodes
else
    echo "✗ Some nodes are not ready"
    kubectl get nodes
    exit 1
fi

echo ""

# Check namespaces
echo "3. Checking namespaces..."
EXPECTED_NAMESPACES=("ecommerce-prod" "ecommerce-staging" "ecommerce-dev" "monitoring" "kafka")
MISSING_NAMESPACES=()

for ns in "${EXPECTED_NAMESPACES[@]}"; do
    if ! kubectl get namespace $ns &> /dev/null; then
        MISSING_NAMESPACES+=($ns)
    fi
done

if [ ${#MISSING_NAMESPACES[@]} -eq 0 ]; then
    echo "✓ All expected namespaces exist"
    kubectl get namespaces
else
    echo "✗ Missing namespaces: ${MISSING_NAMESPACES[@]}"
    kubectl get namespaces
fi

echo ""

# Check resource quotas
echo "4. Checking resource quotas..."
for ns in "${EXPECTED_NAMESPACES[@]:0:3}"; do
    if kubectl get resourcequota -n $ns &> /dev/null; then
        echo "✓ Resource quota exists in $ns"
    else
        echo "✗ No resource quota in $ns"
    fi
done

echo ""

# Check storage classes
echo "5. Checking storage classes..."
if kubectl get storageclass &> /dev/null; then
    echo "✓ Storage classes configured"
    kubectl get storageclass
else
    echo "✗ No storage classes found"
fi

echo ""

# Check ingress controller
echo "6. Checking ingress controller..."
if kubectl get pods -n ingress-nginx &> /dev/null; then
    INGRESS_PODS=$(kubectl get pods -n ingress-nginx --no-headers | grep "Running" | wc -l)
    if [ $INGRESS_PODS -gt 0 ]; then
        echo "✓ Ingress controller is running"
        kubectl get pods -n ingress-nginx
    else
        echo "✗ Ingress controller pods are not running"
        kubectl get pods -n ingress-nginx
    fi
else
    echo "⚠ Ingress controller not installed"
fi

echo ""

# Check monitoring stack
echo "7. Checking monitoring stack..."
if kubectl get namespace monitoring &> /dev/null; then
    MONITORING_PODS=$(kubectl get pods -n monitoring --no-headers | grep "Running" | wc -l)
    TOTAL_MONITORING_PODS=$(kubectl get pods -n monitoring --no-headers | wc -l)
    
    echo "Running pods: $MONITORING_PODS/$TOTAL_MONITORING_PODS"
    
    if [ $MONITORING_PODS -eq $TOTAL_MONITORING_PODS ]; then
        echo "✓ All monitoring pods are running"
    else
        echo "⚠ Some monitoring pods are not running"
        kubectl get pods -n monitoring
    fi
else
    echo "⚠ Monitoring namespace not found"
fi

echo ""

# Check ConfigMaps
echo "8. Checking ConfigMaps..."
for ns in "${EXPECTED_NAMESPACES[@]:0:3}"; do
    if kubectl get configmap app-config -n $ns &> /dev/null; then
        echo "✓ ConfigMap exists in $ns"
    else
        echo "✗ ConfigMap missing in $ns"
    fi
done

echo ""

# Check application deployment
echo "9. Checking application deployments..."
for ns in "${EXPECTED_NAMESPACES[@]:0:3}"; do
    DEPLOYMENTS=$(kubectl get deployments -n $ns --no-headers 2>/dev/null | wc -l)
    if [ $DEPLOYMENTS -gt 0 ]; then
        echo "✓ Deployments found in $ns"
        kubectl get deployments -n $ns
    else
        echo "⚠ No deployments in $ns"
    fi
done

echo ""

# Check persistent volumes
echo "10. Checking persistent volumes..."
PV_COUNT=$(kubectl get pv --no-headers 2>/dev/null | wc -l)
if [ $PV_COUNT -gt 0 ]; then
    echo "✓ Persistent volumes configured ($PV_COUNT)"
    kubectl get pv
else
    echo "⚠ No persistent volumes found"
fi

echo ""

# Summary
echo "========================================="
echo "Verification Summary"
echo "========================================="
echo ""
echo "Cluster: ✓ Accessible"
echo "Nodes: $READY_NODES/$NODE_COUNT Ready"
echo "Namespaces: ${#EXPECTED_NAMESPACES[@]} expected, $((${#EXPECTED_NAMESPACES[@]} - ${#MISSING_NAMESPACES[@]})) found"
echo "Ingress: $([ $INGRESS_PODS -gt 0 ] && echo '✓ Running' || echo '⚠ Not running')"
echo "Monitoring: $([ $MONITORING_PODS -gt 0 ] && echo '✓ Running' || echo '⚠ Not running')"
echo ""
echo "========================================="
