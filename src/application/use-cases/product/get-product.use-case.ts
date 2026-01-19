// import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { ProductResponseDTO } from '@application/dtos/product/product.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { Product } from '@domain/product/aggregates/product.aggregate';

/**
 * Use case for getting a product by ID
 */
export class GetProductUseCase {
  constructor(private readonly productRepository: any) { }

  /**
   * Execute the get product use case
   */
  async execute(productId: ID): AsyncResult<ProductResponseDTO> {
    // Find product
    const product: Product | null = await this.productRepository.findById(productId);

    if (!product) {
      return failure(new NotFoundError('Product', productId));
    }

    // Map to DTO
    return success({
      id: product.id,
      pid: product.sku.value,
      title: product.title,
      category: product.category,
      actualPrice: product.actualPrice.amount,
      sellingPrice: product.sellingPrice.amount,
      discount: product.discountPercentage,
      brand: (product as any).props.brand,
      description: product.description,
      inventory: product.inventory.value,
      outOfStock: !product.isAvailable,
      images: product.images,
      productDetails: (product as any).props.productDetails,
      averageRating: product.averageRating,
      sellerId: product.sellerId,
      subCategory: (product as any).props.subCategory,
      stripeId: product.stripeId,
      url: product.url,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    });
  }
}
