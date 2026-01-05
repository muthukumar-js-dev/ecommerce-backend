// import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Removed unused import
import { AsyncResult, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Delete Product Use Case
 * Handles product deletion with authorization check
 */
export class DeleteProductUseCase {
  // import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
  constructor(private readonly productRepository: any) {}

  async execute(productId: ID, sellerId: ID): AsyncResult<void> {
    // Find product
    const product = await this.productRepository.findById(productId);
    
    if (!product) {
      return failure(new NotFoundError('Product', productId));
    }

    // Verify seller owns the product
    const productProps = (product as any).props;
    if (productProps.sellerId !== sellerId) {
      return failure(new Error('You can only delete your own products'));
    }

    // Delete product
    return this.productRepository.delete(productId);
  }
}
