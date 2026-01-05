import nock from 'nock';
import { StripeAdapter } from '../../../infrastructure/stripe/stripe.adapter';
import { Money } from '../../../../src/domain/product/value-objects/money.vo';

describe('Stripe Integration (Mocked)', () => {
    let stripeAdapter: StripeAdapter;
    const STRIPE_API_KEY = 'sk_test_mock_key';
    const STRIPE_BASE_URL = 'https://api.stripe.com';

    beforeAll(() => {
        stripeAdapter = new StripeAdapter(STRIPE_API_KEY);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('createPaymentIntent', () => {
        it('should create payment intent successfully', async () => {
            const mockResponse = {
                id: 'pi_test123',
                amount: 100000,
                currency: 'inr',
                status: 'requires_capture',
                client_secret: 'pi_test123_secret_test',
                customer: 'cus_test123',
            };

            nock(STRIPE_BASE_URL)
                .post('/v1/payment_intents')
                .reply(200, mockResponse);

            const amount = Money.create(1000, 'INR');
            const result = await stripeAdapter.createPaymentIntent(
                amount,
                'cus_test123',
                { orderId: 'order-123' }
            );

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe('pi_test123');
                expect(result.data.amount.amount).toBe(1000);
                expect(result.data.clientSecret).toBe('pi_test123_secret_test');
            }
        });

        it('should handle Stripe API errors', async () => {
            nock(STRIPE_BASE_URL)
                .post('/v1/payment_intents')
                .reply(400, {
                    error: {
                        type: 'invalid_request_error',
                        message: 'Invalid customer ID',
                    },
                });

            const amount = Money.create(1000, 'INR');
            const result = await stripeAdapter.createPaymentIntent(
                amount,
                'invalid_customer',
                {}
            );

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Failed to create payment intent');
            }
        });
    });

    describe('capturePayment', () => {
        it('should capture payment successfully', async () => {
            const mockResponse = {
                id: 'pi_test123',
                status: 'succeeded',
                amount_captured: 100000,
            };

            nock(STRIPE_BASE_URL)
                .post('/v1/payment_intents/pi_test123/capture')
                .reply(200, mockResponse);

            const result = await stripeAdapter.capturePayment('pi_test123');

            expect(result.success).toBe(true);
        });

        it('should handle capture errors', async () => {
            nock(STRIPE_BASE_URL)
                .post('/v1/payment_intents/pi_invalid/capture')
                .reply(404, {
                    error: {
                        type: 'invalid_request_error',
                        message: 'No such payment_intent',
                    },
                });

            const result = await stripeAdapter.capturePayment('pi_invalid');

            expect(result.success).toBe(false);
        });
    });

    describe('refundPayment', () => {
        it('should refund payment successfully', async () => {
            const mockResponse = {
                id: 're_test123',
                payment_intent: 'pi_test123',
                amount: 100000,
                status: 'succeeded',
            };

            nock(STRIPE_BASE_URL)
                .post('/v1/refunds')
                .reply(200, mockResponse);

            const result = await stripeAdapter.refundPayment('pi_test123');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.refundId).toBe('re_test123');
            }
        });

        it('should handle partial refunds', async () => {
            const mockResponse = {
                id: 're_partial123',
                payment_intent: 'pi_test123',
                amount: 50000,
                status: 'succeeded',
            };

            nock(STRIPE_BASE_URL)
                .post('/v1/refunds')
                .reply(200, mockResponse);

            const amount = Money.create(500, 'INR');
            const result = await stripeAdapter.refundPayment('pi_test123', amount);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.refundId).toBe('re_partial123');
            }
        });
    });

    describe('createCustomer', () => {
        it('should create customer successfully', async () => {
            const mockResponse = {
                id: 'cus_new123',
                email: 'test@example.com',
                name: 'Test User',
            };

            nock(STRIPE_BASE_URL)
                .post('/v1/customers')
                .reply(200, mockResponse);

            const result = await stripeAdapter.createCustomer('test@example.com', 'Test User');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.customerId).toBe('cus_new123');
            }
        });
    });
});
