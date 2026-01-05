import { BaseSaga } from '@infrastructure/saga/base-saga';
import { SagaRepository } from '@infrastructure/saga/saga.repository';
import { ValidateUserStep } from './steps/validate-user.step';
import { ReserveInventoryStep } from './steps/reserve-inventory.step';
import { ProcessPaymentStep } from './steps/process-payment.step';
import { CreateOrderStep } from './steps/create-order.step';
import { UpdateUserStatsStep } from './steps/update-user-stats.step';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { PaymentServiceClient } from '@infrastructure/clients/payment-service.client';

export interface OrderPlacementData {
    userId: string;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
    shippingAddress: any;
    paymentMethodId: string;
}

/**
 * Order Placement Saga
 * Coordinates distributed transaction for order placement
 */
export class OrderPlacementSaga extends BaseSaga {
    constructor(
        sagaRepository: SagaRepository,
        private userRepository: IUserRepository,
        private productRepository: IProductRepository,
        private orderRepository: IOrderRepository,
        private paymentClient: PaymentServiceClient
    ) {
        super(sagaRepository, 'ORDER_PLACEMENT');

        // Register steps in order of execution
        this.steps = [
            new ValidateUserStep(this.userRepository),
            new ReserveInventoryStep(this.productRepository),
            new ProcessPaymentStep(this.paymentClient),
            new CreateOrderStep(this.orderRepository),
            new UpdateUserStatsStep(this.userRepository),
        ];
    }
}
