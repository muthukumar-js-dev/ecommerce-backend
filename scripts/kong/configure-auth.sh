#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "🔐 Configuring JWT authentication..."

# Add JWT plugin to core service
echo "  - Enabling JWT for core-service..."
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/plugins \
  --data name=jwt \
  --data config.key_claim_name=kid \
  --data config.secret_is_base64=false

# Add JWT plugin to payment service
echo "  - Enabling JWT for payment-service..."
curl -i -X POST ${KONG_ADMIN_URL}/services/payment-service/plugins \
  --data name=jwt

# Add JWT plugin to notification service
echo "  - Enabling JWT for notification-service..."
curl -i -X POST ${KONG_ADMIN_URL}/services/notification-service/plugins \
  --data name=jwt

# Create a consumer (example)
echo "  - Creating test consumer..."
curl -i -X POST ${KONG_ADMIN_URL}/consumers \
  --data username=test-user

# Create JWT credentials for consumer
echo "  - Creating JWT credentials..."
curl -i -X POST ${KONG_ADMIN_URL}/consumers/test-user/jwt \
  --data key=test-key \
  --data secret=test-secret

echo ""
echo "✅ JWT authentication configured!"
echo "🔑 Test consumer: test-user"
echo "🔑 JWT Key: test-key"
echo "🔑 JWT Secret: test-secret"
echo "📝 Generate token at: https://jwt.io"
