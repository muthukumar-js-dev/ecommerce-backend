import { InitiatePaymentHandler } from '../../../application/commands/initiate-payment.handler';
import { InitiatePaymentCommand } from '../../../application/commands/initiate-payment.command';
import { IPaymentRepository } from '../../../domain/repositories/payment.repository.interface';
import { IPaymentGateway } from '../../../../../src/application/ports/payment-gateway.port';
import { Money } from '../../../../../src/domain/product/value-objects/money.vo';
import { success, failure } from '../../../../../src/shared/types/result';
import { ExternalServiceError } from '../../../../../src/shared/errors/external-service.error';

describe('InitiatePaymentHandler', () => {
    let handler: InitiatePaymentHandler;
    let mockRepository: jest.Mocked<IPaymentRepository>;
    let mockGateway: jest.Mocked<IPaymentGateway>;

    beforeEach(() => {
        mockRepository = {
            findById: jest.fn(),
            findByOrderId: jest.fn(),
            findByUserId: jest.fn(),
            findByStripePaymentIntentId: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        } as any;

        mockGateway = {
            createCustomer: jest.fn(),
            createPaymentIntent: jest.fn(),
            capturePayment: jest.fn(),
            refundPayment: jest.fn(),
        } as any;

        handler = new InitiatePaymentHandler(mockRepository, mockGateway);
    });

    describe('handle', () => {
        it('should successfully initiate payment', async () => {
            const command = new InitiatePaymentCommand(
                'order-123',
                'user-123',
                1000,
                'INR',
                'cus_test123'
            );

            const mockPaymentIntent = {
                id: 'pi_test123',
                amount: Money.create(1000, 'INR'),
                status: 'pending' as const,
                clientSecret: 'secret_test123',
            };

            mockGateway.createPaymentIntent.mockResolvedValue(success(mockPaymentIntent));
            mockRepository.save.mockResolvedValue(success({} as any));

            const result = await handler.handle(command);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.paymentId).toBeDefined();
                expect(result.data.clientSecret).toBe('secret_test123');
            }
            expect(mockGateway.createPaymentIntent).toHaveBeenCalledWith(
                expect.any(Money),
                'cus_test123',
                expect.objectContaining({
                    orderId: 'order-123',
                })
            );
            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should handle Stripe API failure', async () => {
            const command = new InitiatePaymentCommand(
                'order-123',
                'user-123',
                1000,
                'INR',
                'cus_test123'
            );

            const error = new ExternalServiceError('Stripe', 'API Error', new Error('Network error'));
            mockGateway.createPaymentIntent.mockResolvedValue(failure(error));
            mockRepository.save.mockResolvedValue(success({} as any));

            const result = await handler.handle(command);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
            // Payment should still be saved with FAILED status
            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should handle repository save failure', async () => {
            const command = new InitiatePaymentCommand(
                'order-123',
                'user-123',
                1000,
                'INR',
                'cus_test123'
            );

            const mockPaymentIntent = {
                id: 'pi_test123',
                amount: Money.create(1000, 'INR'),
                status: 'pending' as const,
                clientSecret: 'secret_test123',
            };

            mockGateway.createPaymentIntent.mockResolvedValue(success(mockPaymentIntent));
            mockRepository.save.mockResolvedValue(failure(new Error('Database error')));

            const result = await handler.handle(command);

            expect(result.success).toBe(false);
        });
    });
});
