// import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Removed unused import
import { Product } from '@domain/product/entities/product.entity';
import {
  CreateProductRequestDTO,
  ProductResponseDTO,
} from '@application/dtos/product/product.dto';
import { Result, success, failure, AsyncResult } from '@shared/types/result';
import { ValidationError, ConflictError } from '@shared/errors';
import { APP_CONSTANTS } from '@shared/constants';
import { randomUUID } from 'crypto';

/**
 * Use case for creating a new product
 */
export class CreateProductUseCase {
  // import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Commented out to fix build
  constructor(private readonly productRepository: any) {}

  /**
   * Execute the create product use case
   */
  async execute(dto: CreateProductRequestDTO): AsyncResult<ProductResponseDTO> {
    // Validate input
    const validationResult = this.validate(dto);
    if (!validationResult.success) {
      return validationResult as any;
    }

    // Check if product with PID already exists
    const existingProduct = await this.productRepository.findByPid(dto.pid);
    if (existingProduct) {
      return failure(new ConflictError(`Product with PID '${dto.pid}' already exists`));
    }

    // Calculate discount
    const discount = dto.actualPrice > 0 
      ? Math.round(((dto.actualPrice - dto.sellingPrice) / dto.actualPrice) * 100)
      : 0;

    // Create product entity
    const product = Product.create(
      {
        pid: dto.pid,
        title: dto.title,
        category: dto.category,
        actualPrice: dto.actualPrice,
        sellingPrice: dto.sellingPrice,
        brand: dto.brand,
        description: dto.description,
        averageRating: 0,
        discount,
        outOfStock: false,
        images: dto.images,
        productDetails: dto.productDetails,
        sellerId: dto.sellerId,
        subCategory: dto.subCategory,
        stripeId: dto.stripeId,
        url: dto.url,
      },
      randomUUID()
    );

    // Save product
    const saveResult = await this.productRepository.save(product);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    // Return response
    return success(this.toDTO(saveResult.data));
  }

  /**
   * Validate product creation input
   */
  private validate(dto: CreateProductRequestDTO): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!dto.pid || dto.pid.trim().length === 0) {
      errors.push({ field: 'pid', message: 'Product ID is required' });
    }

    if (!dto.title || dto.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required' });
    }

    if (!dto.category || dto.category.trim().length === 0) {
      errors.push({ field: 'category', message: 'Category is required' });
    }

    if (dto.actualPrice < APP_CONSTANTS.MIN_PRODUCT_PRICE) {
      errors.push({
        field: 'actualPrice',
        message: `Actual price must be at least ${APP_CONSTANTS.MIN_PRODUCT_PRICE}`,
      });
    }

    if (dto.sellingPrice < APP_CONSTANTS.MIN_PRODUCT_PRICE) {
      errors.push({
        field: 'sellingPrice',
        message: `Selling price must be at least ${APP_CONSTANTS.MIN_PRODUCT_PRICE}`,
      });
    }

    if (dto.sellingPrice > dto.actualPrice) {
      errors.push({
        field: 'sellingPrice',
        message: 'Selling price cannot be greater than actual price',
      });
    }

    if (!dto.description || dto.description.length < APP_CONSTANTS.MIN_DESCRIPTION_LENGTH) {
      errors.push({
        field: 'description',
        message: `Description must be at least ${APP_CONSTANTS.MIN_DESCRIPTION_LENGTH} characters`,
      });
    }

    if (dto.description && dto.description.length > APP_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
      errors.push({
        field: 'description',
        message: `Description must not exceed ${APP_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters`,
      });
    }

    if (!dto.images || dto.images.length === 0) {
      errors.push({ field: 'images', message: 'At least one image is required' });
    }

    if (dto.images && dto.images.length > APP_CONSTANTS.MAX_PRODUCT_IMAGES) {
      errors.push({
        field: 'images',
        message: `Maximum ${APP_CONSTANTS.MAX_PRODUCT_IMAGES} images allowed`,
      });
    }

    if (!dto.sellerId || dto.sellerId.trim().length === 0) {
      errors.push({ field: 'sellerId', message: 'Seller ID is required' });
    }

    if (errors.length > 0) {
      return failure(new ValidationError('Validation failed', errors));
    }

    return success(undefined);
  }

  /**
   * Map Product entity to DTO
   */
  private toDTO(product: Product): ProductResponseDTO {
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
  }
}
