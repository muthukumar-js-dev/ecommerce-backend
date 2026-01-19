import { Entity } from '../../../shared/domain/entity';
import { ID, Timestamp } from '../../../shared/types/common';
import { Money } from '../../product/value-objects/money.vo';
import { Quantity } from '../../product/value-objects/quantity.vo';
import { OrderStatus, OrderStatusEnum } from '../value-objects/order-status.vo';

export interface OrderItemProps {
  productId: ID;
  productName: string;
  quantity: Quantity;
  unitPrice: Money;
  totalPrice: Money;
  status: OrderStatus;
  orderedDate: Timestamp;
  shippedDate?: Timestamp;
  deliveredDate?: Timestamp;
  canReturn: boolean;
  canCancel: boolean;
}

export class OrderItem extends Entity<OrderItemProps> {
  private constructor(props: OrderItemProps, id: ID) {
    super(props, id);
  }

  static create(
    productId: ID,
    productName: string,
    quantity: Quantity,
    unitPrice: Money,
    id: ID
  ): OrderItem {
    const totalPrice = unitPrice.multiply(quantity.value);

    return new OrderItem(
      {
        productId,
        productName,
        quantity,
        unitPrice,
        totalPrice,
        status: OrderStatus.pending(),
        orderedDate: new Date(),
        canReturn: true,
        canCancel: true,
      },
      id
    );
  }

  static reconstitute(props: OrderItemProps, id: ID): OrderItem {
    return new OrderItem(props, id);
  }

  get productId(): ID {
    return this.props.productId;
  }

  get quantity(): Quantity {
    return this.props.quantity;
  }

  get productName(): string {
    return this.props.productName;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  get totalPrice(): Money {
    return this.props.totalPrice;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  updateStatus(newStatus: OrderStatusEnum): void {
    // Entities use this.props, so this is correct.
    this.props.status = this.props.status.transitionTo(newStatus);

    if (newStatus === OrderStatusEnum.SHIPPED) {
      this.props.shippedDate = new Date();
      this.props.canCancel = false;
    }

    if (newStatus === OrderStatusEnum.DELIVERED) {
      this.props.deliveredDate = new Date();
      this.props.canCancel = false;
    }

    if (newStatus === OrderStatusEnum.CANCELLED || newStatus === OrderStatusEnum.RETURNED) {
      this.props.canReturn = false;
      this.props.canCancel = false;
    }
  }

  canBeCancelled(): boolean {
    return this.props.canCancel && this.props.status.canBeCancelled;
  }

  canBeReturned(): boolean {
    return this.props.canReturn && this.props.status.isDelivered;
  }

  updateQuantity(quantity: Quantity): void {
    this.props.quantity = quantity;
    this.props.totalPrice = this.props.unitPrice.multiply(quantity.value);
  }
}
