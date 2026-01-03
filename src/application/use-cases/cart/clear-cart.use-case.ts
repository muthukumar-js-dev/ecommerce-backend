import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for clearing cart
 */
export class ClearCartUseCase {
  constructor(private readonly cartRepository: ICartRepository) {}

  async execute(userId: ID): AsyncResult<void> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      return failure(new NotFoundError('Cart', userId));
    }

    cart.clear();

    const saveResult = await this.cartRepository.save(cart);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success(undefined);
  }
}
