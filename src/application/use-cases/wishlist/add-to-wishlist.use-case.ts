import { IWishlistRepository } from '@domain/wishlist/repositories/wishlist.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { Wishlist } from '@domain/wishlist/entities/wishlist.entity';
import { AddToWishlistRequestDTO, WishlistResponseDTO } from '@application/dtos/wishlist/wishlist.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { randomUUID } from 'crypto';

export class AddToWishlistUseCase {
  constructor(
    private readonly wishlistRepository: IWishlistRepository,
    private readonly productRepository: IProductRepository
  ) {}

  async execute(userId: ID, dto: AddToWishlistRequestDTO): AsyncResult<WishlistResponseDTO> {
    if (!dto.productId) {
      return failure(
        new ValidationError('Product ID is required', [
          { field: 'productId', message: 'Product ID is required' },
        ])
      );
    }

    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      return failure(new NotFoundError('Product', dto.productId));
    }

    let wishlist = (await this.wishlistRepository.findByUserId(userId))[0];
    if (!wishlist) {
      wishlist = Wishlist.create({ userId, productIds: [], name: '', status: 1 }, randomUUID());
    }

    wishlist.addProduct(dto.productId);

    const saveResult = await this.wishlistRepository.save(wishlist);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success(this.toDTO(saveResult.data));
  }

  private toDTO(wishlist: Wishlist): WishlistResponseDTO {
    const props = (wishlist as any).props;
    return {
      id: wishlist.id,
      userId: props.userId,
      products: props.products.map((p: any) => ({
        productId: p.productId,
        addedAt: p.addedAt?.toISOString(),
      })),
      itemCount: wishlist.itemCount,
    };
  }
}
