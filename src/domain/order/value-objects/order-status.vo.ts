import { ValueObject } from '@shared/domain/value-object';
import { BusinessRuleError } from '@shared/errors';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

interface OrderStatusProps {
  value: OrderStatusEnum;
}

export class OrderStatus extends ValueObject<OrderStatusProps> {
  private static readonly VALID_TRANSITIONS: Record<OrderStatusEnum, OrderStatusEnum[]> = {
    [OrderStatusEnum.PENDING]: [OrderStatusEnum.CONFIRMED, OrderStatusEnum.CANCELLED],
    [OrderStatusEnum.CONFIRMED]: [OrderStatusEnum.PAID, OrderStatusEnum.CANCELLED],
    [OrderStatusEnum.PAID]: [OrderStatusEnum.PROCESSING, OrderStatusEnum.CANCELLED],
    [OrderStatusEnum.PROCESSING]: [OrderStatusEnum.SHIPPED, OrderStatusEnum.CANCELLED],
    [OrderStatusEnum.SHIPPED]: [OrderStatusEnum.DELIVERED, OrderStatusEnum.RETURNED],
    [OrderStatusEnum.DELIVERED]: [OrderStatusEnum.RETURNED],
    [OrderStatusEnum.CANCELLED]: [],
    [OrderStatusEnum.RETURNED]: [],
  };

  private constructor(props: OrderStatusProps) {
    super(props);
  }

  static create(status: OrderStatusEnum): OrderStatus {
    return new OrderStatus({ value: status });
  }

  static pending(): OrderStatus {
    return new OrderStatus({ value: OrderStatusEnum.PENDING });
  }

  get value(): OrderStatusEnum {
    return this._value.value;
  }

  canTransitionTo(newStatus: OrderStatusEnum): boolean {
    const allowedTransitions = OrderStatus.VALID_TRANSITIONS[this.value];
    return allowedTransitions.includes(newStatus);
  }

  transitionTo(newStatus: OrderStatusEnum): OrderStatus {
    if (!this.canTransitionTo(newStatus)) {
      throw new BusinessRuleError(
        `Cannot transition from ${this.value} to ${newStatus}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
    return OrderStatus.create(newStatus);
  }

  get isPending(): boolean {
    return this.value === OrderStatusEnum.PENDING;
  }

  get isConfirmed(): boolean {
    return this.value === OrderStatusEnum.CONFIRMED;
  }

  get isPaid(): boolean {
    return this.value === OrderStatusEnum.PAID;
  }

  get isShipped(): boolean {
    return this.value === OrderStatusEnum.SHIPPED;
  }

  get isDelivered(): boolean {
    return this.value === OrderStatusEnum.DELIVERED;
  }

  get isCancelled(): boolean {
    return this.value === OrderStatusEnum.CANCELLED;
  }

  get isReturned(): boolean {
    return this.value === OrderStatusEnum.RETURNED;
  }

  get canBeCancelled(): boolean {
    // Basic rule: can cancel if not shipped, delivered or returned.
    // However, the VALID_TRANSITIONS map essentially defines this. 
    // If CANCELLED is in the list, it can be cancelled.
    return this.canTransitionTo(OrderStatusEnum.CANCELLED);
  }

  get isFinal(): boolean {
    return this.isCancelled || this.isReturned || this.isDelivered;
  }
}
