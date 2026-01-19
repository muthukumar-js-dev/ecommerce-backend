import { GetPaymentsByOrderHandler } from '../../../src/application/queries/get-payments-by-order.handler';
import { GetPaymentsByOrderQuery } from '../../../src/application/queries/get-payments-by-order.query';
import { IPaymentRepository } from '../../../src/domain/repositories/payment.repository.interface';
import { Payment } from '../../../src/domain/payment.aggregate';
import { Money } from '../../../../src/domain/product/value-objects/money.vo';

describe('GetPaymentsByOrderHandler', () => {
    let handler: GetPaymentsByOrderHandler;
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

        handler = new GetPaymentsByOrderHandler(mockRepository);
    });

    describe('handle', () => {
        it('should return array of payment DTOs for order', async () => {
            const payment1 = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test1'
            );

            const payment2 = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(500, 'INR'),
                'cus_test123',
                'pay_test2'
            );

            mockRepository.findByOrderId.mockResolvedValue([payment1, payment2]);

            const query = new GetPaymentsByOrderQuery('order-123');
            const result = await handler.handle(query);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveLength(2);
                expect(result.data![0].id).toBe('pay_test1');
                expect(result.data![1].id).toBe('pay_test2');
                expect(result.data![0].orderId).toBe('order-123');
            }
            expect(mockRepository.findByOrderId).toHaveBeenCalledWith('order-123');
        });

        it('should return empty array when no payments found', async () => {
            mockRepository.findByOrderId.mockResolvedValue([]);

            const query = new GetPaymentsByOrderQuery('order-nonexistent');
            const result = await handler.handle(query);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveLength(0);
            }
        });

        it('should handle repository errors', async () => {
            const error = new Error('Database error');
            mockRepository.findByOrderId.mockRejectedValue(error);

            const query = new GetPaymentsByOrderQuery('order-123');
            const result = await handler.handle(query);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(error);
            }
        });
    });
});
