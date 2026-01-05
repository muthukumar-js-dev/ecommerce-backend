#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "📝 Configuring logging..."

# Add file log plugin (for local development)
echo "  - File log plugin..."
curl -i -X POST ${KONG_ADMIN_URL}/plugins \
  --data name=file-log \
  --data config.path=/tmp/kong-requests.log

# Note: HTTP log plugin requires a log endpoint (e.g., Logstash)
# Uncomment when you have a log endpoint:
# echo "  - HTTP log plugin..."
# curl -i -X POST ${KONG_ADMIN_URL}/plugins \
#   --data name=http-log \
#   --data config.http_endpoint=http://logstash:5000 \
#   --data config.method=POST \
#   --data config.timeout=10000 \
#   --data config.keepalive=60000

echo ""
echo "✅ Logging configured!"
echo "📝 Logs will be written to: /tmp/kong-requests.log"
echo "💡 To view logs: docker exec kong tail -f /tmp/kong-requests.log"
