import { DomainEvent } from '../../../shared/domain/domain-event';
import { ID } from '../../../shared/types/common';

export class OrderConfirmed extends DomainEvent<any> {
    constructor(
        public readonly payload: {
            orderId: ID;
            orderNumber: string;
            userId: ID;
            confirmedAt: Date;
        }
    ) {
        super('OrderConfirmed', payload);
    }
}
