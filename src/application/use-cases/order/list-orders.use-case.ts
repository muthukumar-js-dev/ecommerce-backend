// import { IOrderRepository } from '@domain/order/repositories/order.repository.interface'; // Removed unused import
import { ListOrdersResponseDTO, OrderResponseDTO } from '@application/dtos/order/order.dto';
import { AsyncResult, success } from '@shared/types/result';
import { ID } from '@shared/types/common';
import { APP_CONSTANTS } from '@shared/constants';

/**
 * Use case for listing user's orders with pagination
 */
export class ListOrdersUseCase {
  constructor(private readonly orderRepository: any) {}

  /**
   * Execute the list orders use case
   */
  async execute(
    userId: ID,
    skip: number = 0,
    limit: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE
  ): AsyncResult<ListOrdersResponseDTO> {
    // Validate and normalize pagination params
    const normalizedSkip = Math.max(0, skip);
    const normalizedLimit = Math.min(Math.max(1, limit), APP_CONSTANTS.MAX_PAGE_SIZE);

    // Get orders with pagination
    const orders = await this.orderRepository.findByUserId(userId, normalizedSkip, normalizedLimit);

    // Get all orders to calculate total (not ideal but works with current interface)
    const allOrders = await this.orderRepository.findByUserId(userId);
    const total = allOrders.length;

    // Calculate pagination metadata
    const page = Math.floor(normalizedSkip / normalizedLimit) + 1;
    const hasMore = normalizedSkip + orders.length < total;

    // Map to DTOs
    const orderDTOs: OrderResponseDTO[] = orders.map((order: any) => {
      const props = (order as any).props;
      return {
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
      };
    });

    return success({
      orders: orderDTOs,
      total,
      page,
      pageSize: normalizedLimit,
      hasMore,
    });
  }
}
