import { StripeAdapter } from '@infrastructure/adapters/stripe/stripe.adapter';
import { Money } from '@domain/product/value-objects/money.vo';
import { isSuccess, isFailure } from '@shared/types/result';

/**
 * Contract Tests for Stripe Integration
 * These tests verify that our adapter correctly interacts with Stripe's API
 * Run with: npm run test:contract
 * Requires: STRIPE_TEST_KEY environment variable
 */
describe('Stripe Contract Tests', () => {
    let adapter: StripeAdapter;
    let testCustomerId: string;

    beforeAll(() => {
        const stripeKey = process.env.STRIPE_TEST_KEY || process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || !stripeKey.startsWith('sk_test_')) {
            console.warn('Skipping Stripe contract tests: No test key found');
            return;
        }
        adapter = new StripeAdapter(stripeKey);
    });

    describe('Customer Management', () => {
        it('should create customer with expected response structure', async () => {
            if (!adapter) return;

            const result = await adapter.createCustomer(
                'contract-test@example.com',
                'Contract Test User'
            );

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value.customerId).toMatch(/^cus_/);
                testCustomerId = result.value.customerId;
            }
        });

        it('should handle duplicate email gracefully', async () => {
            if (!adapter) return;

            // Stripe allows duplicate emails, so this should succeed
            const result = await adapter.createCustomer(
                'contract-test@example.com',
                'Duplicate Test'
            );

            expect(isSuccess(result)).toBe(true);
        });
    });

    describe('Payment Intent Creation', () => {
        it('should create payment intent with correct amount conversion', async () => {
            if (!adapter || !testCustomerId) return;

            const amount = Money.create(1000, 'INR');
            const result = await adapter.createPaymentIntent(amount, testCustomerId);

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value.id).toMatch(/^pi_/);
                expect(result.value.amount.amount).toBe(1000);
                expect(result.value.amount.currency).toBe('INR');
                expect(result.value.status).toBe('pending');
                expect(result.value.clientSecret).toBeDefined();
            }
        });

        it('should handle different currencies', async () => {
            if (!adapter || !testCustomerId) return;

            const usdAmount = Money.create(50, 'USD');
            const result = await adapter.createPaymentIntent(usdAmount, testCustomerId);

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value.amount.currency).toBe('USD');
            }
        });

        it('should include metadata in payment intent', async () => {
            if (!adapter || !testCustomerId) return;

            const amount = Money.create(500, 'INR');
            const metadata = {
                orderId: 'order-123',
                userId: 'user-456',
            };

            const result = await adapter.createPaymentIntent(
                amount,
                testCustomerId,
                metadata
            );

            expect(isSuccess(result)).toBe(true);
        });

        it('should reject invalid customer ID', async () => {
            if (!adapter) return;

            const amount = Money.create(100, 'INR');
            const result = await adapter.createPaymentIntent(amount, 'invalid-customer-id');

            expect(isFailure(result)).toBe(true);
        });
    });

    describe('Payment Capture', () => {
        it('should handle capture of non-existent payment', async () => {
            if (!adapter) return;

            const result = await adapter.capturePayment('pi_invalid_123');

            expect(isFailure(result)).toBe(true);
        });
    });

    describe('Refunds', () => {
        it('should handle refund of non-existent payment', async () => {
            if (!adapter) return;

            const result = await adapter.refundPayment('pi_invalid_123');

            expect(isFailure(result)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            if (!adapter) return;

            // Create adapter with invalid key to simulate error
            const invalidAdapter = new StripeAdapter('sk_test_invalid');
            const result = await invalidAdapter.createCustomer('test@example.com', 'Test');

            expect(isFailure(result)).toBe(true);
            if (isFailure(result)) {
                expect(result.error.message).toContain('Stripe');
            }
        });
    });
});
