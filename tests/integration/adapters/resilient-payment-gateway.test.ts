import { ResilientPaymentGateway } from '@infrastructure/adapters/resilient-payment-gateway';
import { IPaymentGateway, PaymentIntent } from '@application/ports/payment-gateway.port';
import { Money } from '@domain/product/value-objects/money.vo';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors/external-service.error';

describe('ResilientPaymentGateway Integration', () => {
    let mockGateway: jest.Mocked<IPaymentGateway>;
    let resilientGateway: ResilientPaymentGateway;

    beforeEach(() => {
        mockGateway = {
            createCustomer: jest.fn(),
            createPaymentIntent: jest.fn(),
            capturePayment: jest.fn(),
            refundPayment: jest.fn(),
        };
        resilientGateway = new ResilientPaymentGateway(mockGateway);
    });

    describe('Retry Behavior', () => {
        it('should retry failed operations and eventually succeed', async () => {
            mockGateway.createCustomer
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValue(success({ customerId: 'cus_123' }));

            const result = await resilientGateway.createCustomer('test@example.com', 'Test User');

            expect(mockGateway.createCustomer).toHaveBeenCalledTimes(3);
            expect(result).toEqual(success({ customerId: 'cus_123' }));
        });

        it('should fail after max retry attempts', async () => {
            mockGateway.createCustomer.mockRejectedValue(new Error('Persistent error'));

            await expect(
                resilientGateway.createCustomer('test@example.com', 'Test User')
            ).rejects.toThrow('Persistent error');

            expect(mockGateway.createCustomer).toHaveBeenCalledTimes(3);
        });
    });

    describe('Circuit Breaker Behavior', () => {
        it('should open circuit after threshold failures', async () => {
            mockGateway.createPaymentIntent.mockRejectedValue(new Error('Service down'));

            const amount = Money.create(100, 'USD');

            // Trigger 5 failures to open circuit
            for (let i = 0; i < 5; i++) {
                try {
                    await resilientGateway.createPaymentIntent(amount, 'cus_123');
                } catch (error) {
                    // Expected
                }
            }

            // Next call should fail immediately due to open circuit
            await expect(
                resilientGateway.createPaymentIntent(amount, 'cus_123')
            ).rejects.toThrow('Circuit breaker is OPEN');

            // Should not have made additional calls to the underlying gateway
            expect(mockGateway.createPaymentIntent).toHaveBeenCalledTimes(15); // 5 attempts * 3 retries each
        });

        it('should allow requests after circuit timeout', async () => {
            jest.useFakeTimers();

            mockGateway.capturePayment.mockRejectedValue(new Error('Service down'));

            // Trigger failures to open circuit
            for (let i = 0; i < 5; i++) {
                try {
                    await resilientGateway.capturePayment('pi_123');
                } catch (error) {
                    // Expected
                }
            }

            // Fast-forward past circuit timeout (60 seconds)
            jest.advanceTimersByTime(61000);

            // Mock successful response
            mockGateway.capturePayment.mockResolvedValue(success(undefined));

            // Should allow request and succeed
            const result = await resilientGateway.capturePayment('pi_123');
            expect(result).toEqual(success(undefined));

            jest.useRealTimers();
        });
    });

    describe('All Operations', () => {
        it('should apply resilience to createCustomer', async () => {
            mockGateway.createCustomer.mockResolvedValue(success({ customerId: 'cus_123' }));

            const result = await resilientGateway.createCustomer('test@example.com', 'Test User');

            expect(result).toEqual(success({ customerId: 'cus_123' }));
        });

        it('should apply resilience to createPaymentIntent', async () => {
            const amount = Money.create(100, 'USD');
            const paymentIntent: PaymentIntent = {
                id: 'pi_123',
                amount,
                status: 'pending',
            };

            mockGateway.createPaymentIntent.mockResolvedValue(success(paymentIntent));

            const result = await resilientGateway.createPaymentIntent(amount, 'cus_123');

            expect(result).toEqual(success(paymentIntent));
        });

        it('should apply resilience to capturePayment', async () => {
            mockGateway.capturePayment.mockResolvedValue(success(undefined));

            const result = await resilientGateway.capturePayment('pi_123');

            expect(result).toEqual(success(undefined));
        });

        it('should apply resilience to refundPayment', async () => {
            mockGateway.refundPayment.mockResolvedValue(success({ refundId: 're_123' }));

            const result = await resilientGateway.refundPayment('pi_123');

            expect(result).toEqual(success({ refundId: 're_123' }));
        });
    });
});
