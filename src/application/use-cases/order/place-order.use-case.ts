import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import { Order } from '@domain/order/entities/order.entity';
import { PlaceOrderRequestDTO, OrderResponseDTO } from '@application/dtos/order/order.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ID, OrderStatus } from '@shared/types/common';
import { randomUUID } from 'crypto';

/**
 * Use case for placing an order from cart
 */
export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly cartRepository: ICartRepository
  ) {}

  /**
   * Execute the place order use case
   */
  async execute(userId: ID, dto: PlaceOrderRequestDTO): AsyncResult<OrderResponseDTO> {
    // Validate payment method
    if (!dto.paymentMethod) {
      return failure(
        new ValidationError('Payment method is required', [
          { field: 'paymentMethod', message: 'Payment method is required' },
        ])
      );
    }
    
    // Validate shipping address
    if (!dto.shippingAddressId) {
      return failure(
        new ValidationError('Shipping Address is required', [
          { field: 'shippingAddressId', message: 'Shipping Address is required' },
        ])
      );
    }

    // Get user's cart
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      return failure(new NotFoundError('Cart', userId));
    }

    // Check if cart has items
    const cartProps = (cart as any).props;
    if (!cartProps.items || cartProps.items.length === 0) {
      return failure(
        new ValidationError('Cart is empty', [
          { field: 'cart', message: 'Cannot place order with empty cart' },
        ])
      );
    }

    // Create order from cart items
    const orderItems = cartProps.items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
      status: OrderStatus.ORDERED,
      orderedDate: new Date(),
      cancelOrder: false,
      returnProduct: false,
      shippingAddressId: dto.shippingAddressId,
    }));

    // Create order entity
    const order = Order.create(
      {
        userId,
        items: orderItems,
        paymentMethod: dto.paymentMethod,
      },
      randomUUID()
    );

    // Save order
    const saveResult = await this.orderRepository.save(order);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    // Clear cart after successful order
    cart.clear();
    await this.cartRepository.save(cart);

    // Return response
    return success(this.toDTO(saveResult.data));
  }

  /**
   * Map Order entity to DTO
   */
  private toDTO(order: Order): OrderResponseDTO {
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
  }
}
