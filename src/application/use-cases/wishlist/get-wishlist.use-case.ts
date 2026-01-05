import { IWishlistRepository } from '@domain/wishlist/repositories/wishlist.repository.interface';
import { Wishlist } from '@domain/wishlist/entities/wishlist.entity';
import { ID } from '@shared/types/common';

/**
 * Get Wishlist Use Case
 * Retrieves user's wishlist
 */
export class GetWishlistUseCase {
  constructor(private readonly wishlistRepository: IWishlistRepository) {}

  async execute(userId: ID): Promise<Wishlist | null> {
    const wishlists = await this.wishlistRepository.findByUserId(userId);
    return wishlists && wishlists.length > 0 ? wishlists[0] ?? null : null;
  }
}
