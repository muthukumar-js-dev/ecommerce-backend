import { CommandHandler } from '../../command-handler.interface';
import { PlaceOrderCommand } from './place-order.command';
import { AsyncResult } from '@shared/types/result';
import { EventBus } from '@infrastructure/events/event-bus';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { OrderApplicationService } from '@application/services/order-application.service';
import { CommandBus } from '../command-bus';
import { QueryBus } from '../../queries/query-bus';
import { ID } from '@shared/types/common';
import { AddressRepository } from '@infrastructure/database/mongodb/repositories/address.repository';

// Result interface
export interface PlaceOrderResult {
  orderId: ID;
}

export class PlaceOrderHandler implements CommandHandler<PlaceOrderCommand, PlaceOrderResult> {
  private orderService: OrderApplicationService;

  constructor(
    orderRepository: IOrderRepository,
    productRepository: IProductRepository,
    eventBus: EventBus,
    userRepository: IUserRepository
  ) {
    // Instantiate Dependencies
    const addressRepository = new AddressRepository();

    this.orderService = new OrderApplicationService(
      new CommandBus(),
      new QueryBus(),
      eventBus,
      userRepository,
      productRepository,
      orderRepository,
      addressRepository
    );
  }

  async handle(command: PlaceOrderCommand): AsyncResult<PlaceOrderResult> {
    // Delegate to Application Service
    // Map result to ensure strictly PlaceOrderResult type compatibility
    const result = await this.orderService.placeOrder(command);

    // Return directly as it matches locally.
    // If mismatched, mapping needed. 
    // OrderApplicationService returns AsyncResult<{ orderId: ID }>
    // PlaceOrderResult is { orderId: ID }
    // Compatible.
    return result as AsyncResult<PlaceOrderResult>;
  }
}
