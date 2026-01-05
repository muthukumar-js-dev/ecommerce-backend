#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "🏥 Configuring health checks..."

# Update core service with health checks
echo "  - Core service health checks..."
curl -i -X PATCH ${KONG_ADMIN_URL}/services/core-service \
  --data healthchecks.active.healthy.interval=10 \
  --data healthchecks.active.healthy.successes=2 \
  --data healthchecks.active.unhealthy.interval=5 \
  --data healthchecks.active.unhealthy.http_failures=3 \
  --data healthchecks.active.unhealthy.timeouts=3 \
  --data healthchecks.passive.healthy.successes=2 \
  --data healthchecks.passive.unhealthy.http_failures=3

# Update payment service with health checks
echo "  - Payment service health checks..."
curl -i -X PATCH ${KONG_ADMIN_URL}/services/payment-service \
  --data healthchecks.active.healthy.interval=10 \
  --data healthchecks.active.healthy.successes=2 \
  --data healthchecks.active.unhealthy.interval=5 \
  --data healthchecks.active.unhealthy.http_failures=3

# Update notification service with health checks
echo "  - Notification service health checks..."
curl -i -X PATCH ${KONG_ADMIN_URL}/services/notification-service \
  --data healthchecks.active.healthy.interval=10 \
  --data healthchecks.active.healthy.successes=2 \
  --data healthchecks.active.unhealthy.interval=5 \
  --data healthchecks.active.unhealthy.http_failures=3

echo ""
echo "✅ Health checks configured!"
echo "🏥 Active checks: every 10s"
echo "🏥 Passive monitoring: enabled"
echo "📊 View health: curl ${KONG_ADMIN_URL}/services/core-service/health"
