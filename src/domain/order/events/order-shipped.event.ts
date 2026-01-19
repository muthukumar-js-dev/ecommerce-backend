import { DomainEvent } from '../../../shared/domain/domain-event';
import { ID } from '../../../shared/types/common';

export class OrderShipped extends DomainEvent<any> {
    constructor(
        public readonly payload: {
            orderId: ID;
            trackingNumber: string;
            shippedAt: Date;
        }
    ) {
        super('OrderShipped', payload);
    }
}
