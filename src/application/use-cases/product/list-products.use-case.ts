// import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { ListProductsResponseDTO, ProductResponseDTO } from '@application/dtos/product/product.dto';
import { AsyncResult, success } from '@shared/types/result';
import { APP_CONSTANTS } from '@shared/constants';
import { Product } from '@domain/product/aggregates/product.aggregate';

/**
 * Use case for listing products with pagination
 */
export class ListProductsUseCase {
  constructor(private readonly productRepository: any) { }

  /**
   * Execute the list products use case
   */
  async execute(
    skip: number = 0,
    limit: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE
  ): AsyncResult<ListProductsResponseDTO> {
    // Validate and normalize pagination params
    const normalizedSkip = Math.max(0, skip);
    const normalizedLimit = Math.min(Math.max(1, limit), APP_CONSTANTS.MAX_PAGE_SIZE);

    // Get products
    // Assuming repository returns Product[] (Aggregates)
    const products: Product[] = await this.productRepository.findAll(normalizedSkip, normalizedLimit);

    // Get total count
    const total = await this.productRepository.count();

    // Calculate pagination metadata
    const page = Math.floor(normalizedSkip / normalizedLimit) + 1;
    const hasMore = normalizedSkip + products.length < total;

    // Map to DTOs
    const productDTOs: ProductResponseDTO[] = products.map((product) => {
      return {
        id: product.id,
        pid: product.sku.value,
        title: product.title,
        category: product.category,
        actualPrice: product.actualPrice.amount,
        sellingPrice: product.sellingPrice.amount,
        discount: product.discountPercentage,
        brand: (product as any).props.brand,
        description: product.description,
        outOfStock: !product.isAvailable,
        inventory: product.inventory.value,
        images: product.images,
        productDetails: (product as any).props.productDetails,
        averageRating: product.averageRating,
        sellerId: product.sellerId,
        subCategory: (product as any).props.subCategory,
        stripeId: product.stripeId,
        url: product.url,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    });

    return success({
      products: productDTOs,
      total,
      page,
      pageSize: normalizedLimit,
      hasMore,
    });
  }
}
