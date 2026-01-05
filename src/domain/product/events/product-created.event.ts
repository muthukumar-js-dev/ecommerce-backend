import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface ProductCreatedPayload {
  productId: ID;
  sku: string;
  title: string;
  category: string;
  price: number;
  sellerId: ID;
  brand: string;
  description: string;
  images: string[];
  createdAt: Date;
}

export class ProductCreated extends DomainEvent<ProductCreatedPayload> {
  constructor(payload: ProductCreatedPayload) {
    super('ProductCreated', payload, 1);
  }
}
