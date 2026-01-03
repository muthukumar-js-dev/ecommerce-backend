import { Cart } from '../entities/cart.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

export interface ICartRepository {
  findById(id: ID): Promise<Cart | null>;
  findByUserId(userId: ID): Promise<Cart | null>;
  save(cart: Cart): Promise<Result<Cart>>;
  update(cart: Cart): Promise<Result<Cart>>;
  delete(id: ID): Promise<Result<void>>;
}
