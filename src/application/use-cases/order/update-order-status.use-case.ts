// import { IOrderRepository } from '@domain/order/repositories/order.repository.interface'; // Removed unused import
import { UpdateOrderStatusRequestDTO } from '@application/dtos/order/order.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for updating order status
 */
export class UpdateOrderStatusUseCase {
  constructor(private readonly orderRepository: any) {}

  async execute(orderId: ID, dto: UpdateOrderStatusRequestDTO): AsyncResult<void> {
    if (!dto.productId || !dto.status) {
      return failure(
        new ValidationError('Product ID and status are required', [
          { field: 'productId', message: 'Product ID is required' },
          { field: 'status', message: 'Status is required' },
        ])
      );
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return failure(new NotFoundError('Order', orderId));
    }

    order.updateItemStatus(dto.productId, dto.status);

    const updateResult = await this.orderRepository.update(order);
    if (!updateResult.success) {
      return failure(updateResult.error);
    }

    return success(undefined);
  }
}
