# Phase 2 - Task 4: Implement Domain Layer (Order Context)

**Duration:** 6-7 days  
**Priority:** High  
**Dependencies:** Tasks 2, 3 (User and Product Domain Layers)

---

## Objective

Implement the most complex aggregate in the system - the Order aggregate with state machine, business rules, and coordination with payment and shipping.

---

## Context

The Order context is the core of the e-commerce system with complex business rules:
- Order lifecycle management
- State transitions with validation
- Payment coordination
- Inventory reservation
- Cancellation and return policies
- Multi-item order handling

---

## Implementation Steps

### Step 1: Create Value Objects

**Create `src/domain/order/value-objects/order-number.vo.ts`:**

```typescript
import { ValueObject } from '@shared/domain/value-object';

interface OrderNumberProps {
  value: string;
}

export class OrderNumber extends ValueObject<OrderNumberProps> {
  private constructor(props: OrderNumberProps) {
    super(props);
  }

  static generate(timestamp: Date, userId: string): OrderNumber {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const userHash = userId.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const value = `ORD-${year}${month}${day}-${userHash}-${random}`;
    return new OrderNumber({ value });
  }

  static fromString(value: string): OrderNumber {
    return new OrderNumber({ value });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}
```

**Create `src/domain/order/value-objects/shipping-address.vo.ts`:**

```typescript
import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface ShippingAddressProps {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  recipientName: string;
  phoneNumber: string;
}

export class ShippingAddress extends ValueObject<ShippingAddressProps> {
  private constructor(props: ShippingAddressProps) {
    super(props);
  }

  static create(props: ShippingAddressProps): ShippingAddress {
    this.validate(props);
    return new ShippingAddress(props);
  }

  private static validate(props: ShippingAddressProps): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!props.street || props.street.trim().length < 5) {
      errors.push({ field: 'street', message: 'Street address is required' });
    }

    if (!props.city || props.city.trim().length < 2) {
      errors.push({ field: 'city', message: 'City is required' });
    }

    if (!props.postalCode || !/^\d{6}$/.test(props.postalCode)) {
      errors.push({ field: 'postalCode', message: 'Invalid postal code' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid shipping address', errors);
    }
  }

  get fullAddress(): string {
    return `${this.props.street}, ${this.props.city}, ${this.props.state} ${this.props.postalCode}, ${this.props.country}`;
  }

  get recipientName(): string {
    return this.props.recipientName;
  }

  get phoneNumber(): string {
    return this.props.phoneNumber;
  }
}
```

### Step 2: Create Order Status Enum and State Machine

**Create `src/domain/order/value-objects/order-status.vo.ts`:**

```typescript
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
    return this.props.value;
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
    return this.canTransitionTo(OrderStatusEnum.CANCELLED);
  }

  get isFinal(): boolean {
    return this.isCancelled || this.isReturned || this.isDelivered;
  }
}
```

### Step 3: Create Order Item Entity

**Create `src/domain/order/entities/order-item.entity.ts`:**

```typescript
import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
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

  get productId(): ID {
    return this.props.productId;
  }

  get quantity(): Quantity {
    return this.props.quantity;
  }

  get totalPrice(): Money {
    return this.props.totalPrice;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  updateStatus(newStatus: OrderStatusEnum): void {
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
}
```

### Step 4: Create Domain Events

**Create `src/domain/order/events/order-placed.event.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface OrderPlacedPayload {
  orderId: ID;
  orderNumber: string;
  userId: ID;
  totalAmount: number;
  itemCount: number;
  placedAt: Date;
}

export class OrderPlaced extends DomainEvent<OrderPlacedPayload> {
  constructor(payload: OrderPlacedPayload) {
    super('OrderPlaced', payload, 1);
  }
}
```

**Create `src/domain/order/events/order-cancelled.event.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface OrderCancelledPayload {
  orderId: ID;
  orderNumber: string;
  userId: ID;
  reason?: string;
  cancelledAt: Date;
}

export class OrderCancelled extends DomainEvent<OrderCancelledPayload> {
  constructor(payload: OrderCancelledPayload) {
    super('OrderCancelled', payload, 1);
  }
}
```

### Step 5: Create Order Aggregate

**Create `src/domain/order/aggregates/order.aggregate.ts`:**

```typescript
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
        placedAt: now,
      })
    );

    return order;
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
```

### Step 6: Create Domain Services

**Create `src/domain/order/services/order-validation.service.ts`:**

```typescript
import { Order } from '../aggregates/order.aggregate';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { BusinessRuleError } from '@shared/errors';

export class OrderValidationService {
  constructor(private readonly productRepository: IProductRepository) {}

  async validateOrderItems(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepository.findById(item.productId);

      if (!product) {
        throw new BusinessRuleError(
          `Product ${item.productId} not found`,
          'PRODUCT_NOT_FOUND'
        );
      }

      if (!product.isAvailable) {
        throw new BusinessRuleError(
          `Product ${product.title} is not available`,
          'PRODUCT_UNAVAILABLE'
        );
      }

      if (item.quantity.isGreaterThan(product.inventory)) {
        throw new BusinessRuleError(
          `Insufficient inventory for ${product.title}`,
          'INSUFFICIENT_INVENTORY'
        );
      }
    }
  }
}
```

---

## Testing Requirements

**Create `src/domain/order/__tests__/order.aggregate.test.ts`:**

```typescript
import { Order } from '../aggregates/order.aggregate';
import { OrderItem } from '../entities/order-item.entity';
import { ShippingAddress } from '../value-objects/shipping-address.vo';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { OrderStatusEnum } from '../value-objects/order-status.vo';

describe('Order Aggregate', () => {
  const shippingAddress = ShippingAddress.create({
    street: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    recipientName: 'John Doe',
    phoneNumber: '9876543210',
  });

  const createTestItem = () =>
    OrderItem.create(
      'prod-123',
      'Test Product',
      Quantity.create(2),
      Money.create(100),
      'item-123'
    );

  describe('create', () => {
    it('should create order and raise OrderPlaced event', () => {
      const items = [createTestItem()];
      const order = Order.create('user-123', items, shippingAddress, 'order-123');

      expect(order.id).toBe('order-123');
      expect(order.items).toHaveLength(1);
      expect(order.domainEvents).toHaveLength(1);
      expect(order.domainEvents[0].eventName).toBe('OrderPlaced');
    });

    it('should throw error for empty items', () => {
      expect(() => Order.create('user-123', [], shippingAddress, 'order-123')).toThrow(
        'Order must have at least one item'
      );
    });

    it('should calculate totals correctly', () => {
      const items = [createTestItem()]; // 2 * 100 = 200
      const order = Order.create('user-123', items, shippingAddress, 'order-123');

      expect(order.total.amount).toBeGreaterThan(200); // includes tax and shipping
    });
  });

  describe('state transitions', () => {
    it('should transition through valid states', () => {
      const order = Order.create('user-123', [createTestItem()], shippingAddress, 'order-123');

      order.confirm();
      expect(order.status.isConfirmed).toBe(true);

      order.markAsPaid('payment-123');
      expect(order.status.isPaid).toBe(true);

      order.startProcessing();
      expect(order.status.value).toBe(OrderStatusEnum.PROCESSING);

      order.ship('TRACK123');
      expect(order.status.isShipped).toBe(true);

      order.deliver();
      expect(order.status.isDelivered).toBe(true);
    });

    it('should allow cancellation before shipping', () => {
      const order = Order.create('user-123', [createTestItem()], shippingAddress, 'order-123');
      order.clearDomainEvents();

      order.cancel('Customer request');

      expect(order.status.isCancelled).toBe(true);
      expect(order.domainEvents).toHaveLength(1);
      expect(order.domainEvents[0].eventName).toBe('OrderCancelled');
    });

    it('should not allow cancellation after shipping', () => {
      const order = Order.create('user-123', [createTestItem()], shippingAddress, 'order-123');
      order.confirm();
      order.markAsPaid('payment-123');
      order.startProcessing();
      order.ship('TRACK123');

      expect(() => order.cancel()).toThrow('Cannot transition');
    });
  });
});
```

---

## Deliverables

- [ ] Value objects (OrderNumber, ShippingAddress, OrderStatus)
- [ ] OrderItem entity
- [ ] Order aggregate with state machine
- [ ] Domain events (OrderPlaced, OrderCancelled, etc.)
- [ ] Domain services (OrderValidation)
- [ ] Unit tests (90%+ coverage)
- [ ] State machine diagram
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 5: Implement CQRS Pattern** (if not done)
2. Integrate with Payment context
3. Create order read models

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 6-7 days  
**Status:** Not Started
