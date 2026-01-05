#!/bin/bash

KAFKA_BROKER="localhost:9092"

echo "Creating Kafka topics..."

# User Events Topic
docker exec kafka kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic user.events \
  --partitions 10 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config segment.ms=86400000 \
  --if-not-exists

echo "✓ Created user.events topic"

# Order Events Topic
docker exec kafka kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic order.events \
  --partitions 20 \
  --replication-factor 1 \
  --config retention.ms=2592000000 \
  --config segment.ms=86400000 \
  --if-not-exists

echo "✓ Created order.events topic"

# Payment Events Topic
docker exec kafka kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic payment.events \
  --partitions 10 \
  --replication-factor 1 \
  --config retention.ms=2592000000 \
  --config segment.ms=86400000 \
  --if-not-exists

echo "✓ Created payment.events topic"

# Notification Events Topic
docker exec kafka kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic notification.events \
  --partitions 5 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config segment.ms=86400000 \
  --if-not-exists

echo "✓ Created notification.events topic"

# Product Events Topic
docker exec kafka kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic product.events \
  --partitions 10 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config segment.ms=86400000 \
  --if-not-exists

echo "✓ Created product.events topic"

# Dead Letter Queue
docker exec kafka kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic dlq.events \
  --partitions 5 \
  --replication-factor 1 \
  --config retention.ms=2592000000 \
  --if-not-exists

echo "✓ Created dlq.events topic"

echo ""
echo "All topics created successfully!"
echo ""
echo "Listing all topics:"
docker exec kafka kafka-topics --list --bootstrap-server $KAFKA_BROKER
