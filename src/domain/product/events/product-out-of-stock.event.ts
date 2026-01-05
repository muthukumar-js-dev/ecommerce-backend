import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface ProductOutOfStockPayload {
  productId: ID;
  sku: string;
  title: string;
  occurredAt: Date;
}

export class ProductOutOfStock extends DomainEvent<ProductOutOfStockPayload> {
  constructor(payload: ProductOutOfStockPayload) {
    super('ProductOutOfStock', payload, 1);
  }
}
