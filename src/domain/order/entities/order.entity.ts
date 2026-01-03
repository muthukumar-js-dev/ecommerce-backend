import { Entity } from '@shared/domain/entity';
import { ID, Timestamp, OrderStatus, PaymentMethod } from '@shared/types/common';

export interface OrderItem {
  productId: ID;
  quantity: number;
  status: OrderStatus;
  orderedDate: Date;
  deliveryDate?: Date;
  deliveredDate?: Date;
  cancelOrder: boolean;
  returnOption?: 'refund' | 'return';
  cancelStatus?: 'applied' | 'accepted';
  returnStatus?: 'initiated' | 'process' | 'completed';
  shippingAddressId?: ID;
  returnProduct: boolean;
}

export interface OrderProps {
  userId: ID;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Order extends Entity<OrderProps> {
  private constructor(props: OrderProps, id: ID) {
    super(props, id);
  }

  static create(props: Omit<OrderProps, 'createdAt' | 'updatedAt'>, id: ID): Order {
    const now = new Date();
    return new Order(
      {
        ...props,
        items: props.items ?? [],
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  get userId(): ID {
    return this.props.userId;
  }

  get items(): OrderItem[] {
    return this.props.items;
  }

  get paymentMethod(): PaymentMethod {
    return this.props.paymentMethod;
  }

  get itemCount(): number {
    return this.props.items.length;
  }

  get totalQuantity(): number {
    return this.props.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  updateItemStatus(productId: ID, status: OrderStatus): void {
    const item = this.props.items.find((i) => i.productId === productId);
    if (item !== undefined) {
      (item as { status: OrderStatus }).status = status;
      if (status === OrderStatus.DELIVERED) {
        (item as { deliveredDate?: Date }).deliveredDate = new Date();
      }
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  cancelItem(productId: ID): void {
    const item = this.props.items.find((i) => i.productId === productId);
    if (item !== undefined) {
      (item as { cancelOrder: boolean }).cancelOrder = true;
      (item as { cancelStatus?: string }).cancelStatus = 'applied';
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  acceptCancellation(productId: ID): void {
    const item = this.props.items.find((i) => i.productId === productId);
    if (item !== undefined && item.cancelOrder) {
      (item as { cancelStatus?: string }).cancelStatus = 'accepted';
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  initiateReturn(productId: ID, returnOption: 'refund' | 'return'): void {
    const item = this.props.items.find((i) => i.productId === productId);
    if (item !== undefined) {
      (item as { returnProduct: boolean }).returnProduct = true;
      (item as { returnOption?: string }).returnOption = returnOption;
      (item as { returnStatus?: string }).returnStatus = 'initiated';
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  updateReturnStatus(productId: ID, status: 'initiated' | 'process' | 'completed'): void {
    const item = this.props.items.find((i) => i.productId === productId);
    if (item !== undefined && item.returnProduct) {
      (item as { returnStatus?: string }).returnStatus = status;
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  setDeliveryDate(productId: ID, date: Date): void {
    const item = this.props.items.find((i) => i.productId === productId);
    if (item !== undefined) {
      (item as { deliveryDate?: Date }).deliveryDate = date;
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }
}
