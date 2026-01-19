// import { IOrderRepository } from '@domain/order/repositories/order.repository.interface'; // Removed unused import
import { OrderResponseDTO } from '@application/dtos/order/order.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for getting an order by ID
 */
export class GetOrderUseCase {
  constructor(private readonly orderRepository: any) {}

  /**
   * Execute the get order use case
   */
  async execute(orderId: ID): AsyncResult<OrderResponseDTO> {
    // Find order
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return failure(new NotFoundError('Order', orderId));
    }

    // Map to DTO
    const props = (order).props;
    return success({
      id: order.id,
      userId: props.userId,
      items: props.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        status: item.status,
        orderedDate: item.orderedDate?.toISOString(),
        deliveredDate: item.deliveredDate?.toISOString(),
        deliveryDate: item.deliveryDate?.toISOString(),
        cancelOrder: item.cancelOrder,
        cancelStatus: item.cancelStatus,
        returnProduct: item.returnProduct,
        returnOption: item.returnOption,
        returnStatus: item.returnStatus,
      })),
      paymentMethod: props.paymentMethod,
      itemCount: order.itemCount,
      totalQuantity: order.totalQuantity,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    });
  }
}
