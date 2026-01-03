import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import { UpdateCartItemRequestDTO } from '@application/dtos/cart/cart.dto';
import { AsyncResult, success, failure, Result } from '@shared/types/result';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { APP_CONSTANTS } from '@shared/constants';

/**
 * Use case for updating cart item quantity
 */
export class UpdateCartItemQuantityUseCase {
  constructor(private readonly cartRepository: ICartRepository) {}

  async execute(userId: ID, dto: UpdateCartItemRequestDTO): AsyncResult<void> {
    const validationResult = this.validate(dto);
    if (!validationResult.success) {
      return validationResult as any;
    }

    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      return failure(new NotFoundError('Cart', userId));
    }

    cart.updateQuantity(dto.productId, dto.quantity);

    const saveResult = await this.cartRepository.save(cart);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success(undefined);
  }

  private validate(dto: UpdateCartItemRequestDTO): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!dto.productId) {
      errors.push({ field: 'productId', message: 'Product ID is required' });
    }

    if (dto.quantity < APP_CONSTANTS.MIN_CART_ITEM_QUANTITY) {
      errors.push({
        field: 'quantity',
        message: `Quantity must be at least ${APP_CONSTANTS.MIN_CART_ITEM_QUANTITY}`,
      });
    }

    if (dto.quantity > APP_CONSTANTS.MAX_CART_ITEM_QUANTITY) {
      errors.push({
        field: 'quantity',
        message: `Quantity cannot exceed ${APP_CONSTANTS.MAX_CART_ITEM_QUANTITY}`,
      });
    }

    if (errors.length > 0) {
      return failure(new ValidationError('Validation failed', errors));
    }

    return success(undefined);
  }
}
