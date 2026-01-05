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
        replicationFactor: 3, // Production: 3, Dev: 1
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

// Map domain event names to Kafka topics
export function getTopicForEvent(eventName: string): KafkaTopic {
    // User events
    if (eventName.startsWith('User')) {
        return KafkaTopic.USER_EVENTS;
    }

    // Order events
    if (eventName.startsWith('Order')) {
        return KafkaTopic.ORDER_EVENTS;
    }

    // Payment events
    if (eventName.startsWith('Payment')) {
        return KafkaTopic.PAYMENT_EVENTS;
    }

    // Product events
    if (eventName.startsWith('Product')) {
        return KafkaTopic.PRODUCT_EVENTS;
    }

    // Notification events
    if (eventName.includes('Notification') || eventName.includes('Email')) {
        return KafkaTopic.NOTIFICATION_EVENTS;
    }

    // Default to DLQ for unknown events
    console.warn(`Unknown event type: ${eventName}, routing to DLQ`);
    return KafkaTopic.DLQ_EVENTS;
}
