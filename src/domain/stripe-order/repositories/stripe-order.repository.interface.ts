import { StripeOrder } from '../entities/stripe-order.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

export interface IStripeOrderRepository {
  findById(id: ID): Promise<StripeOrder | null>;
  findByUserId(userId: ID): Promise<StripeOrder[]>;
  findByPaymentIntentId(intentId: string): Promise<StripeOrder | null>;
  save(order: StripeOrder): Promise<Result<StripeOrder>>;
  update(order: StripeOrder): Promise<Result<StripeOrder>>;
  delete(id: ID): Promise<Result<void>>;
}
