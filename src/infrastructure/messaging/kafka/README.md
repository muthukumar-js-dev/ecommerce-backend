# Kafka Infrastructure

This directory contains all Kafka-related infrastructure code.

## Modules

### `kafka.config.ts`
Kafka client configuration with environment-based settings.

**Usage:**
```typescript
import { getKafkaInstance } from './kafka.config';

const kafka = getKafkaInstance();
const producer = kafka.producer();
```

### `topics.ts`
Topic definitions and event routing logic.

**Usage:**
```typescript
import { KafkaTopic, getTopicForEvent } from './topics';

const topic = getTopicForEvent('OrderPlaced'); // Returns KafkaTopic.ORDER_EVENTS
```

### `health-check.ts`
Kafka cluster health checks.

**Usage:**
```typescript
import { KafkaHealthCheck } from './health-check';
import { getKafkaInstance } from './kafka.config';

const healthCheck = new KafkaHealthCheck(getKafkaInstance());
const result = await healthCheck.check();
```

### `schema-registry.ts`
Schema registry client for Avro serialization.

**Usage:**
```typescript
import { SchemaRegistryClient } from './schema-registry';

const registry = new SchemaRegistryClient('http://localhost:8081');
const encoded = await registry.encode('user.events-value', eventData);
```

## Quick Import

```typescript
import {
  getKafkaInstance,
  KafkaTopic,
  KafkaHealthCheck,
  SchemaRegistryClient
} from '@infrastructure/messaging/kafka';
```

## Environment Variables

```bash
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ecommerce-backend-dev
KAFKA_USERNAME=username  # Production only
KAFKA_PASSWORD=password  # Production only
KAFKA_SSL=true           # Production only
SCHEMA_REGISTRY_URL=http://localhost:8081
```

## See Also

- [Kafka Setup Guide](../../../../../KAFKA-SETUP.md)
- [Quick Start](../../../../../KAFKA-QUICKSTART.md)
