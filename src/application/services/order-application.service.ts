import { BaseApplicationService } from './base-application.service';
import { PlaceOrderCommand } from '../commands/order/place-order.command';

import { PlaceOrderSaga } from '../sagas/place-order.saga';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { IAddressRepository } from '@domain/address/repositories/address.repository.interface';
import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import { LogExecution } from '../decorators/logging.decorator';
import { AsyncResult, success, failure } from '@shared/types/result'; // Import helpers
import { ID } from '@shared/types/common';
import { CommandBus } from '../commands/command-bus';
import { QueryBus } from '../queries/query-bus';
import { EventBus } from '@infrastructure/events/event-bus';

export class OrderApplicationService extends BaseApplicationService {
    constructor(
        commandBus: CommandBus,
        queryBus: QueryBus,
        eventBus: EventBus,
        private readonly userRepository: IUserRepository,
        private readonly productRepository: IProductRepository,
        private readonly orderRepository: IOrderRepository,
        private readonly addressRepository: IAddressRepository,
        private readonly cartRepository: ICartRepository
    ) {
        super(commandBus, queryBus, eventBus);
    }

    @LogExecution()
    async placeOrder(command: PlaceOrderCommand): Promise<AsyncResult<{ id: ID; orderNumber: string }>> {
        const saga = new PlaceOrderSaga(
            command.userId!,
            command,
            this.userRepository,
            this.productRepository,
            this.orderRepository,
            this.addressRepository,
            this.cartRepository,
            this.eventBus
        );

        try {
            await saga.execute();
            const order = saga.getOrder();
            if (!order) { throw new Error('Order not created by Saga'); }

            return success({ id: order.id, orderNumber: order.orderNumber.value });
        } catch (error) {
            console.error('Saga failed, compensating...', error);
            await saga.compensate();
            return failure(error as Error); // Use helper
        }
    }
}
