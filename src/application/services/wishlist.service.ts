import { AddToWishlistUseCase } from '../use-cases/wishlist/add-to-wishlist.use-case';
import { RemoveFromWishlistUseCase } from '../use-cases/wishlist/remove-from-wishlist.use-case';
import { IWishlistRepository } from '@domain/wishlist/repositories/wishlist.repository.interface';
// import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Removed unused import
import { AddToWishlistRequestDTO, WishlistResponseDTO } from '../dtos/wishlist/wishlist.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

export class WishlistService {
  private addToWishlistUseCase: AddToWishlistUseCase;
  private removeFromWishlistUseCase: RemoveFromWishlistUseCase;

  constructor(wishlistRepository: IWishlistRepository, productRepository: any) {
    this.addToWishlistUseCase = new AddToWishlistUseCase(wishlistRepository, productRepository);
    this.removeFromWishlistUseCase = new RemoveFromWishlistUseCase(wishlistRepository);
  }

  async addToWishlist(userId: ID, dto: AddToWishlistRequestDTO): AsyncResult<WishlistResponseDTO> {
    return this.addToWishlistUseCase.execute(userId, dto);
  }

  async removeFromWishlist(userId: ID, productId: ID): AsyncResult<void> {
    return this.removeFromWishlistUseCase.execute(userId, productId);
  }
}
