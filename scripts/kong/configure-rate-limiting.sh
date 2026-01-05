#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "🛡️ Configuring rate limiting..."

# Global rate limiting (applies to all services)
echo "  - Global rate limiting (1000/min, 10000/hour)..."
curl -i -X POST ${KONG_ADMIN_URL}/plugins \
  --data name=rate-limiting \
  --data config.minute=1000 \
  --data config.hour=10000 \
  --data config.policy=local \
  --data config.fault_tolerant=true

# Stricter rate limiting for authentication endpoints
echo "  - Users route rate limiting (100/min, 1000/hour)..."
curl -i -X POST ${KONG_ADMIN_URL}/routes/users-route/plugins \
  --data name=rate-limiting \
  --data config.minute=100 \
  --data config.hour=1000 \
  --data config.policy=local

# Payment endpoints - even stricter
echo "  - Payments route rate limiting (50/min, 500/hour)..."
curl -i -X POST ${KONG_ADMIN_URL}/routes/payments-route/plugins \
  --data name=rate-limiting \
  --data config.minute=50 \
  --data config.hour=500 \
  --data config.policy=local

echo ""
echo "✅ Rate limiting configured!"
echo "📊 Test: curl http://localhost:8000/api/products (make 150+ requests to see 429)"
