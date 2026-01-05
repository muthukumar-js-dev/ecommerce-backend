import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { PaymentRepository } from '../../../src/infrastructure/database/repositories/payment.repository';
import { PaymentModel } from '../../../src/infrastructure/database/schemas/payment.schema';
import { Payment, PaymentStatus } from '../../../src/domain/payment.aggregate';
import { Money } from '../../../../src/domain/product/value-objects/money.vo';
import { OutboxRepository } from '../../../../src/infrastructure/database/mongodb/repositories/outbox.repository';

describe('Payment Flow Integration Test', () => {
    let mongoServer: MongoMemoryServer;
    let paymentRepository: PaymentRepository;
    let outboxRepository: OutboxRepository;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await PaymentModel.deleteMany({});
        outboxRepository = new OutboxRepository();
        paymentRepository = new PaymentRepository(outboxRepository);
    });

    describe('Complete Payment Flow', () => {
        it('should initiate, authorize, and capture payment', async () => {
            // 1. Initiate payment
            const payment = Payment.initiate(
                'order-123',
                'user-123',
                Money.create(1000, 'INR'),
                'cus_test123',
                'pay_test123'
            );

            expect(payment.status).toBe(PaymentStatus.PENDING);
            expect(payment.domainEvents.length).toBe(1);
            expect(payment.domainEvents[0].eventName).toBe('PaymentInitiated');

            // 2. Authorize payment
            payment.authorize('pi_test123');
            expect(payment.status).toBe(PaymentStatus.AUTHORIZED);
            expect(payment.stripePaymentIntentId).toBe('pi_test123');

            // 3. Save payment
            const saveResult = await paymentRepository.save(payment);
            expect(saveResult.success).toBe(true);

            // 4. Verify payment was saved
            const savedPayment = await paymentRepository.findById('pay_test123');
            expect(savedPayment).not.toBeNull();
            expect(savedPayment?.status).toBe(PaymentStatus.AUTHORIZED);

            // 5. Capture payment
            if (savedPayment) {
                savedPayment.capture();
                expect(savedPayment.status).toBe(PaymentStatus.CAPTURED);
                expect(savedPayment.domainEvents.length).toBe(1);
                expect(savedPayment.domainEvents[0].eventName).toBe('PaymentSucceeded');

                // 6. Update payment
                const updateResult = await paymentRepository.update(savedPayment);
                expect(updateResult.success).toBe(true);

                // 7. Verify final state
                const finalPayment = await paymentRepository.findById('pay_test123');
                expect(finalPayment?.status).toBe(PaymentStatus.CAPTURED);
            }
        });

        it('should handle payment failure', async () => {
            const payment = Payment.initiate(
                'order-456',
                'user-456',
                Money.create(2000, 'INR'),
                'cus_test456',
                'pay_test456'
            );

            payment.fail('Insufficient funds');

            expect(payment.status).toBe(PaymentStatus.FAILED);
            expect(payment.failureReason).toBe('Insufficient funds');
            expect(payment.domainEvents.length).toBe(2); // PaymentInitiated + PaymentFailed

            const saveResult = await paymentRepository.save(payment);
            expect(saveResult.success).toBe(true);

            const savedPayment = await paymentRepository.findById('pay_test456');
            expect(savedPayment?.status).toBe(PaymentStatus.FAILED);
            expect(savedPayment?.failureReason).toBe('Insufficient funds');
        });

        it('should find payments by order ID', async () => {
            const payment1 = Payment.initiate(
                'order-789',
                'user-789',
                Money.create(1000, 'INR'),
                'cus_test789',
                'pay_test789_1'
            );

            const payment2 = Payment.initiate(
                'order-789',
                'user-789',
                Money.create(500, 'INR'),
                'cus_test789',
                'pay_test789_2'
            );

            await paymentRepository.save(payment1);
            await paymentRepository.save(payment2);

            const payments = await paymentRepository.findByOrderId('order-789');
            expect(payments.length).toBe(2);
            expect(payments.map((p) => p.id)).toContain('pay_test789_1');
            expect(payments.map((p) => p.id)).toContain('pay_test789_2');
        });

        it('should find payments by user ID', async () => {
            const payment1 = Payment.initiate(
                'order-111',
                'user-common',
                Money.create(1000, 'INR'),
                'cus_common',
                'pay_common_1'
            );

            const payment2 = Payment.initiate(
                'order-222',
                'user-common',
                Money.create(2000, 'INR'),
                'cus_common',
                'pay_common_2'
            );

            await paymentRepository.save(payment1);
            await paymentRepository.save(payment2);

            const payments = await paymentRepository.findByUserId('user-common');
            expect(payments.length).toBe(2);
        });
    });
});
