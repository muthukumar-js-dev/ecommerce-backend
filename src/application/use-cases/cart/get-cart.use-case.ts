import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import { CartResponseDTO } from '@application/dtos/cart/cart.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for getting user's cart
 */
export class GetCartUseCase {
  constructor(private readonly cartRepository: ICartRepository) {}

  /**
   * Execute the get cart use case
   */
  async execute(userId: ID): AsyncResult<CartResponseDTO> {
    // Find cart
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      return failure(new NotFoundError('Cart', userId));
    }

    // Map to DTO
    const props = (cart as any).props;
    return success({
      id: cart.id,
      userId: props.userId,
      items: props.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        later: item.later,
      })),
      totalAmount: props.totalAmount,
      totalActualAmount: props.totalActualAmount,
      totalDiscount: props.totalDiscount,
      currency: props.currency,
      itemCount: cart.itemCount,
    });
  }
}
