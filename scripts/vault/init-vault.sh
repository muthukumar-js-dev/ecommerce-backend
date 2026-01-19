#!/bin/bash

# HashiCorp Vault Initialization Script
# This script initializes and configures Vault for the e-commerce backend

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

VAULT_NAMESPACE="vault"
VAULT_POD="vault-0"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HashiCorp Vault Initialization${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Check if Vault is installed
echo -e "${YELLOW}Step 1: Checking Vault installation...${NC}"
if ! kubectl get namespace $VAULT_NAMESPACE &> /dev/null; then
    echo -e "${RED}Vault namespace not found. Please install Vault first.${NC}"
    echo "Run: helm install vault hashicorp/vault --namespace vault --create-namespace"
    exit 1
fi
echo -e "${GREEN}✓ Vault is installed${NC}"
echo ""

# Step 2: Initialize Vault
echo -e "${YELLOW}Step 2: Initializing Vault...${NC}"
if [ ! -f "vault-keys.json" ]; then
    kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault operator init \
        -key-shares=5 \
        -key-threshold=3 \
        -format=json > vault-keys.json
    
    echo -e "${GREEN}✓ Vault initialized${NC}"
    echo -e "${YELLOW}IMPORTANT: Save vault-keys.json securely!${NC}"
else
    echo -e "${YELLOW}vault-keys.json already exists, skipping initialization${NC}"
fi
echo ""

# Step 3: Extract keys
echo -e "${YELLOW}Step 3: Extracting unseal keys...${NC}"
UNSEAL_KEY_1=$(cat vault-keys.json | jq -r '.unseal_keys_b64[0]')
UNSEAL_KEY_2=$(cat vault-keys.json | jq -r '.unseal_keys_b64[1]')
UNSEAL_KEY_3=$(cat vault-keys.json | jq -r '.unseal_keys_b64[2]')
ROOT_TOKEN=$(cat vault-keys.json | jq -r '.root_token')
echo -e "${GREEN}✓ Keys extracted${NC}"
echo ""

# Step 4: Unseal Vault pods
echo -e "${YELLOW}Step 4: Unsealing Vault pods...${NC}"
for i in 0 1 2; do
    echo "Unsealing vault-$i..."
    kubectl exec -n $VAULT_NAMESPACE vault-$i -- vault operator unseal $UNSEAL_KEY_1 > /dev/null
    kubectl exec -n $VAULT_NAMESPACE vault-$i -- vault operator unseal $UNSEAL_KEY_2 > /dev/null
    kubectl exec -n $VAULT_NAMESPACE vault-$i -- vault operator unseal $UNSEAL_KEY_3 > /dev/null
done
echo -e "${GREEN}✓ All Vault pods unsealed${NC}"
echo ""

# Step 5: Login to Vault
echo -e "${YELLOW}Step 5: Logging in to Vault...${NC}"
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault login $ROOT_TOKEN > /dev/null
echo -e "${GREEN}✓ Logged in to Vault${NC}"
echo ""

# Step 6: Enable KV secrets engine
echo -e "${YELLOW}Step 6: Enabling KV secrets engine...${NC}"
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault secrets enable -path=ecommerce kv-v2 || echo "KV engine already enabled"
echo -e "${GREEN}✓ KV secrets engine enabled${NC}"
echo ""

# Step 7: Store secrets
echo -e "${YELLOW}Step 7: Storing secrets...${NC}"

# JWT Secret
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault kv put ecommerce/prod/jwt \
    JWT_SECRET="$(openssl rand -base64 32)"

# Database
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault kv put ecommerce/prod/mongodb \
    MONGODB_URI="mongodb://mongos.ecommerce-prod.svc.cluster.local:27017/ecommerce"

# Redis
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault kv put ecommerce/prod/redis \
    REDIS_PASSWORD="$(openssl rand -base64 24)"

# Stripe (placeholder - replace with actual keys)
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault kv put ecommerce/prod/stripe \
    STRIPE_SECRET_KEY="sk_test_placeholder" \
    STRIPE_WEBHOOK_SECRET="whsec_placeholder"

# AWS (placeholder - replace with actual keys)
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault kv put ecommerce/prod/aws \
    AWS_ACCESS_KEY_ID="AKIA_placeholder" \
    AWS_SECRET_ACCESS_KEY="placeholder"

echo -e "${GREEN}✓ Secrets stored${NC}"
echo ""

# Step 8: Enable Kubernetes auth
echo -e "${YELLOW}Step 8: Enabling Kubernetes auth...${NC}"
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault auth enable kubernetes || echo "Kubernetes auth already enabled"

kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc:443"

echo -e "${GREEN}✓ Kubernetes auth enabled${NC}"
echo ""

# Step 9: Create policy
echo -e "${YELLOW}Step 9: Creating Vault policy...${NC}"
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- sh -c 'cat <<EOF | vault policy write ecommerce-policy -
path "ecommerce/data/prod/*" {
  capabilities = ["read"]
}
EOF'
echo -e "${GREEN}✓ Policy created${NC}"
echo ""

# Step 10: Create Kubernetes role
echo -e "${YELLOW}Step 10: Creating Kubernetes role...${NC}"
kubectl exec -n $VAULT_NAMESPACE $VAULT_POD -- vault write auth/kubernetes/role/ecommerce \
    bound_service_account_names=ecommerce-sa \
    bound_service_account_namespaces=ecommerce-prod \
    policies=ecommerce-policy \
    ttl=24h

echo -e "${GREEN}✓ Kubernetes role created${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Vault Initialization Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "  - Vault initialized and unsealed"
echo "  - KV secrets engine enabled"
echo "  - Secrets stored in ecommerce/prod/*"
echo "  - Kubernetes auth configured"
echo "  - Policy and role created"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update deployments with Vault annotations"
echo "  2. Secure vault-keys.json file"
echo "  3. Configure Vault agent injector"
echo ""
