// import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Removed unused import
import { UpdateProductRequestDTO } from '@application/dtos/product/product.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for updating a product
 */
export class UpdateProductUseCase {
  // import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
  constructor(private readonly productRepository: any) {}

  async execute(productId: ID, dto: UpdateProductRequestDTO): AsyncResult<void> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      return failure(new NotFoundError('Product', productId));
    }

    // Update product properties directly (entity doesn't have update methods)
    const props = (product as any).props;
    if (dto.title) props.title = dto.title;
    if (dto.description) props.description = dto.description;
    if (dto.actualPrice !== undefined) props.actualPrice = dto.actualPrice;
    if (dto.sellingPrice !== undefined) {
      props.sellingPrice = dto.sellingPrice;
      // Recalculate discount
      if (props.actualPrice > 0) {
        props.discount = Math.round(((props.actualPrice - props.sellingPrice) / props.actualPrice) * 100);
      }
    }
    if (dto.images) props.images = dto.images;
    if (dto.outOfStock !== undefined) props.outOfStock = dto.outOfStock;
    props.updatedAt = new Date();

    const updateResult = await this.productRepository.update(product);
    if (!updateResult.success) {
      return failure(updateResult.error);
    }

    return success(undefined);
  }
}
