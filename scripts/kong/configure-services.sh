#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "🚀 Configuring Kong services and routes..."

# 1. Add Core Service
echo "📦 Adding core-service..."
curl -i -X POST ${KONG_ADMIN_URL}/services \
  --data name=core-service \
  --data url=http://host.docker.internal:3000 \
  --data retries=5 \
  --data connect_timeout=60000 \
  --data write_timeout=60000 \
  --data read_timeout=60000

# 2. Add Payment Service
echo "💳 Adding payment-service..."
curl -i -X POST ${KONG_ADMIN_URL}/services \
  --data name=payment-service \
  --data url=http://host.docker.internal:3001 \
  --data retries=5

# 3. Add Notification Service
echo "📧 Adding notification-service..."
curl -i -X POST ${KONG_ADMIN_URL}/services \
  --data name=notification-service \
  --data url=http://host.docker.internal:3002 \
  --data retries=5

echo ""
echo "🔀 Creating routes..."

# 4. Routes for Core Service
echo "  - Users route..."
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/routes \
  --data 'name=users-route' \
  --data 'paths[]=/api/users' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE'

echo "  - Products route..."
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/routes \
  --data 'name=products-route' \
  --data 'paths[]=/api/products' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE'

echo "  - Orders route..."
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/routes \
  --data 'name=orders-route' \
  --data 'paths[]=/api/orders' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE'

echo "  - Cart route..."
curl -i -X POST ${KONG_ADMIN_URL}/services/core-service/routes \
  --data 'name=cart-route' \
  --data 'paths[]=/api/cart' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST' \
  --data 'methods[]=PUT' \
  --data 'methods[]=DELETE'

# 5. Routes for Payment Service
echo "  - Payments route..."
curl -i -X POST ${KONG_ADMIN_URL}/services/payment-service/routes \
  --data 'name=payments-route' \
  --data 'paths[]=/api/payments' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST'

# 6. Routes for Notification Service
echo "  - Notifications route..."
curl -i -X POST ${KONG_ADMIN_URL}/services/notification-service/routes \
  --data 'name=notifications-route' \
  --data 'paths[]=/api/notifications' \
  --data 'methods[]=GET' \
  --data 'methods[]=POST'

echo ""
echo "✅ Services and routes configured successfully!"
echo "📊 View services: curl ${KONG_ADMIN_URL}/services"
echo "🔀 View routes: curl ${KONG_ADMIN_URL}/routes"
