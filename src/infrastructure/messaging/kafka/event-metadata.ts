import { DomainEvent } from '../../../shared/domain/domain-event';

export interface EventMetadata {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    correlationId?: string;
    causationId?: string;
    userId?: string;
    timestamp: string;
    version: number;
}

/**
 * Create event metadata for Kafka headers
 */
export function createEventMetadata(
    event: DomainEvent<any>,
    correlationId?: string,
    causationId?: string
): EventMetadata {
    return {
        eventId: event.eventId,
        eventType: event.eventName,
        aggregateId: extractAggregateId(event),
        aggregateType: extractAggregateType(event),
        correlationId: correlationId || event.eventId,
        causationId: causationId,
        userId: (event.payload as any).userId,
        timestamp: new Date().toISOString(),
        version: event.version,
    };
}

/**
 * Convert metadata to Kafka headers
 */
export function metadataToHeaders(metadata: EventMetadata): Record<string, string> {
    return {
        eventId: metadata.eventId,
        eventType: metadata.eventType,
        aggregateId: metadata.aggregateId,
        aggregateType: metadata.aggregateType,
        correlationId: metadata.correlationId || '',
        causationId: metadata.causationId || '',
        userId: metadata.userId || '',
        timestamp: metadata.timestamp,
        version: metadata.version.toString(),
    };
}

/**
 * Extract aggregate ID from event payload
 */
function extractAggregateId(event: DomainEvent<any>): string {
    const payload = event.payload as any;
    return (
        payload.userId ||
        payload.orderId ||
        payload.productId ||
        payload.paymentId ||
        payload.id ||
        'unknown'
    );
}

/**
 * Extract aggregate type from event name
 */
function extractAggregateType(event: DomainEvent<any>): string {
    const eventName = event.eventName;
    if (eventName.includes('User')) return 'User';
    if (eventName.includes('Order')) return 'Order';
    if (eventName.includes('Product')) return 'Product';
    if (eventName.includes('Payment')) return 'Payment';
    return 'Unknown';
}
