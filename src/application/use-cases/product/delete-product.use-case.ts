// import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { AsyncResult, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { Product } from '@domain/product/aggregates/product.aggregate';

/**
 * Delete Product Use Case
 * Handles product deletion with authorization check
 */
export class DeleteProductUseCase {
  constructor(private readonly productRepository: any) { }

  async execute(productId: ID, sellerId: ID): AsyncResult<void> {
    // Find product
    const product: Product | null = await this.productRepository.findById(productId);

    if (!product) {
      return failure(new NotFoundError('Product', productId));
    }

    // Verify seller owns the product
    if (product.sellerId !== sellerId) {
      return failure(new Error('You can only delete your own products'));
    }

    // Delete product
    return this.productRepository.delete(productId);
  }
}
