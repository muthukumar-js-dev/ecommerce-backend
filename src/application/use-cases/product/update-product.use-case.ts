// import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { UpdateProductRequestDTO } from '@application/dtos/product/product.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { Product } from '@domain/product/aggregates/product.aggregate';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';

/**
 * Use case for updating a product
 */
export class UpdateProductUseCase {
  constructor(private readonly productRepository: any) { }

  async execute(productId: ID, dto: UpdateProductRequestDTO): AsyncResult<void> {
    const product: Product | null = await this.productRepository.findById(productId);

    if (!product) {
      return failure(new NotFoundError('Product', productId));
    }

    // Update details
    if (dto.title || dto.description) {
      product.updateDetails(
        dto.title ?? product.title,
        dto.description ?? product.description
      );
    }

    // Update prices
    if (dto.actualPrice !== undefined || dto.sellingPrice !== undefined) {
      const newActual = dto.actualPrice !== undefined ? Money.create(dto.actualPrice) : product.actualPrice;
      const newSelling = dto.sellingPrice !== undefined ? Money.create(dto.sellingPrice) : product.sellingPrice;

      product.updatePrice(newSelling, newActual, product.sellerId);
    }

    // Update images
    if (dto.images) {
      (product as any).props.images = dto.images;
      (product as any).props.updatedAt = new Date();
    }

    // Update stock status
    if (dto.outOfStock !== undefined) {
      if (dto.outOfStock) {
        (product as any).props.inventory = Quantity.create(0);
      } else {
        if (product.inventory.isZero) {
          (product as any).props.inventory = Quantity.create(100);
        }
      }
      (product as any).props.updatedAt = new Date();
    }

    // Also handle subCategory if present
    if (dto.subCategory !== undefined) {
      (product as any).props.subCategory = dto.subCategory;
      (product as any).props.updatedAt = new Date();
    }

    const updateResult = await this.productRepository.update(product);
    if (!updateResult.success) {
      return failure(updateResult.error);
    }

    return success(undefined);
  }
}
