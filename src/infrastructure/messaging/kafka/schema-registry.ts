import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';

export class SchemaRegistryClient {
    private registry: SchemaRegistry;

    constructor(host: string = 'http://localhost:8081') {
        this.registry = new SchemaRegistry({ host });
    }

    async registerSchema(subject: string, schema: any): Promise<number> {
        const { id } = await this.registry.register(
            {
                type: SchemaType.AVRO,
                schema: JSON.stringify(schema),
            },
            { subject }
        );

        return id;
    }

    async encode(subject: string, payload: any): Promise<Buffer> {
        const id = await this.registry.getLatestSchemaId(subject);
        return this.registry.encode(id, payload);
    }

    async decode(buffer: Buffer): Promise<any> {
        return this.registry.decode(buffer);
    }

    async getLatestSchema(subject: string): Promise<any> {
        return this.registry.getLatestSchemaId(subject);
    }
}

// Avro Schemas for Domain Events

export const UserRegisteredSchema = {
    type: 'record',
    name: 'UserRegistered',
    namespace: 'com.ecommerce.events.user',
    fields: [
        { name: 'eventId', type: 'string' },
        { name: 'userId', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'role', type: 'string' },
        {
            name: 'registeredAt',
            type: { type: 'long', logicalType: 'timestamp-millis' },
        },
    ],
};

export const OrderPlacedSchema = {
    type: 'record',
    name: 'OrderPlaced',
    namespace: 'com.ecommerce.events.order',
    fields: [
        { name: 'eventId', type: 'string' },
        { name: 'orderId', type: 'string' },
        { name: 'orderNumber', type: 'string' },
        { name: 'userId', type: 'string' },
        { name: 'totalAmount', type: 'double' },
        { name: 'itemCount', type: 'int' },
        {
            name: 'placedAt',
            type: { type: 'long', logicalType: 'timestamp-millis' },
        },
    ],
};

export const ProductCreatedSchema = {
    type: 'record',
    name: 'ProductCreated',
    namespace: 'com.ecommerce.events.product',
    fields: [
        { name: 'eventId', type: 'string' },
        { name: 'productId', type: 'string' },
        { name: 'sku', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'price', type: 'double' },
        { name: 'category', type: 'string' },
        {
            name: 'createdAt',
            type: { type: 'long', logicalType: 'timestamp-millis' },
        },
    ],
};

// Schema registry initialization
export async function initializeSchemas(
    registry: SchemaRegistryClient
): Promise<void> {
    await registry.registerSchema('user.events-value', UserRegisteredSchema);
    await registry.registerSchema('order.events-value', OrderPlacedSchema);
    await registry.registerSchema('product.events-value', ProductCreatedSchema);

    console.log('✓ Schemas registered successfully');
}
