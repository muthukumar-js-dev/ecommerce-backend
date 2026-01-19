// import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { Product } from '@domain/product/aggregates/product.aggregate';
import { SKU } from '@domain/product/value-objects/sku.vo';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
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
  constructor(private readonly productRepository: any) { }

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

    // Create product aggregate
    const initialInventory = dto.inventory !== undefined ? dto.inventory : 100;

    const product = Product.create(
      {
        sku: SKU.create(dto.pid),
        title: dto.title,
        category: dto.category,
        actualPrice: Money.create(dto.actualPrice),
        sellingPrice: Money.create(dto.sellingPrice),
        brand: dto.brand,
        description: dto.description,
        images: dto.images,
        productDetails: dto.productDetails.map(d => ({ key: d.key, value: d.value })),
        sellerId: dto.sellerId,
        subCategory: dto.subCategory,
        stripeId: dto.stripeId,
        url: dto.url,
        inventory: Quantity.create(initialInventory),
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
   * Map Product aggregate to DTO
   */
  private toDTO(product: Product): ProductResponseDTO {
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
  }
}
