import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { Order } from '@domain/order/aggregates/order.aggregate';

/**
 * Create Order Step
 * Creates the order in the database
 */
export class CreateOrderStep implements SagaStep {
    name = 'CreateOrder';

    constructor(private orderRepository: IOrderRepository) { }

    async execute(context: SagaContext): Promise<void> {
        const { userId, items, shippingAddress } = context.data;
        const paymentId = context.stepData['paymentId'];

        console.log(`📦 Creating order for user ${userId}`);

        const order = Order.create(
            userId,
            items,
            shippingAddress,
            this.generateId()
        );

        // Store payment ID in order metadata
        if (paymentId) {
            order.setPaymentId(paymentId);
        }

        const result = await this.orderRepository.save(order);
        if (!result.success) {
            throw result.error;
        }

        // Store order ID
        context.stepData['orderId'] = order.id;

        console.log(`✅ Order created: ${order.id}`);
    }

    async compensate(context: SagaContext): Promise<void> {
        const orderId = context.stepData['orderId'];

        if (orderId) {
            console.log(`🔙 Cancelling order: ${orderId}`);

            const order = await this.orderRepository.findById(orderId);
            if (order) {
                order.cancel('Saga compensation');
                await this.orderRepository.update(order);

                console.log(`✅ Order cancelled: ${orderId}`);
            }
        } else {
            console.log('ℹ️ No order to cancel');
        }
    }

    private generateId(): string {
        return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
