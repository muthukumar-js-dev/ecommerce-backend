import { Payment, PaymentStatus } from '../../../src/domain/payment.aggregate';
import { Money } from '../../../../src/domain/product/value-objects/money.vo';

describe('Payment Aggregate', () => {
    describe('initiate', () => {
        it('should create a new payment in PENDING status', () => {
            const orderId = 'order-123';
            const userId = 'user-123';
            const amount = Money.create(1000, 'INR');
            const stripeCustomerId = 'cus_test123';
            const paymentId = 'pay_test123';

            const payment = Payment.initiate(orderId, userId, amount, stripeCustomerId, paymentId);

            expect(payment.id).toBe(paymentId);
            expect(payment.orderId).toBe(orderId);
            expect(payment.userId).toBe(userId);
            expect(payment.amount).toEqual(amount);
            expect(payment.status).toBe(PaymentStatus.PENDING);
            expect(payment.domainEvents.length).toBe(1);
            expect(payment.domainEvents[0]!.eventName).toBe('PaymentInitiated');
        });
    });

    describe('authorize', () => {
        it('should authorize a pending payment', () => {
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );

            payment.authorize('pi_test123');

            expect(payment.status).toBe(PaymentStatus.AUTHORIZED);
            expect(payment.stripePaymentIntentId).toBe('pi_test123');
        });

        it('should throw error when authorizing non-pending payment', () => {
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );
            payment.authorize('pi_test123');

            expect(() => payment.authorize('pi_test456')).toThrow('Can only authorize pending payments');
        });
    });

    describe('capture', () => {
        it('should capture an authorized payment', () => {
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );
            payment.authorize('pi_test123');
            payment.clearDomainEvents();

            payment.capture();

            expect(payment.status).toBe(PaymentStatus.CAPTURED);
            expect(payment.domainEvents.length).toBe(1);
            expect(payment.domainEvents[0]!.eventName).toBe('PaymentSucceeded');
        });

        it('should throw error when capturing non-authorized payment', () => {
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );

            expect(() => payment.capture()).toThrow('Can only capture authorized payments');
        });
    });

    describe('fail', () => {
        it('should mark payment as failed', () => {
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );
            payment.clearDomainEvents();

            payment.fail('Insufficient funds');

            expect(payment.status).toBe(PaymentStatus.FAILED);
            expect(payment.failureReason).toBe('Insufficient funds');
            expect(payment.domainEvents.length).toBe(1);
            expect(payment.domainEvents[0]!.eventName).toBe('PaymentFailed');
        });
    });

    describe('refund', () => {
        it('should refund a captured payment', () => {
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );
            payment.authorize('pi_test123');
            payment.capture();

            payment.refund('re_test123');

            expect(payment.status).toBe(PaymentStatus.REFUNDED);
        });

        it('should throw error when refunding non-captured payment', () => {
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );

            expect(() => payment.refund('re_test123')).toThrow('Can only refund captured payments');
        });
    });
});
