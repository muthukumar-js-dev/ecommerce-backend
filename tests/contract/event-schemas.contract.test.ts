import Ajv from 'ajv';

const ajv = new Ajv();

describe('Event Schema Validation Tests', () => {
    describe('OrderPlaced Event Schema', () => {
        const OrderPlacedSchema = {
            type: 'object',
            required: ['eventId', 'eventName', 'version', 'payload', 'occurredAt'],
            properties: {
                eventId: { type: 'string' },
                eventName: { type: 'string', enum: ['OrderPlaced'] },
                version: { type: 'number', minimum: 1 },
                payload: {
                    type: 'object',
                    required: ['orderId', 'orderNumber', 'userId', 'totalAmount', 'itemCount', 'placedAt'],
                    properties: {
                        orderId: { type: 'string' },
                        orderNumber: { type: 'string' },
                        userId: { type: 'string' },
                        totalAmount: { type: 'number', minimum: 0 },
                        itemCount: { type: 'number', minimum: 1 },
                        placedAt: { type: 'string' },
                    },
                },
                occurredAt: { type: 'string' },
            },
        };

        it('should validate correct OrderPlaced event', () => {
            const event = {
                eventId: 'evt-123',
                eventName: 'OrderPlaced',
                version: 1,
                payload: {
                    orderId: 'order-123',
                    orderNumber: 'ORD-001',
                    userId: 'user-123',
                    totalAmount: 1000,
                    itemCount: 2,
                    placedAt: new Date().toISOString(),
                },
                occurredAt: new Date().toISOString(),
            };

            const validate = ajv.compile(OrderPlacedSchema);
            const valid = validate(event);

            expect(valid).toBe(true);
            if (!valid) {
                console.error(validate.errors);
            }
        });

        it('should reject OrderPlaced event with missing required fields', () => {
            const invalidEvent = {
                eventId: 'evt-123',
                eventName: 'OrderPlaced',
                version: 1,
                payload: {
                    orderId: 'order-123',
                    // Missing required fields
                },
                occurredAt: new Date().toISOString(),
            };

            const validate = ajv.compile(OrderPlacedSchema);
            const valid = validate(invalidEvent);

            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
            expect(validate.errors?.length).toBeGreaterThan(0);
        });

        it('should reject OrderPlaced event with invalid event name', () => {
            const invalidEvent = {
                eventId: 'evt-123',
                eventName: 'InvalidEvent',
                version: 1,
                payload: {
                    orderId: 'order-123',
                    orderNumber: 'ORD-001',
                    userId: 'user-123',
                    totalAmount: 1000,
                    itemCount: 2,
                    placedAt: new Date().toISOString(),
                },
                occurredAt: new Date().toISOString(),
            };

            const validate = ajv.compile(OrderPlacedSchema);
            const valid = validate(invalidEvent);

            expect(valid).toBe(false);
        });
    });

    describe('PaymentProcessed Event Schema', () => {
        const PaymentProcessedSchema = {
            type: 'object',
            required: ['eventId', 'eventName', 'version', 'payload', 'occurredAt'],
            properties: {
                eventId: { type: 'string' },
                eventName: { type: 'string', enum: ['PaymentProcessed'] },
                version: { type: 'number', minimum: 1 },
                payload: {
                    type: 'object',
                    required: ['paymentId', 'orderId', 'amount', 'status', 'processedAt'],
                    properties: {
                        paymentId: { type: 'string' },
                        orderId: { type: 'string' },
                        amount: { type: 'number', minimum: 0 },
                        status: { type: 'string', enum: ['AUTHORIZED', 'CAPTURED', 'FAILED'] },
                        processedAt: { type: 'string' },
                    },
                },
                occurredAt: { type: 'string' },
            },
        };

        it('should validate correct PaymentProcessed event', () => {
            const event = {
                eventId: 'evt-456',
                eventName: 'PaymentProcessed',
                version: 1,
                payload: {
                    paymentId: 'pay-123',
                    orderId: 'order-123',
                    amount: 1000,
                    status: 'CAPTURED',
                    processedAt: new Date().toISOString(),
                },
                occurredAt: new Date().toISOString(),
            };

            const validate = ajv.compile(PaymentProcessedSchema);
            const valid = validate(event);

            expect(valid).toBe(true);
        });

        it('should reject PaymentProcessed event with invalid status', () => {
            const invalidEvent = {
                eventId: 'evt-456',
                eventName: 'PaymentProcessed',
                version: 1,
                payload: {
                    paymentId: 'pay-123',
                    orderId: 'order-123',
                    amount: 1000,
                    status: 'INVALID_STATUS',
                    processedAt: new Date().toISOString(),
                },
                occurredAt: new Date().toISOString(),
            };

            const validate = ajv.compile(PaymentProcessedSchema);
            const valid = validate(invalidEvent);

            expect(valid).toBe(false);
        });
    });

    describe('NotificationSent Event Schema', () => {
        const NotificationSentSchema = {
            type: 'object',
            required: ['eventId', 'eventName', 'version', 'payload', 'occurredAt'],
            properties: {
                eventId: { type: 'string' },
                eventName: { type: 'string', enum: ['NotificationSent'] },
                version: { type: 'number', minimum: 1 },
                payload: {
                    type: 'object',
                    required: ['notificationId', 'userId', 'channel', 'type', 'sentAt'],
                    properties: {
                        notificationId: { type: 'string' },
                        userId: { type: 'string' },
                        channel: { type: 'string', enum: ['EMAIL', 'SMS'] },
                        type: { type: 'string' },
                        sentAt: { type: 'string' },
                    },
                },
                occurredAt: { type: 'string' },
            },
        };

        it('should validate correct NotificationSent event', () => {
            const event = {
                eventId: 'evt-789',
                eventName: 'NotificationSent',
                version: 1,
                payload: {
                    notificationId: 'notif-123',
                    userId: 'user-123',
                    channel: 'EMAIL',
                    type: 'ORDER_CONFIRMATION',
                    sentAt: new Date().toISOString(),
                },
                occurredAt: new Date().toISOString(),
            };

            const validate = ajv.compile(NotificationSentSchema);
            const valid = validate(event);

            expect(valid).toBe(true);
        });

        it('should reject NotificationSent event with invalid channel', () => {
            const invalidEvent = {
                eventId: 'evt-789',
                eventName: 'NotificationSent',
                version: 1,
                payload: {
                    notificationId: 'notif-123',
                    userId: 'user-123',
                    channel: 'INVALID_CHANNEL',
                    type: 'ORDER_CONFIRMATION',
                    sentAt: new Date().toISOString(),
                },
                occurredAt: new Date().toISOString(),
            };

            const validate = ajv.compile(NotificationSentSchema);
            const valid = validate(invalidEvent);

            expect(valid).toBe(false);
        });
    });
});
