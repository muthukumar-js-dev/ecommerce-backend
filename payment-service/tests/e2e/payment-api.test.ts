import request from 'supertest';
import express from 'express';
import { PaymentController } from '../../../api/controllers/payment.controller';
import { createPaymentRoutes } from '../../../api/routes/payment.routes';
import { InitiatePaymentHandler } from '../../../application/commands/initiate-payment.handler';
import { CapturePaymentHandler } from '../../../application/commands/capture-payment.handler';
import { RefundPaymentHandler } from '../../../application/commands/refund-payment.handler';
import { GetPaymentHandler } from '../../../application/queries/get-payment.handler';
import { success, failure } from '../../../../src/shared/types/result';
import { NotFoundError } from '../../../../src/shared/errors';

describe('Payment API E2E Tests', () => {
    let app: express.Application;
    let mockInitiateHandler: jest.Mocked<InitiatePaymentHandler>;
    let mockCaptureHandler: jest.Mocked<CapturePaymentHandler>;
    let mockRefundHandler: jest.Mocked<RefundPaymentHandler>;
    let mockGetHandler: jest.Mocked<GetPaymentHandler>;

    beforeEach(() => {
        // Create mock handlers
        mockInitiateHandler = { handle: jest.fn() } as any;
        mockCaptureHandler = { handle: jest.fn() } as any;
        mockRefundHandler = { handle: jest.fn() } as any;
        mockGetHandler = { handle: jest.fn() } as any;

        // Create controller with mocks
        const controller = new PaymentController(
            mockInitiateHandler,
            mockCaptureHandler,
            mockRefundHandler,
            mockGetHandler,
            {} as any // Mock Stripe adapter
        );

        // Setup Express app
        app = express();
        app.use(express.json());
        app.use('/api/payments', createPaymentRoutes(controller));
    });

    describe('POST /api/payments/initiate', () => {
        it('should initiate payment successfully', async () => {
            mockInitiateHandler.handle.mockResolvedValue(
                success({
                    paymentId: 'pay_test123',
                    clientSecret: 'secret_test123',
                })
            );

            const response = await request(app)
                .post('/api/payments/initiate')
                .send({
                    orderId: 'order-123',
                    userId: 'user-123',
                    amount: 1000,
                    currency: 'INR',
                    stripeCustomerId: 'cus_test123',
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.paymentId).toBe('pay_test123');
            expect(response.body.data.clientSecret).toBe('secret_test123');
        });

        it('should return 400 for invalid request', async () => {
            const response = await request(app)
                .post('/api/payments/initiate')
                .send({
                    orderId: 'order-123',
                    // Missing required fields
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation failed');
        });

        it('should handle payment initiation failure', async () => {
            mockInitiateHandler.handle.mockResolvedValue(
                failure(new Error('Stripe API error'))
            );

            const response = await request(app)
                .post('/api/payments/initiate')
                .send({
                    orderId: 'order-123',
                    userId: 'user-123',
                    amount: 1000,
                    currency: 'INR',
                    stripeCustomerId: 'cus_test123',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/payments/:paymentId/capture', () => {
        it('should capture payment successfully', async () => {
            mockCaptureHandler.handle.mockResolvedValue(success(undefined));

            const response = await request(app)
                .post('/api/payments/pay_test123/capture')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Payment captured successfully');
        });

        it('should return 400 when payment not found', async () => {
            mockCaptureHandler.handle.mockResolvedValue(
                failure(new NotFoundError('Payment', 'pay_invalid'))
            );

            const response = await request(app)
                .post('/api/payments/pay_invalid/capture')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/payments/:paymentId/refund', () => {
        it('should refund payment successfully', async () => {
            mockRefundHandler.handle.mockResolvedValue(
                success({ refundId: 're_test123' })
            );

            const response = await request(app)
                .post('/api/payments/pay_test123/refund')
                .send({
                    amount: 500,
                    reason: 'Customer request',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.refundId).toBe('re_test123');
        });

        it('should handle full refund without amount', async () => {
            mockRefundHandler.handle.mockResolvedValue(
                success({ refundId: 're_full123' })
            );

            const response = await request(app)
                .post('/api/payments/pay_test123/refund')
                .send({})
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/payments/:paymentId', () => {
        it('should get payment details successfully', async () => {
            mockGetHandler.handle.mockResolvedValue(
                success({
                    id: 'pay_test123',
                    orderId: 'order-123',
                    userId: 'user-123',
                    amount: 1000,
                    currency: 'INR',
                    status: 'CAPTURED',
                    stripePaymentIntentId: 'pi_test123',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any)
            );

            const response = await request(app)
                .get('/api/payments/pay_test123')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe('pay_test123');
            expect(response.body.data.status).toBe('CAPTURED');
        });

        it('should return 404 when payment not found', async () => {
            mockGetHandler.handle.mockResolvedValue(
                failure(new NotFoundError('Payment', 'pay_invalid'))
            );

            const response = await request(app)
                .get('/api/payments/pay_invalid')
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Complete Payment Workflow', () => {
        it('should complete full payment lifecycle', async () => {
            // 1. Initiate payment
            mockInitiateHandler.handle.mockResolvedValue(
                success({
                    paymentId: 'pay_workflow123',
                    clientSecret: 'secret_workflow123',
                })
            );

            const initiateResponse = await request(app)
                .post('/api/payments/initiate')
                .send({
                    orderId: 'order-workflow',
                    userId: 'user-workflow',
                    amount: 2000,
                    currency: 'INR',
                    stripeCustomerId: 'cus_workflow',
                })
                .expect(201);

            expect(initiateResponse.body.data.paymentId).toBe('pay_workflow123');

            // 2. Capture payment
            mockCaptureHandler.handle.mockResolvedValue(success(undefined));

            const captureResponse = await request(app)
                .post('/api/payments/pay_workflow123/capture')
                .expect(200);

            expect(captureResponse.body.success).toBe(true);

            // 3. Get payment details
            mockGetHandler.handle.mockResolvedValue(
                success({
                    id: 'pay_workflow123',
                    orderId: 'order-workflow',
                    userId: 'user-workflow',
                    amount: 2000,
                    currency: 'INR',
                    status: 'CAPTURED',
                } as any)
            );

            const getResponse = await request(app)
                .get('/api/payments/pay_workflow123')
                .expect(200);

            expect(getResponse.body.data.status).toBe('CAPTURED');
        });
    });
});
