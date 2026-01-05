import { Payment } from '../payment.aggregate';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

/**
 * Repository interface for Payment aggregate
 */
export interface IPaymentRepository {
    /**
     * Find payment by ID
     */
    findById(id: ID): Promise<Payment | null>;

    /**
     * Find all payments for a specific order
     */
    findByOrderId(orderId: ID): Promise<Payment[]>;

    /**
     * Find all payments for a specific user
     */
    findByUserId(userId: ID): Promise<Payment[]>;

    /**
     * Find payment by Stripe payment intent ID
     */
    findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<Payment | null>;

    /**
     * Save new payment
     */
    save(payment: Payment): Promise<Result<Payment>>;

    /**
     * Update existing payment
     */
    update(payment: Payment): Promise<Result<Payment>>;
}
