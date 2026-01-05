import { Payment, PaymentStatus } from '../../domain/payment.aggregate';
import { ID } from '@shared/types/common';

/**
 * Data Transfer Object for Payment
 */
export class PaymentDTO {
    constructor(
        public readonly id: ID,
        public readonly orderId: ID,
        public readonly userId: ID,
        public readonly amount: number,
        public readonly currency: string,
        public readonly status: PaymentStatus,
        public readonly stripePaymentIntentId?: string,
        public readonly stripeCustomerId?: string,
        public readonly failureReason?: string,
        public readonly refundId?: string,
        public readonly metadata?: Record<string, string>,
        public readonly createdAt?: Date,
        public readonly updatedAt?: Date
    ) { }

    /**
     * Create DTO from Payment aggregate
     */
    static fromAggregate(payment: Payment): PaymentDTO {
        return new PaymentDTO(
            payment.id,
            payment.orderId,
            payment.userId,
            payment.amount.amount,
            payment.amount.currency,
            payment.status,
            payment.stripePaymentIntentId,
            payment['props'].stripeCustomerId,
            payment.failureReason,
            payment['props'].refundId,
            payment['props'].metadata,
            payment['props'].createdAt,
            payment['props'].updatedAt
        );
    }
}
