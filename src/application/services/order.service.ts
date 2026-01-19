import { BaseApplicationService } from './base-application.service';
import { CommandBus } from '../commands/command-bus';
import { QueryBus } from '../queries/query-bus';
import { EventBus } from '@infrastructure/events/event-bus';
import { PlaceOrderCommand } from '../commands/order/place-order.command';
import { GetOrderHistoryQuery } from '../queries/order/get-order-history.query';
import { GetOrderQuery } from '../queries/order/get-order.query';
import {
  PlaceOrderRequestDTO,
  OrderResponseDTO,
  ListOrdersResponseDTO,
  CancelOrderItemRequestDTO,
  UpdateOrderStatusRequestDTO,
} from '../dtos/order/order.dto';
import { AsyncResult, Result } from '@shared/types/result';
import { ID } from '@shared/types/common';
import { LogExecution } from '../decorators/logging.decorator';

export class OrderService extends BaseApplicationService {
  constructor(
    commandBus: CommandBus,
    queryBus: QueryBus,
    eventBus: EventBus
  ) {
    super(commandBus, queryBus, eventBus);
  }

  /**
   * Place an order from cart
   */
  @LogExecution()
  async placeOrder(userId: ID, dto: PlaceOrderRequestDTO): AsyncResult<OrderResponseDTO> {
    const command = new PlaceOrderCommand(userId, dto.items, dto.shippingAddressId, dto.paymentMethod);
    return this.executeCommand<AsyncResult<OrderResponseDTO>>(command);
  }

  /**
   * Get order by ID
   */
  @LogExecution()
  getOrder(orderId: ID): AsyncResult<OrderResponseDTO> {
    return this.executeQuery<Result<OrderResponseDTO>>(new GetOrderQuery(orderId));
  }

  /**
   * List user's orders
   */
  @LogExecution()
  async listOrders(userId: ID, _skip?: number, _limit?: number): AsyncResult<ListOrdersResponseDTO> {
    const query = new GetOrderHistoryQuery(userId);
    return this.executeQuery<AsyncResult<ListOrdersResponseDTO>>(query);
  }

  /**
   * Cancel an order item
   */
  @LogExecution()
  cancelOrderItem(_orderId: ID, _dto: CancelOrderItemRequestDTO): AsyncResult<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Update order status
   */
  @LogExecution()
  updateOrderStatus(_orderId: ID, _dto: UpdateOrderStatusRequestDTO): AsyncResult<void> {
    throw new Error("Method not implemented.");
  }
}
