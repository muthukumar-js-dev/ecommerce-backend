import { AggregateRoot } from '@shared/domain/aggregate-root';
import { ID } from '@shared/types/common';
import { Money } from '../../../src/domain/product/value-objects/money.vo';
import { PaymentInitiated } from './events/payment-initiated.event';
import { PaymentSucceeded } from './events/payment-succeeded.event';
import { PaymentFailed } from './events/payment-failed.event';
import { BusinessRuleError } from '@shared/errors';

export enum PaymentStatus {
    PENDING = 'PENDING',
    AUTHORIZED = 'AUTHORIZED',
    CAPTURED = 'CAPTURED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
}

export interface PaymentProps {
    orderId: ID;
    userId: ID;
    amount: Money;
    status: PaymentStatus;
    stripePaymentIntentId?: string;
    stripeCustomerId: string;
    failureReason?: string;
    refundId?: string;
    metadata: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Payment Aggregate
 * Manages payment lifecycle with state machine
 */
export class Payment extends AggregateRoot<PaymentProps> {
    private constructor(props: PaymentProps, id: ID) {
        super(props, id);
    }

    /**
     * Initiate a new payment
     */
    static initiate(
        orderId: ID,
        userId: ID,
        amount: Money,
        stripeCustomerId: string,
        id: ID
    ): Payment {
        const now = new Date();
        const payment = new Payment(
            {
                orderId,
                userId,
                amount,
                status: PaymentStatus.PENDING,
                stripeCustomerId,
                metadata: {},
                createdAt: now,
                updatedAt: now,
            },
            id
        );

        payment.addDomainEvent(
            new PaymentInitiated({
                paymentId: id,
                orderId,
                userId,
                amount: amount.amount,
                currency: amount.currency,
                initiatedAt: now,
            })
        );

        return payment;
    }

    /**
     * Reconstitute payment from persistence
     * Used by repository to hydrate aggregate
     */
    static reconstitute(props: PaymentProps, id: ID): Payment {
        return new Payment(props, id);
    }

    /**
     * Authorize payment (Stripe payment intent created)
     */
    authorize(stripePaymentIntentId: string): void {
        if (this.props.status !== PaymentStatus.PENDING) {
            throw new BusinessRuleError(
                'Can only authorize pending payments',
                'INVALID_PAYMENT_STATE'
            );
        }

        this.props.status = PaymentStatus.AUTHORIZED;
        this.props.stripePaymentIntentId = stripePaymentIntentId;
        this.props.updatedAt = new Date();
    }

    /**
     * Capture authorized payment
     */
    capture(): void {
        if (this.props.status !== PaymentStatus.AUTHORIZED) {
            throw new BusinessRuleError(
                'Can only capture authorized payments',
                'INVALID_PAYMENT_STATE'
            );
        }

        this.props.status = PaymentStatus.CAPTURED;
        this.props.updatedAt = new Date();

        this.addDomainEvent(
            new PaymentSucceeded({
                paymentId: this.id,
                orderId: this.props.orderId,
                userId: this.props.userId,
                amount: this.props.amount.amount,
                stripePaymentIntentId: this.props.stripePaymentIntentId!,
                capturedAt: new Date(),
            })
        );
    }

    /**
     * Mark payment as failed
     */
    fail(reason: string): void {
        this.props.status = PaymentStatus.FAILED;
        this.props.failureReason = reason;
        this.props.updatedAt = new Date();

        this.addDomainEvent(
            new PaymentFailed({
                paymentId: this.id,
                orderId: this.props.orderId,
                userId: this.props.userId,
                reason,
                failedAt: new Date(),
            })
        );
    }

    /**
     * Refund captured payment
     */
    refund(refundId: string): void {
        if (this.props.status !== PaymentStatus.CAPTURED) {
            throw new BusinessRuleError(
                'Can only refund captured payments',
                'INVALID_PAYMENT_STATE'
            );
        }

        this.props.status = PaymentStatus.REFUNDED;
        this.props.refundId = refundId;
        this.props.updatedAt = new Date();
    }

    // Getters
    get orderId(): ID {
        return this.props.orderId;
    }

    get userId(): ID {
        return this.props.userId;
    }

    get amount(): Money {
        return this.props.amount;
    }

    get status(): PaymentStatus {
        return this.props.status;
    }

    get stripePaymentIntentId(): string | undefined {
        return this.props.stripePaymentIntentId;
    }

    get failureReason(): string | undefined {
        return this.props.failureReason;
    }
}
