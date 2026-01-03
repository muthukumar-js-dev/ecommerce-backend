import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for removing item from cart
 */
export class RemoveFromCartUseCase {
  constructor(private readonly cartRepository: ICartRepository) {}

  /**
   * Execute the remove from cart use case
   */
  async execute(userId: ID, productId: string): AsyncResult<void> {
    // Find cart
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      return failure(new NotFoundError('Cart', userId));
    }

    // Remove item
    cart.removeItem(productId);

    // Save cart
    const saveResult = await this.cartRepository.save(cart);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success(undefined);
  }
}
