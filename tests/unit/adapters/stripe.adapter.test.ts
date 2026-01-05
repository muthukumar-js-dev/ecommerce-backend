import { StripeAdapter } from '@infrastructure/adapters/stripe/stripe.adapter';
import { Money } from '@domain/product/value-objects/money.vo';
import { isSuccess, isFailure } from '@shared/types/result';

// Mock Stripe
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        customers: {
            create: jest.fn(),
        },
        paymentIntents: {
            create: jest.fn(),
            capture: jest.fn(),
        },
        refunds: {
            create: jest.fn(),
        },
    }));
});

describe('StripeAdapter', () => {
    let adapter: StripeAdapter;
    let mockStripe: any;

    beforeEach(() => {
        adapter = new StripeAdapter('test_key');
        mockStripe = (adapter as any).stripe;
    });

    describe('createCustomer', () => {
        it('should create customer successfully', async () => {
            mockStripe.customers.create.mockResolvedValue({
                id: 'cus_123',
            });

            const result = await adapter.createCustomer('test@example.com', 'Test User');

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value.customerId).toBe('cus_123');
            }
        });

        it('should handle customer creation failure', async () => {
            mockStripe.customers.create.mockRejectedValue(new Error('Stripe error'));

            const result = await adapter.createCustomer('test@example.com', 'Test User');

            expect(isFailure(result)).toBe(true);
        });
    });

    describe('createPaymentIntent', () => {
        it('should create payment intent with correct amount conversion', async () => {
            const amount = Money.create(100, 'USD');

            mockStripe.paymentIntents.create.mockResolvedValue({
                id: 'pi_123',
                amount: 10000, // 100 * 100 cents
                currency: 'usd',
                status: 'requires_payment_method',
                client_secret: 'secret_123',
            });

            const result = await adapter.createPaymentIntent(amount, 'cus_123');

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value.id).toBe('pi_123');
                expect(result.value.amount.amount).toBe(100);
                expect(result.value.status).toBe('pending');
            }

            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
                amount: 10000,
                currency: 'usd',
                customer: 'cus_123',
                metadata: undefined,
            });
        });

        it('should map payment intent status correctly', async () => {
            const amount = Money.create(50, 'USD');

            mockStripe.paymentIntents.create.mockResolvedValue({
                id: 'pi_123',
                amount: 5000,
                currency: 'usd',
                status: 'succeeded',
                client_secret: 'secret_123',
            });

            const result = await adapter.createPaymentIntent(amount, 'cus_123');

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value.status).toBe('succeeded');
            }
        });
    });

    describe('capturePayment', () => {
        it('should capture payment successfully', async () => {
            mockStripe.paymentIntents.capture.mockResolvedValue({});

            const result = await adapter.capturePayment('pi_123');

            expect(isSuccess(result)).toBe(true);
            expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith('pi_123');
        });
    });

    describe('refundPayment', () => {
        it('should create full refund', async () => {
            mockStripe.refunds.create.mockResolvedValue({
                id: 're_123',
            });

            const result = await adapter.refundPayment('pi_123');

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value.refundId).toBe('re_123');
            }

            expect(mockStripe.refunds.create).toHaveBeenCalledWith({
                payment_intent: 'pi_123',
                amount: undefined,
            });
        });

        it('should create partial refund', async () => {
            const refundAmount = Money.create(25, 'USD');

            mockStripe.refunds.create.mockResolvedValue({
                id: 're_123',
            });

            const result = await adapter.refundPayment('pi_123', refundAmount);

            expect(isSuccess(result)).toBe(true);
            expect(mockStripe.refunds.create).toHaveBeenCalledWith({
                payment_intent: 'pi_123',
                amount: 2500,
            });
        });
    });
});
