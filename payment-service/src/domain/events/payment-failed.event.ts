import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface PaymentFailedProps {
    paymentId: ID;
    orderId: ID;
    userId: ID;
    reason: string;
    failedAt: Date;
}

export class PaymentFailed extends DomainEvent<PaymentFailedProps> {
    constructor(props: PaymentFailedProps) {
        super('PaymentFailed', props);
    }

    get aggregateId(): ID {
        return this.payload.paymentId;
    }
}
