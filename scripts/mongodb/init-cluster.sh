#!/bin/bash

# MongoDB Sharded Cluster Initialization Script
# This script initializes the config servers, shard replica sets, and configures sharding

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

NAMESPACE="ecommerce-prod"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MongoDB Sharded Cluster Initialization${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Wait for all pods to be ready
echo -e "${YELLOW}Step 1: Waiting for all pods to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=mongo-config -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongo-shard1 -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongo-shard2 -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongo-shard3 -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongos -n $NAMESPACE --timeout=300s
echo -e "${GREEN}✓ All pods are ready${NC}"
echo ""

# Step 2: Initialize config server replica set
echo -e "${YELLOW}Step 2: Initializing config server replica set...${NC}"
kubectl exec -it mongo-config-0 -n $NAMESPACE -- mongosh --port 27019 --eval "
rs.initiate({
  _id: 'configReplSet',
  configsvr: true,
  members: [
    { _id: 0, host: 'mongo-config-0.mongo-config-headless.ecommerce-prod.svc.cluster.local:27019' },
    { _id: 1, host: 'mongo-config-1.mongo-config-headless.ecommerce-prod.svc.cluster.local:27019' },
    { _id: 2, host: 'mongo-config-2.mongo-config-headless.ecommerce-prod.svc.cluster.local:27019' }
  ]
});
"
echo -e "${GREEN}✓ Config server replica set initialized${NC}"
echo ""

# Wait for config server replica set to stabilize
echo -e "${YELLOW}Waiting for config server replica set to stabilize...${NC}"
sleep 10

# Step 3: Initialize shard 1 replica set
echo -e "${YELLOW}Step 3: Initializing shard 1 replica set...${NC}"
kubectl exec -it mongo-shard1-0 -n $NAMESPACE -- mongosh --port 27018 --eval "
rs.initiate({
  _id: 'shard1ReplSet',
  members: [
    { _id: 0, host: 'mongo-shard1-0.mongo-shard1-headless.ecommerce-prod.svc.cluster.local:27018' },
    { _id: 1, host: 'mongo-shard1-1.mongo-shard1-headless.ecommerce-prod.svc.cluster.local:27018' },
    { _id: 2, host: 'mongo-shard1-2.mongo-shard1-headless.ecommerce-prod.svc.cluster.local:27018' }
  ]
});
"
echo -e "${GREEN}✓ Shard 1 replica set initialized${NC}"
echo ""

# Step 4: Initialize shard 2 replica set
echo -e "${YELLOW}Step 4: Initializing shard 2 replica set...${NC}"
kubectl exec -it mongo-shard2-0 -n $NAMESPACE -- mongosh --port 27018 --eval "
rs.initiate({
  _id: 'shard2ReplSet',
  members: [
    { _id: 0, host: 'mongo-shard2-0.mongo-shard2-headless.ecommerce-prod.svc.cluster.local:27018' },
    { _id: 1, host: 'mongo-shard2-1.mongo-shard2-headless.ecommerce-prod.svc.cluster.local:27018' },
    { _id: 2, host: 'mongo-shard2-2.mongo-shard2-headless.ecommerce-prod.svc.cluster.local:27018' }
  ]
});
"
echo -e "${GREEN}✓ Shard 2 replica set initialized${NC}"
echo ""

# Step 5: Initialize shard 3 replica set
echo -e "${YELLOW}Step 5: Initializing shard 3 replica set...${NC}"
kubectl exec -it mongo-shard3-0 -n $NAMESPACE -- mongosh --port 27018 --eval "
rs.initiate({
  _id: 'shard3ReplSet',
  members: [
    { _id: 0, host: 'mongo-shard3-0.mongo-shard3-headless.ecommerce-prod.svc.cluster.local:27018' },
    { _id: 1, host: 'mongo-shard3-1.mongo-shard3-headless.ecommerce-prod.svc.cluster.local:27018' },
    { _id: 2, host: 'mongo-shard3-2.mongo-shard3-headless.ecommerce-prod.svc.cluster.local:27018' }
  ]
});
"
echo -e "${GREEN}✓ Shard 3 replica set initialized${NC}"
echo ""

# Wait for shard replica sets to stabilize
echo -e "${YELLOW}Waiting for shard replica sets to stabilize...${NC}"
sleep 15

# Step 6: Add shards to cluster
echo -e "${YELLOW}Step 6: Adding shards to cluster...${NC}"
MONGOS_POD=$(kubectl get pods -n $NAMESPACE -l app=mongos -o jsonpath='{.items[0].metadata.name}')

kubectl exec -it $MONGOS_POD -n $NAMESPACE -- mongosh --eval "
use admin;

sh.addShard('shard1ReplSet/mongo-shard1-0.mongo-shard1-headless.ecommerce-prod.svc.cluster.local:27018,mongo-shard1-1.mongo-shard1-headless.ecommerce-prod.svc.cluster.local:27018,mongo-shard1-2.mongo-shard1-headless.ecommerce-prod.svc.cluster.local:27018');

sh.addShard('shard2ReplSet/mongo-shard2-0.mongo-shard2-headless.ecommerce-prod.svc.cluster.local:27018,mongo-shard2-1.mongo-shard2-headless.ecommerce-prod.svc.cluster.local:27018,mongo-shard2-2.mongo-shard2-headless.ecommerce-prod.svc.cluster.local:27018');

sh.addShard('shard3ReplSet/mongo-shard3-0.mongo-shard3-headless.ecommerce-prod.svc.cluster.local:27018,mongo-shard3-1.mongo-shard3-headless.ecommerce-prod.svc.cluster.local:27018,mongo-shard3-2.mongo-shard3-headless.ecommerce-prod.svc.cluster.local:27018');
"
echo -e "${GREEN}✓ Shards added to cluster${NC}"
echo ""

# Step 7: Enable sharding on database
echo -e "${YELLOW}Step 7: Enabling sharding on database...${NC}"
kubectl exec -it $MONGOS_POD -n $NAMESPACE -- mongosh --eval "
use admin;
sh.enableSharding('ecommerce');
"
echo -e "${GREEN}✓ Sharding enabled on ecommerce database${NC}"
echo ""

# Step 8: Shard collections
echo -e "${YELLOW}Step 8: Sharding collections...${NC}"
kubectl exec -it $MONGOS_POD -n $NAMESPACE -- mongosh --eval "
use admin;

// Shard users collection with hashed userId
sh.shardCollection('ecommerce.users', { userId: 'hashed' });

// Shard products collection with hashed productId
sh.shardCollection('ecommerce.products', { productId: 'hashed' });

// Shard orders collection with hashed orderId
sh.shardCollection('ecommerce.orders', { orderId: 'hashed' });

// Shard carts collection with hashed userId
sh.shardCollection('ecommerce.carts', { userId: 'hashed' });

// Shard reviews collection with compound key
sh.shardCollection('ecommerce.reviews', { productId: 1, userId: 1 });
"
echo -e "${GREEN}✓ Collections sharded${NC}"
echo ""

# Step 9: Verify sharding status
echo -e "${YELLOW}Step 9: Verifying sharding status...${NC}"
kubectl exec -it $MONGOS_POD -n $NAMESPACE -- mongosh --eval "
use admin;
sh.status();
"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Sharded Cluster Initialization Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "  - Config servers: 3 replicas"
echo "  - Shards: 3 (each with 3 replicas)"
echo "  - Mongos routers: 3"
echo "  - Sharded collections: users, products, orders, carts, reviews"
echo ""
echo "Connection string:"
echo "  mongodb://mongos.ecommerce-prod.svc.cluster.local:27017/ecommerce"
echo ""
