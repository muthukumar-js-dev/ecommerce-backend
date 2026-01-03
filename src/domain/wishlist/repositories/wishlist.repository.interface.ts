import { Wishlist } from '../entities/wishlist.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

export interface IWishlistRepository {
  findById(id: ID): Promise<Wishlist | null>;
  findByUserId(userId: ID): Promise<Wishlist[]>;
  save(wishlist: Wishlist): Promise<Result<Wishlist>>;
  update(wishlist: Wishlist): Promise<Result<Wishlist>>;
  delete(id: ID): Promise<Result<void>>;
}
