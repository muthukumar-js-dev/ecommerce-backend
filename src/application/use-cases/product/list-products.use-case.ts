// import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Removed unused import
import { ListProductsResponseDTO, ProductResponseDTO } from '@application/dtos/product/product.dto';
import { AsyncResult, success } from '@shared/types/result';
import { APP_CONSTANTS } from '@shared/constants';

/**
 * Use case for listing products with pagination
 */
export class ListProductsUseCase {
  // import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
  constructor(private readonly productRepository: any) {}

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
    const products = await this.productRepository.findAll(normalizedSkip, normalizedLimit);
    
    // Get total count
    const total = await this.productRepository.count();

    // Calculate pagination metadata
    const page = Math.floor(normalizedSkip / normalizedLimit) + 1;
    const hasMore = normalizedSkip + products.length < total;

    // Map to DTOs
    const productDTOs: ProductResponseDTO[] = products.map((product: any) => {
      const props = (product as any).props;
      return {
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
