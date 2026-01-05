import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface OrderCancelledPayload {
  orderId: ID;
  orderNumber: string;
  userId: ID;
  reason?: string;
  cancelledAt: Date;
}

export class OrderCancelled extends DomainEvent<OrderCancelledPayload> {
  constructor(payload: OrderCancelledPayload) {
    super('OrderCancelled', payload, 1);
  }
}
