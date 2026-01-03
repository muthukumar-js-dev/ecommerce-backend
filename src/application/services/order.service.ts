import { PlaceOrderUseCase } from '../use-cases/order/place-order.use-case';
import { GetOrderUseCase } from '../use-cases/order/get-order.use-case';
import { ListOrdersUseCase } from '../use-cases/order/list-orders.use-case';
import { CancelOrderItemUseCase } from '../use-cases/order/cancel-order-item.use-case';
import { UpdateOrderStatusUseCase } from '../use-cases/order/update-order-status.use-case';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import {
  PlaceOrderRequestDTO,
  OrderResponseDTO,
  ListOrdersResponseDTO,
  CancelOrderItemRequestDTO,
  UpdateOrderStatusRequestDTO,
} from '../dtos/order/order.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

/**
 * Application service for Order domain
 * Aggregates all order-related use cases
 */
export class OrderService {
  private placeOrderUseCase: PlaceOrderUseCase;
  private getOrderUseCase: GetOrderUseCase;
  private listOrdersUseCase: ListOrdersUseCase;
  private cancelOrderItemUseCase: CancelOrderItemUseCase;
  private updateOrderStatusUseCase: UpdateOrderStatusUseCase;

  constructor(orderRepository: IOrderRepository, cartRepository: ICartRepository) {
    this.placeOrderUseCase = new PlaceOrderUseCase(orderRepository, cartRepository);
    this.getOrderUseCase = new GetOrderUseCase(orderRepository);
    this.listOrdersUseCase = new ListOrdersUseCase(orderRepository);
    this.cancelOrderItemUseCase = new CancelOrderItemUseCase(orderRepository);
    this.updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepository);
  }

  /**
   * Place an order from cart
   */
  async placeOrder(userId: ID, dto: PlaceOrderRequestDTO): AsyncResult<OrderResponseDTO> {
    return this.placeOrderUseCase.execute(userId, dto);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: ID): AsyncResult<OrderResponseDTO> {
    return this.getOrderUseCase.execute(orderId);
  }

  /**
   * List user's orders
   */
  async listOrders(userId: ID, skip?: number, limit?: number): AsyncResult<ListOrdersResponseDTO> {
    return this.listOrdersUseCase.execute(userId, skip, limit);
  }

  /**
   * Cancel an order item
   */
  async cancelOrderItem(orderId: ID, dto: CancelOrderItemRequestDTO): AsyncResult<void> {
    return this.cancelOrderItemUseCase.execute(orderId, dto);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: ID, dto: UpdateOrderStatusRequestDTO): AsyncResult<void> {
    return this.updateOrderStatusUseCase.execute(orderId, dto);
  }
}
