import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface OrderPlacedPayload {
  orderId: ID;
  orderNumber: string;
  userId: ID;
  totalAmount: number;
  itemCount: number;
  status: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number }>;
  placedAt: Date;
}

export class OrderPlaced extends DomainEvent<OrderPlacedPayload> {
  constructor(payload: OrderPlacedPayload) {
    super('OrderPlaced', payload, 1);
  }
}
