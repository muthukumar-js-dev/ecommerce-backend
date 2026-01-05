import { AggregateRoot } from '@shared/domain/aggregate-root';
import { ID, Timestamp } from '@shared/types/common';
import { Money } from '@domain/product/value-objects/money.vo';
import { OrderNumber } from '../value-objects/order-number.vo';
import { OrderStatus, OrderStatusEnum } from '../value-objects/order-status.vo';
import { ShippingAddress } from '../value-objects/shipping-address.vo';
import { OrderItem } from '../entities/order-item.entity';
import { OrderPlaced } from '../events/order-placed.event';
import { OrderCancelled } from '../events/order-cancelled.event';
import { BusinessRuleError } from '@shared/errors';

export interface OrderProps {
  orderNumber: OrderNumber;
  userId: ID;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  subtotal: Money;
  shippingCost: Money;
  tax: Money;
  total: Money;
  paymentMethodId?: ID;
  paymentId?: ID;
  trackingNumber?: string;
  estimatedDeliveryDate?: Timestamp;
  actualDeliveryDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Order extends AggregateRoot<OrderProps> {
  private static readonly MAX_ITEMS = 50;
  private static readonly DELIVERY_DAYS = 4;

  private constructor(props: OrderProps, id: ID) {
    super(props, id);
  }

  static create(
    userId: ID,
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    id: ID
  ): Order {
    if (items.length === 0) {
      throw new BusinessRuleError('Order must have at least one item', 'NO_ITEMS');
    }

    if (items.length > this.MAX_ITEMS) {
      throw new BusinessRuleError(
        `Order cannot have more than ${this.MAX_ITEMS} items`,
        'TOO_MANY_ITEMS'
      );
    }

    const now = new Date();
    const orderNumber = OrderNumber.generate(now, userId);
    const subtotal = this.calculateSubtotal(items);
    const shippingCost = this.calculateShipping(subtotal);
    const tax = this.calculateTax(subtotal);
    const total = subtotal.add(shippingCost).add(tax);
    const estimatedDeliveryDate = this.calculateDeliveryDate(now);

    const order = new Order(
      {
        orderNumber,
        userId,
        items,
        shippingAddress,
        status: OrderStatus.pending(),
        subtotal,
        shippingCost,
        tax,
        total,
        estimatedDeliveryDate,
        createdAt: now,
        updatedAt: now,
      },
      id
    );

    order.addDomainEvent(
      new OrderPlaced({
        orderId: id,
        orderNumber: orderNumber.value,
        userId,
        totalAmount: total.amount,
        itemCount: items.length,
        status: OrderStatusEnum.PENDING,
        items: items.map(item => ({
          productId: item.productId,
          name: item.productName,
          quantity: item.quantity.value,
          price: item.unitPrice.amount
        })),
        placedAt: now,
      })
    );

    return order;
  }

  static reconstitute(props: OrderProps, id: ID): Order {
    return new Order(props, id);
  }

  // Getters
  get orderNumber(): OrderNumber {
    return this.props.orderNumber;
  }

  get userId(): ID {
    return this.props.userId;
  }

  get items(): OrderItem[] {
    return this.props.items;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get total(): Money {
    return this.props.total;
  }

  get subtotal(): Money {
    return this.props.subtotal;
  }

  get shippingCost(): Money {
    return this.props.shippingCost;
  }

  get tax(): Money {
    return this.props.tax;
  }

  get canBeCancelled(): boolean {
    return this.props.status.canBeCancelled;
  }

  // Business methods
  confirm(): void {
    this.props.status = this.props.status.transitionTo(OrderStatusEnum.CONFIRMED);
    this.props.updatedAt = new Date();
  }

  markAsPaid(paymentId: ID): void {
    this.props.paymentId = paymentId;
    this.props.status = this.props.status.transitionTo(OrderStatusEnum.PAID);
    this.props.updatedAt = new Date();
  }

  startProcessing(): void {
    if (!this.props.paymentId) {
      throw new BusinessRuleError('Cannot process unpaid order', 'UNPAID_ORDER');
    }

    this.props.status = this.props.status.transitionTo(OrderStatusEnum.PROCESSING);
    this.props.updatedAt = new Date();
  }

  ship(trackingNumber: string): void {
    this.props.trackingNumber = trackingNumber;
    this.props.status = this.props.status.transitionTo(OrderStatusEnum.SHIPPED);
    this.props.updatedAt = new Date();

    // Update all items
    this.props.items.forEach((item) => item.updateStatus(OrderStatusEnum.SHIPPED));
  }

  deliver(): void {
    this.props.actualDeliveryDate = new Date();
    this.props.status = this.props.status.transitionTo(OrderStatusEnum.DELIVERED);
    this.props.updatedAt = new Date();

    // Update all items
    this.props.items.forEach((item) => item.updateStatus(OrderStatusEnum.DELIVERED));
  }

  cancel(reason?: string): void {
    if (!this.canBeCancelled) {
      throw new BusinessRuleError('Order cannot be cancelled', 'CANNOT_CANCEL');
    }

    this.props.status = this.props.status.transitionTo(OrderStatusEnum.CANCELLED);
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new OrderCancelled({
        orderId: this.id,
        orderNumber: this.props.orderNumber.value,
        userId: this.props.userId,
        reason,
        cancelledAt: new Date(),
      })
    );
  }

  // Calculations
  private static calculateSubtotal(items: OrderItem[]): Money {
    return items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      Money.create(0)
    );
  }

  private static calculateShipping(subtotal: Money): Money {
    // Free shipping over ₹500
    if (subtotal.amount >= 500) {
      return Money.create(0);
    }
    return Money.create(50);
  }

  private static calculateTax(subtotal: Money): Money {
    // 18% GST
    return Money.create(subtotal.amount * 0.18);
  }

  private static calculateDeliveryDate(orderDate: Date): Date {
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + this.DELIVERY_DAYS);
    return deliveryDate;
  }
}
