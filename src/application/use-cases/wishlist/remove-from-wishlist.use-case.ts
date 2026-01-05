import { IWishlistRepository } from '@domain/wishlist/repositories/wishlist.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

export class RemoveFromWishlistUseCase {
  constructor(private readonly wishlistRepository: IWishlistRepository) {}

  async execute(userId: ID, productId: ID): AsyncResult<void> {
    const wishlists = await this.wishlistRepository.findByUserId(userId);
    if (!wishlists || wishlists.length === 0) {
      return failure(new NotFoundError('Wishlist', userId));
    }

    const wishlist = wishlists[0]!; // Non-null assertion after length check
    const wishlistProps = (wishlist as any).props;

    // Remove product from items
    wishlistProps.items = wishlistProps.items.filter((item: any) => item.productId !== productId);

    const updateResult = await this.wishlistRepository.update(wishlist);
    if (!updateResult.success) {
      return failure(updateResult.error);
    }

    return success(undefined);
  }
}
