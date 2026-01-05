#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "🌐 Configuring CORS..."

# Add CORS plugin globally
curl -i -X POST ${KONG_ADMIN_URL}/plugins \
  --data name=cors \
  --data config.origins=http://localhost:3000,https://yourdomain.com \
  --data config.methods=GET,POST,PUT,DELETE,OPTIONS \
  --data config.headers=Accept,Authorization,Content-Type,X-Requested-With \
  --data config.exposed_headers=X-Auth-Token \
  --data config.credentials=true \
  --data config.max_age=3600

echo ""
echo "✅ CORS configured!"
echo "🌐 Allowed origins: http://localhost:3000, https://yourdomain.com"
echo "📝 Test: curl -H \"Origin: http://localhost:3000\" -X OPTIONS http://localhost:8000/api/products"
