import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { CancelOrderItemRequestDTO } from '@application/dtos/order/order.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for canceling an order item
 */
export class CancelOrderItemUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * Execute the cancel order item use case
   */
  async execute(orderId: ID, dto: CancelOrderItemRequestDTO): AsyncResult<void> {
    // Validate input
    if (!dto.productId) {
      return failure(
        new ValidationError('Product ID is required', [
          { field: 'productId', message: 'Product ID is required' },
        ])
      );
    }

    // Find order
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return failure(new NotFoundError('Order', orderId));
    }

    // Cancel the item
    order.cancelItem(dto.productId);

    // Save order
    const saveResult = await this.orderRepository.update(order);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success(undefined);
  }
}
