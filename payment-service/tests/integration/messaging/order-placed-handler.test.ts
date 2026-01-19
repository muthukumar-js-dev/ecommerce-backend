import { OrderPlacedHandler } from '../../../src/infrastructure/messaging/handlers/order-placed.handler';
import { InitiatePaymentHandler } from '../../../src/application/commands/initiate-payment.handler';
import { EachMessagePayload } from 'kafkajs';

describe('OrderPlacedHandler', () => {
    let handler: OrderPlacedHandler;
    let mockInitiateHandler: jest.Mocked<InitiatePaymentHandler>;

    beforeEach(() => {
        mockInitiateHandler = {
            handle: jest.fn(),
        } as any;

        handler = new OrderPlacedHandler(mockInitiateHandler);
    });

    describe('handle', () => {
        it('should initiate payment when OrderPlaced event is received', async () => {
            const payload: EachMessagePayload = {
                topic: 'order.events',
                partition: 0,
                message: {
                    key: Buffer.from('order-123'),
                    value: Buffer.from(
                        JSON.stringify({
                            orderId: 'order-123',
                            userId: 'user-123',
                            totalAmount: 1000,
                            currency: 'INR',
                            stripeCustomerId: 'cus_test123',
                        })
                    ),
                    timestamp: '0',
                    attributes: 0,
                    offset: '0',
                    headers: {
                        eventId: Buffer.from('evt-123'),
                        eventType: Buffer.from('OrderPlaced'),
                    },
                },
            } as any;

            mockInitiateHandler.handle.mockResolvedValue({
                success: true,
                data: { paymentId: 'pay_test123', clientSecret: 'secret_test' },
            } as any);

            await handler.handle(payload);

            expect(mockInitiateHandler.handle).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderId: 'order-123',
                    userId: 'user-123',
                    amount: 1000,
                    currency: 'INR',
                    stripeCustomerId: 'cus_test123',
                })
            );
        });

        it('should handle idempotency - skip already processed events', async () => {
            const payload: EachMessagePayload = {
                topic: 'order.events',
                partition: 0,
                message: {
                    key: Buffer.from('order-123'),
                    value: Buffer.from(
                        JSON.stringify({
                            orderId: 'order-123',
                            userId: 'user-123',
                            totalAmount: 1000,
                            stripeCustomerId: 'cus_test123',
                        })
                    ),
                    timestamp: '0',
                    attributes: 0,
                    offset: '0',
                    headers: {
                        eventId: Buffer.from('evt-duplicate'),
                        eventType: Buffer.from('OrderPlaced'),
                    },
                },
            } as any;

            mockInitiateHandler.handle.mockResolvedValue({
                success: true,
                data: { paymentId: 'pay_test123' },
            } as any);

            // Process event first time
            await handler.handle(payload);
            expect(mockInitiateHandler.handle).toHaveBeenCalledTimes(1);

            // Process same event again (duplicate)
            await handler.handle(payload);
            // Should not call handler again due to idempotency
            expect(mockInitiateHandler.handle).toHaveBeenCalledTimes(1);
        });

        it('should throw error when payment initiation fails', async () => {
            const payload: EachMessagePayload = {
                topic: 'order.events',
                partition: 0,
                message: {
                    key: Buffer.from('order-456'),
                    value: Buffer.from(
                        JSON.stringify({
                            orderId: 'order-456',
                            userId: 'user-456',
                            totalAmount: 2000,
                            stripeCustomerId: 'cus_test456',
                        })
                    ),
                    timestamp: '0',
                    attributes: 0,
                    offset: '0',
                    headers: {
                        eventId: Buffer.from('evt-456'),
                        eventType: Buffer.from('OrderPlaced'),
                    },
                },
            } as any;

            const error = new Error('Payment initiation failed');
            mockInitiateHandler.handle.mockResolvedValue({
                success: false,
                error,
            } as any);

            await expect(handler.handle(payload)).rejects.toThrow('Payment initiation failed');
        });

        it('should handle payload with nested data structure', async () => {
            const payload: EachMessagePayload = {
                topic: 'order.events',
                partition: 0,
                message: {
                    key: Buffer.from('order-789'),
                    value: Buffer.from(
                        JSON.stringify({
                            payload: {
                                orderId: 'order-789',
                                userId: 'user-789',
                                totalAmount: 3000,
                                currency: 'USD',
                                stripeCustomerId: 'cus_test789',
                            },
                        })
                    ),
                    timestamp: '0',
                    attributes: 0,
                    offset: '0',
                    headers: {
                        eventId: Buffer.from('evt-789'),
                        eventType: Buffer.from('OrderPlaced'),
                    },
                },
            } as any;

            mockInitiateHandler.handle.mockResolvedValue({
                success: true,
                data: { paymentId: 'pay_test789' },
            } as any);

            await handler.handle(payload);

            expect(mockInitiateHandler.handle).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderId: 'order-789',
                    userId: 'user-789',
                    amount: 3000,
                    currency: 'USD',
                })
            );
        });
    });
});
