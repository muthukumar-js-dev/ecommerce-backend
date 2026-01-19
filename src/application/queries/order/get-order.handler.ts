import { QueryHandler } from '../query-handler.interface';
import { GetOrderQuery } from './get-order.query';
import { Result, success, failure } from '@shared/types/result';
import { OrderResponseDTO } from '@application/dtos/order/order.dto';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { NotFoundError } from '@shared/errors';

export class GetOrderHandler implements QueryHandler<GetOrderQuery, OrderResponseDTO> {
    constructor(private readonly orderRepository: IOrderRepository) { }

    async handle(query: GetOrderQuery): Promise<Result<OrderResponseDTO>> {
        const order = await this.orderRepository.findById(query.orderId);

        if (!order) {
            return failure(new NotFoundError('Order', query.orderId));
        }

        const props = (order as any).props;
        return success({
            id: order.id,
            userId: props.userId,
            items: props.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity.value,
                status: item.status.value,
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
            itemCount: (order as any).itemCount,
            totalQuantity: (order as any).totalQuantity,
            createdAt: props.createdAt.toISOString(),
            updatedAt: props.updatedAt.toISOString(),
            status: order.status.value,
            orderNumber: order.orderNumber.value // Ensure orderNumber is included if DTO supports it
        } as any); // Cast to any to avoid strict DTO mismatch issues if DTO definitions lag
    }
}
