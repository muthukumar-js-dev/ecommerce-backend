# Kafka Topic Creation Script for Windows
$KAFKA_BROKER = "localhost:9092"

Write-Host "Creating Kafka topics..." -ForegroundColor Green

# User Events Topic
Write-Host "Creating user.events topic..."
docker exec kafka kafka-topics --create `
  --bootstrap-server $KAFKA_BROKER `
  --topic user.events `
  --partitions 10 `
  --replication-factor 1 `
  --config retention.ms=604800000 `
  --config segment.ms=86400000 `
  --if-not-exists

# Order Events Topic
Write-Host "Creating order.events topic..."
docker exec kafka kafka-topics --create `
  --bootstrap-server $KAFKA_BROKER `
  --topic order.events `
  --partitions 20 `
  --replication-factor 1 `
  --config retention.ms=2592000000 `
  --config segment.ms=86400000 `
  --if-not-exists

# Payment Events Topic
Write-Host "Creating payment.events topic..."
docker exec kafka kafka-topics --create `
  --bootstrap-server $KAFKA_BROKER `
  --topic payment.events `
  --partitions 10 `
  --replication-factor 1 `
  --config retention.ms=2592000000 `
  --config segment.ms=86400000 `
  --if-not-exists

# Notification Events Topic
Write-Host "Creating notification.events topic..."
docker exec kafka kafka-topics --create `
  --bootstrap-server $KAFKA_BROKER `
  --topic notification.events `
  --partitions 5 `
  --replication-factor 1 `
  --config retention.ms=604800000 `
  --config segment.ms=86400000 `
  --if-not-exists

# Product Events Topic
Write-Host "Creating product.events topic..."
docker exec kafka kafka-topics --create `
  --bootstrap-server $KAFKA_BROKER `
  --topic product.events `
  --partitions 10 `
  --replication-factor 1 `
  --config retention.ms=604800000 `
  --config segment.ms=86400000 `
  --if-not-exists

# Dead Letter Queue
Write-Host "Creating dlq.events topic..."
docker exec kafka kafka-topics --create `
  --bootstrap-server $KAFKA_BROKER `
  --topic dlq.events `
  --partitions 5 `
  --replication-factor 1 `
  --config retention.ms=2592000000 `
  --if-not-exists

Write-Host ""
Write-Host "All topics created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Listing all topics:" -ForegroundColor Yellow
docker exec kafka kafka-topics --list --bootstrap-server $KAFKA_BROKER
