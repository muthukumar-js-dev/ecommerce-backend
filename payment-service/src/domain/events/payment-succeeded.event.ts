import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface PaymentSucceededProps {
    paymentId: ID;
    orderId: ID;
    userId: ID;
    amount: number;
    stripePaymentIntentId: string;
    capturedAt: Date;
}

export class PaymentSucceeded extends DomainEvent<PaymentSucceededProps> {
    constructor(props: PaymentSucceededProps) {
        super('PaymentSucceeded', props);
    }

    get aggregateId(): ID {
        return this.payload.paymentId;
    }
}
