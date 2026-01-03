import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';

export interface StripeOrderItem {
  productId: ID;
  quantity: number;
  price: number;
}

export interface StripeOrderProps {
  userId: ID;
  items: StripeOrderItem[];
  addressId: ID;
  totalAmount: number;
  stripePaymentIntentId?: string;
  status: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class StripeOrder extends Entity<StripeOrderProps> {
  private constructor(props: StripeOrderProps, id: ID) {
    super(props, id);
  }

  static create(props: Omit<StripeOrderProps, 'createdAt' | 'updatedAt'>, id: ID): StripeOrder {
    const now = new Date();
    return new StripeOrder(
      {
        ...props,
        status: props.status ?? 'pending',
        totalAmount: props.totalAmount ?? 0,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  get userId(): ID {
    return this.props.userId;
  }

  get items(): StripeOrderItem[] {
    return this.props.items;
  }

  get addressId(): ID {
    return this.props.addressId;
  }

  get totalAmount(): number {
    return this.props.totalAmount;
  }

  get stripePaymentIntentId(): string | undefined {
    return this.props.stripePaymentIntentId;
  }

  get status(): string {
    return this.props.status;
  }

  setPaymentIntentId(intentId: string): void {
    (this.props as { stripePaymentIntentId?: string }).stripePaymentIntentId = intentId;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  updateStatus(status: string): void {
    (this.props as { status: string }).status = status;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }
}
