import { AddToWishlistUseCase } from '../use-cases/wishlist/add-to-wishlist.use-case';
import { IWishlistRepository } from '@domain/wishlist/repositories/wishlist.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { AddToWishlistRequestDTO, WishlistResponseDTO } from '../dtos/wishlist/wishlist.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

export class WishlistService {
  private addToWishlistUseCase: AddToWishlistUseCase;

  constructor(wishlistRepository: IWishlistRepository, productRepository: IProductRepository) {
    this.addToWishlistUseCase = new AddToWishlistUseCase(wishlistRepository, productRepository);
  }

  async addToWishlist(userId: ID, dto: AddToWishlistRequestDTO): AsyncResult<WishlistResponseDTO> {
    return this.addToWishlistUseCase.execute(userId, dto);
  }
}
