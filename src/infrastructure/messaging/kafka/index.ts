// Kafka Infrastructure - Main Export
export * from './kafka.config';
export * from './topics';
export * from './health-check';
export * from './schema-registry';
export * from './kafka-producer';
export * from './kafka-consumer';
export * from './event-metadata';

// Re-export commonly used items
export { getKafkaInstance, getKafkaConfig } from './kafka.config';
export { KafkaTopic, getTopicForEvent } from './topics';
export { KafkaHealthCheck } from './health-check';
export { SchemaRegistryClient } from './schema-registry';
export { KafkaProducer } from './kafka-producer';
export { KafkaConsumer } from './kafka-consumer';
export { createEventMetadata, metadataToHeaders } from './event-metadata';
