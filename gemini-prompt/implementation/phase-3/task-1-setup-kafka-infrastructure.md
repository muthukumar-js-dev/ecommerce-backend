# Phase 3 - Task 1: Setup Kafka Infrastructure

**Duration:** 4-5 days  
**Priority:** Critical (Blocking)  
**Dependencies:** Phase 2 Complete

---

## Objective

Setup enterprise-grade Kafka infrastructure for event-driven architecture including cluster configuration, topic design, monitoring, and schema registry.

---

## Context

Kafka will be the backbone of our event-driven architecture, enabling:
- Asynchronous communication between services
- Event sourcing and audit trails
- Scalable message processing
- Decoupling of services

---

## Implementation Steps

### Step 1: Local Development Setup

**Install Kafka using Docker Compose:**

**Create `docker-compose.kafka.yml`:**

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    hostname: zookeeper
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - zookeeper-data:/var/lib/zookeeper/data
      - zookeeper-logs:/var/lib/zookeeper/log

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_SEGMENT_BYTES: 1073741824
    volumes:
      - kafka-data:/var/lib/kafka/data

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    hostname: schema-registry
    container_name: schema-registry
    depends_on:
      - kafka
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: 'kafka:29092'
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    depends_on:
      - kafka
      - schema-registry
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
      KAFKA_CLUSTERS_0_SCHEMAREGISTRY: http://schema-registry:8081

volumes:
  zookeeper-data:
  zookeeper-logs:
  kafka-data:
```

**Start Kafka:**

```bash
docker-compose -f docker-compose.kafka.yml up -d
```

### Step 2: Topic Design and Creation

**Create `scripts/kafka/create-topics.sh`:**

```bash
#!/bin/bash

KAFKA_BROKER="localhost:9092"

# User Events Topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic user.events \
  --partitions 10 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config segment.ms=86400000

# Order Events Topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic order.events \
  --partitions 20 \
  --replication-factor 1 \
  --config retention.ms=2592000000 \
  --config segment.ms=86400000

# Payment Events Topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic payment.events \
  --partitions 10 \
  --replication-factor 1 \
  --config retention.ms=2592000000 \
  --config segment.ms=86400000

# Notification Events Topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic notification.events \
  --partitions 5 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config segment.ms=86400000

# Product Events Topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic product.events \
  --partitions 10 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config segment.ms=86400000

# Dead Letter Queue
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic dlq.events \
  --partitions 5 \
  --replication-factor 1 \
  --config retention.ms=2592000000

echo "Topics created successfully!"
```

**Make executable and run:**

```bash
chmod +x scripts/kafka/create-topics.sh
./scripts/kafka/create-topics.sh
```

### Step 3: Kafka Client Configuration

**Install Kafka client:**

```bash
npm install kafkajs
npm install --save-dev @types/kafkajs
```

**Create `src/infrastructure/messaging/kafka/kafka.config.ts`:**

```typescript
import { Kafka, KafkaConfig, logLevel } from 'kafkajs';

export interface KafkaClientConfig {
  brokers: string[];
  clientId: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

export function createKafkaClient(config: KafkaClientConfig): Kafka {
  const kafkaConfig: KafkaConfig = {
    clientId: config.clientId,
    brokers: config.brokers,
    logLevel: logLevel.INFO,
    retry: {
      initialRetryTime: 100,
      retries: 8,
      maxRetryTime: 30000,
      multiplier: 2,
      factor: 0.2,
    },
  };

  if (config.ssl) {
    kafkaConfig.ssl = true;
  }

  if (config.sasl) {
    kafkaConfig.sasl = config.sasl;
  }

  return new Kafka(kafkaConfig);
}

// Environment-based configuration
export function getKafkaConfig(): KafkaClientConfig {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return {
      clientId: 'ecommerce-backend',
      brokers: (process.env.KAFKA_BROKERS || '').split(','),
      ssl: true,
      sasl: {
        mechanism: 'scram-sha-256',
        username: process.env.KAFKA_USERNAME || '',
        password: process.env.KAFKA_PASSWORD || '',
      },
    };
  }

  return {
    clientId: 'ecommerce-backend-dev',
    brokers: ['localhost:9092'],
  };
}
```

### Step 4: Topic Configuration

**Create `src/infrastructure/messaging/kafka/topics.ts`:**

```typescript
export enum KafkaTopic {
  USER_EVENTS = 'user.events',
  ORDER_EVENTS = 'order.events',
  PAYMENT_EVENTS = 'payment.events',
  NOTIFICATION_EVENTS = 'notification.events',
  PRODUCT_EVENTS = 'product.events',
  DLQ_EVENTS = 'dlq.events',
}

export interface TopicConfig {
  topic: KafkaTopic;
  numPartitions: number;
  replicationFactor: number;
  retentionMs: number;
}

export const TOPIC_CONFIGS: TopicConfig[] = [
  {
    topic: KafkaTopic.USER_EVENTS,
    numPartitions: 10,
    replicationFactor: 3,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  {
    topic: KafkaTopic.ORDER_EVENTS,
    numPartitions: 20,
    replicationFactor: 3,
    retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  {
    topic: KafkaTopic.PAYMENT_EVENTS,
    numPartitions: 10,
    replicationFactor: 3,
    retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  {
    topic: KafkaTopic.NOTIFICATION_EVENTS,
    numPartitions: 5,
    replicationFactor: 3,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  {
    topic: KafkaTopic.PRODUCT_EVENTS,
    numPartitions: 10,
    replicationFactor: 3,
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  {
    topic: KafkaTopic.DLQ_EVENTS,
    numPartitions: 5,
    replicationFactor: 3,
    retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
];
```

### Step 5: Schema Registry Setup

**Create `src/infrastructure/messaging/kafka/schema-registry.ts`:**

```typescript
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';

export class SchemaRegistryClient {
  private registry: SchemaRegistry;

  constructor(host: string) {
    this.registry = new SchemaRegistry({ host });
  }

  async registerSchema(subject: string, schema: any): Promise<number> {
    const { id } = await this.registry.register({
      type: SchemaType.AVRO,
      schema: JSON.stringify(schema),
    }, { subject });

    return id;
  }

  async encode(subject: string, payload: any): Promise<Buffer> {
    return this.registry.encode(subject, payload);
  }

  async decode(buffer: Buffer): Promise<any> {
    return this.registry.decode(buffer);
  }
}

// Example Avro schema for OrderPlaced event
export const OrderPlacedSchema = {
  type: 'record',
  name: 'OrderPlaced',
  namespace: 'com.ecommerce.events',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'orderId', type: 'string' },
    { name: 'orderNumber', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'totalAmount', type: 'double' },
    { name: 'itemCount', type: 'int' },
    { name: 'placedAt', type: { type: 'long', logicalType: 'timestamp-millis' } },
  ],
};
```

### Step 6: Monitoring Setup

**Create `docker-compose.monitoring.yml`:**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources

  kafka-exporter:
    image: danielqsj/kafka-exporter:latest
    container_name: kafka-exporter
    ports:
      - "9308:9308"
    command:
      - '--kafka.server=kafka:29092'

volumes:
  prometheus-data:
  grafana-data:
```

**Create `monitoring/prometheus.yml`:**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kafka'
    static_configs:
      - targets: ['kafka-exporter:9308']

  - job_name: 'application'
    static_configs:
      - targets: ['host.docker.internal:3000']
```

### Step 7: Health Checks

**Create `src/infrastructure/messaging/kafka/health-check.ts`:**

```typescript
import { Kafka } from 'kafkajs';

export class KafkaHealthCheck {
  constructor(private kafka: Kafka) {}

  async check(): Promise<{ healthy: boolean; message: string }> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const cluster = await admin.describeCluster();
      await admin.disconnect();

      if (cluster.brokers.length === 0) {
        return {
          healthy: false,
          message: 'No brokers available',
        };
      }

      return {
        healthy: true,
        message: `Connected to ${cluster.brokers.length} broker(s)`,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: `Kafka health check failed: ${error.message}`,
      };
    }
  }
}
```

---

## Testing

**Create `tests/integration/kafka/kafka-connection.test.ts`:**

```typescript
import { createKafkaClient, getKafkaConfig } from '@infrastructure/messaging/kafka/kafka.config';
import { KafkaHealthCheck } from '@infrastructure/messaging/kafka/health-check';

describe('Kafka Connection', () => {
  it('should connect to Kafka cluster', async () => {
    const config = getKafkaConfig();
    const kafka = createKafkaClient(config);
    const healthCheck = new KafkaHealthCheck(kafka);

    const result = await healthCheck.check();

    expect(result.healthy).toBe(true);
  });

  it('should list topics', async () => {
    const config = getKafkaConfig();
    const kafka = createKafkaClient(config);
    const admin = kafka.admin();

    await admin.connect();
    const topics = await admin.listTopics();
    await admin.disconnect();

    expect(topics).toContain('user.events');
    expect(topics).toContain('order.events');
  });
});
```

---

## Production Setup

### AWS MSK (Managed Streaming for Kafka)

**Terraform configuration:**

```hcl
resource "aws_msk_cluster" "ecommerce" {
  cluster_name           = "ecommerce-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = var.private_subnet_ids
    security_groups = [aws_security_group.kafka.id]

    storage_info {
      ebs_storage_info {
        volume_size = 1000
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.ecommerce.arn
    revision = aws_msk_configuration.ecommerce.latest_revision
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka.name
      }
    }
  }

  tags = {
    Environment = "production"
    Application = "ecommerce"
  }
}
```

---

## Deliverables

- [ ] Kafka cluster running (local + production)
- [ ] All topics created with correct partitions
- [ ] Schema registry configured
- [ ] Kafka client library integrated
- [ ] Health checks implemented
- [ ] Monitoring setup (Prometheus + Grafana)
- [ ] Documentation for Kafka operations
- [ ] Connection tests passing

---

## Validation Checklist

- [ ] Kafka UI accessible at http://localhost:8080
- [ ] All topics visible in Kafka UI
- [ ] Schema registry accessible at http://localhost:8081
- [ ] Health check endpoint returns healthy
- [ ] Prometheus scraping Kafka metrics
- [ ] Grafana dashboards showing Kafka metrics

---

## Next Steps

After completing this task:
1. Proceed to **Task 2: Implement Event Publishing**
2. Configure production Kafka cluster
3. Setup monitoring alerts

---

**Task Owner:** DevOps + Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
