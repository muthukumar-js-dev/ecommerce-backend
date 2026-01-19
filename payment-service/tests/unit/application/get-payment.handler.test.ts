import { GetPaymentHandler } from '../../../src/application/queries/get-payment.handler';
import { GetPaymentQuery } from '../../../src/application/queries/get-payment.query';
import { IPaymentRepository } from '../../../src/domain/repositories/payment.repository.interface';
import { Payment, PaymentStatus } from '../../../src/domain/payment.aggregate';
import { Money } from '../../../../src/domain/product/value-objects/money.vo';
import { NotFoundError } from '../../../../src/shared/errors';

describe('GetPaymentHandler', () => {
    let handler: GetPaymentHandler;
    let mockRepository: jest.Mocked<IPaymentRepository>;

    beforeEach(() => {
        mockRepository = {
            findById: jest.fn(),
            findByOrderId: jest.fn(),
            findByUserId: jest.fn(),
            findByStripePaymentIntentId: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        } as any;

        handler = new GetPaymentHandler(mockRepository);
    });

    describe('handle', () => {
        it('should return payment DTO when payment exists', async () => {
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );

            mockRepository.findById.mockResolvedValue(payment);

            const query = new GetPaymentQuery('pay_test123');
            const result = await handler.handle(query);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe('pay_test123');
                expect(result.data.orderId).toBe('order-123');
                expect(result.data.userId).toBe('user-123');
                expect(result.data.amount).toBe(1000);
                expect(result.data.currency).toBe('INR');
                expect(result.data.status).toBe(PaymentStatus.PENDING);
            }
            expect(mockRepository.findById).toHaveBeenCalledWith('pay_test123');
        });

        it('should return NotFoundError when payment does not exist', async () => {
            mockRepository.findById.mockResolvedValue(null);

            const query = new GetPaymentQuery('pay_nonexistent');
            const result = await handler.handle(query);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(NotFoundError);
                expect(result.error.message).toContain('pay_nonexistent');
            }
        });

        it('should handle repository errors', async () => {
            const error = new Error('Database connection failed');
            mockRepository.findById.mockRejectedValue(error);

            const query = new GetPaymentQuery('pay_test123');
            const result = await handler.handle(query);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
        });
    });
});
