import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface PriceChangedPayload {
  productId: ID;
  sku: string;
  previousPrice: number;
  newPrice: number;
  changedAt: Date;
  changedBy: ID;
}

export class PriceChanged extends DomainEvent<PriceChangedPayload> {
  constructor(payload: PriceChangedPayload) {
    super('PriceChanged', payload, 1);
  }
}
