import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface PaymentInitiatedProps {
    paymentId: ID;
    orderId: ID;
    userId: ID;
    amount: number;
    currency: string;
    initiatedAt: Date;
}

export class PaymentInitiated extends DomainEvent<PaymentInitiatedProps> {
    constructor(props: PaymentInitiatedProps) {
        super('PaymentInitiated', props);
    }

    get aggregateId(): ID {
        return this.payload.paymentId;
    }
}
