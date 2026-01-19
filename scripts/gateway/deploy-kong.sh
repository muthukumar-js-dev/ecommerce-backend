#!/bin/bash

# Kong API Gateway Deployment Script

set -e

echo "🚀 Deploying Kong API Gateway..."

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"
KONG_PROXY_URL="${KONG_PROXY_URL:-http://localhost:8000}"

echo "📝 Configuration:"
echo "  Kong Admin URL: $KONG_ADMIN_URL"
echo "  Kong Proxy URL: $KONG_PROXY_URL"

echo ""
echo "🔍 Checking Kong status..."
if curl -s "$KONG_ADMIN_URL" > /dev/null; then
  echo "✅ Kong is running"
else
  echo "❌ Kong is not running. Starting Kong..."
  docker-compose -f docker-compose.kong.yml up -d
  sleep 10
fi

echo ""
echo "✅ Validating Kong configuration..."
if command -v deck &> /dev/null; then
  deck validate --config infrastructure/gateway/kong-routes.yaml
  deck sync --config infrastructure/gateway/kong-routes.yaml --kong-addr "$KONG_ADMIN_URL"
  echo "✅ Configuration synced"
fi

echo ""
echo "🎉 Kong API Gateway deployment complete!"
