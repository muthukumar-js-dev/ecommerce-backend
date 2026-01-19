# Kafka Infrastructure Setup

## Overview

This project uses Apache Kafka for event-driven architecture, enabling asynchronous communication, event sourcing, and scalable message processing.

## Local Development Setup

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed

### Starting Kafka

```bash
# Start Kafka cluster (Zookeeper, Kafka, Schema Registry, Kafka UI)
docker-compose -f docker-compose.kafka.yml up -d

# Verify all services are running
docker-compose -f docker-compose.kafka.yml ps

# View logs
docker-compose -f docker-compose.kafka.yml logs -f kafka
```

### Creating Topics

```bash
# Windows (PowerShell)
.\scripts\kafka\create-topics.ps1

# Linux/Mac
chmod +x scripts/kafka/create-topics.sh
./scripts/kafka/create-topics.sh
```

### Accessing Kafka UI

Open http://localhost:8080 in your browser to access the Kafka UI web interface.

## Topics

| Topic | Partitions | Retention | Purpose |
|-------|------------|-----------|---------|
| `user.events` | 10 | 7 days | User-related events |
| `order.events` | 20 | 30 days | Order-related events |
| `payment.events` | 10 | 30 days | Payment-related events |
| `notification.events` | 5 | 7 days | Notification events |
| `product.events` | 10 | 7 days | Product-related events |
| `dlq.events` | 5 | 30 days | Dead letter queue |

## Monitoring

### Starting Monitoring Stack

```bash
# Start Prometheus and Grafana
docker-compose -f docker-compose.monitoring.yml up -d
```

### Accessing Monitoring Tools

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3001 (admin/admin)
- **Kafka Exporter:** http://localhost:9308/metrics

### Grafana Dashboards

1. Login to Grafana (admin/admin)
2. Navigate to Dashboards
3. Import Kafka dashboard (ID: 7589)

## Schema Registry

The Schema Registry runs on http://localhost:8081 and manages Avro schemas for event serialization.

### Registered Schemas

- `user.events-value` - User events schema
- `order.events-value` - Order events schema
- `product.events-value` - Product events schema

## Testing

```bash
# Run Kafka integration tests
npm test -- tests/integration/kafka

# Run specific test
npm test -- tests/integration/kafka/kafka-connection.test.ts
```

## Health Checks

The application includes Kafka health checks accessible at `/health`:

```bash
curl http://localhost:3000/health
```

Response includes Kafka connectivity status:
```json
{
  "kafka": {
    "healthy": true,
    "message": "Connected to 1 broker(s)",
    "details": {
      "brokers": 1,
      "clusterId": "...",
      "controller": 1
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# Development (default)
KAFKA_BROKERS=localhost:9092

# Production
KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092
KAFKA_USERNAME=your-username
KAFKA_PASSWORD=your-password
KAFKA_SSL=true
```

## Troubleshooting

### Kafka not starting

```bash
# Check logs
docker-compose -f docker-compose.kafka.yml logs kafka

# Restart services
docker-compose -f docker-compose.kafka.yml restart
```

### Topics not created

```bash
# List existing topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Manually create a topic
docker exec kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic test.topic \
  --partitions 3 \
  --replication-factor 1
```

### Connection issues

```bash
# Test connection
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Check if Kafka is listening
netstat -an | findstr 9092
```

## Stopping Services

```bash
# Stop Kafka
docker-compose -f docker-compose.kafka.yml down

# Stop Kafka and remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.kafka.yml down -v

# Stop monitoring
docker-compose -f docker-compose.monitoring.yml down
```

## Production Deployment

For production deployment using AWS MSK (Managed Streaming for Kafka), see:
- [AWS MSK Setup Guide](./docs/deployment/aws-msk-setup.md)
- [Terraform Configuration](./infrastructure/terraform/kafka.tf)

## Additional Resources

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html)
