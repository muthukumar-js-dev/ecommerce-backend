#!/bin/bash

# Database Sharding Setup Script
# This script sets up MongoDB sharding for the e-commerce backend

set -e

echo "🗄️  Starting MongoDB Sharding Setup..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
NUM_SHARDS="${NUM_SHARDS:-3}"
SHARD_KEY="${SHARD_KEY:-userId}"

echo "📝 Configuration:"
echo "  MongoDB URI: $MONGODB_URI"
echo "  Number of Shards: $NUM_SHARDS"
echo "  Shard Key: $SHARD_KEY"

# Step 1: Enable sharding on the database
echo ""
echo "🔧 Step 1: Enabling sharding on database..."

mongo "$MONGODB_URI" --eval "
  sh.enableSharding('ecommerce');
  print('✅ Sharding enabled on ecommerce database');
"

# Step 2: Shard collections
echo ""
echo "📦 Step 2: Sharding collections..."

# Shard users collection
mongo "$MONGODB_URI" --eval "
  sh.shardCollection('ecommerce.users', { '$SHARD_KEY': 'hashed' });
  print('✅ Users collection sharded');
"

# Shard orders collection
mongo "$MONGODB_URI" --eval "
  sh.shardCollection('ecommerce.orders', { '$SHARD_KEY': 'hashed' });
  print('✅ Orders collection sharded');
"

# Shard products collection (if needed)
mongo "$MONGODB_URI" --eval "
  sh.shardCollection('ecommerce.products', { 'category': 1 });
  print('✅ Products collection sharded by category');
"

# Step 3: Verify sharding status
echo ""
echo "📊 Step 3: Verifying sharding status..."

mongo "$MONGODB_URI" --eval "
  sh.status();
"

# Step 4: Create indexes for shard keys
echo ""
echo "🔍 Step 4: Creating indexes for shard keys..."

mongo "$MONGODB_URI/ecommerce" --eval "
  db.users.createIndex({ '$SHARD_KEY': 1 });
  db.orders.createIndex({ '$SHARD_KEY': 1 });
  db.products.createIndex({ 'category': 1 });
  print('✅ Indexes created');
"

echo ""
echo "🎉 MongoDB Sharding Setup Complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your .env file with shard URIs:"
echo "   SHARD_0_URI=mongodb://shard0:27017/ecommerce"
echo "   SHARD_1_URI=mongodb://shard1:27017/ecommerce"
echo "   SHARD_2_URI=mongodb://shard2:27017/ecommerce"
echo "2. Test sharding: npm run db:test-sharding"
echo "3. Monitor shard distribution: mongo --eval 'sh.status()'"
