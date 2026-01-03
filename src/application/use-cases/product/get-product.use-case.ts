import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { ProductResponseDTO } from '@application/dtos/product/product.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for getting a product by ID
 */
export class GetProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  /**
   * Execute the get product use case
   */
  async execute(productId: ID): AsyncResult<ProductResponseDTO> {
    // Find product
    const product = await this.productRepository.findById(productId);
    if (!product) {
      return failure(new NotFoundError('Product', productId));
    }

    // Map to DTO
    const props = (product as any).props;
    return success({
      id: product.id,
      pid: props.pid,
      title: props.title,
      category: props.category,
      actualPrice: props.actualPrice,
      sellingPrice: props.sellingPrice,
      discount: props.discount,
      brand: props.brand,
      description: props.description,
      outOfStock: props.outOfStock,
      images: props.images,
      productDetails: props.productDetails,
      averageRating: props.averageRating,
      sellerId: props.sellerId,
      subCategory: props.subCategory,
      stripeId: props.stripeId,
      url: props.url,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    });
  }
}
