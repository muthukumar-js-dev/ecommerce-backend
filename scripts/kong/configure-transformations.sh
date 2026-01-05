#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "🔄 Configuring request/response transformations..."

# Add request transformer to add headers
echo "  - Request transformer (add headers)..."
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/plugins \
  --data name=request-transformer \
  --data config.add.headers=X-Gateway-Version:1.0 \
  --data config.add.headers=X-Request-ID:\$(uuid)

# Add response transformer to add headers
echo "  - Response transformer (add headers)..."
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/plugins \
  --data name=response-transformer \
  --data config.add.headers=X-Powered-By:Kong

echo ""
echo "✅ Transformations configured!"
echo "📝 All requests will have X-Gateway-Version and X-Request-ID headers"
echo "📝 All responses will have X-Powered-By: Kong header"
