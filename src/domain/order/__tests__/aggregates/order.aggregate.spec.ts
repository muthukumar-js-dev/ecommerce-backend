import { Order } from '../../aggregates/order.aggregate';
import { OrderItem } from '../../entities/order-item.entity';
import { ShippingAddress } from '../../value-objects/shipping-address.vo';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { OrderStatusEnum } from '../../value-objects/order-status.vo';

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
      expect(order.domainEvents[0]!.eventName).toBe('OrderPlaced');
    });

    it('should throw error for empty items', () => {
      expect(() => Order.create('user-123', [], shippingAddress, 'order-123')).toThrow(
        'Order must have at least one item'
      );
    });

    it('should calculate totals correctly', () => {
      const items = [createTestItem()]; // 2 * 100 = 200
      const order = Order.create('user-123', items, shippingAddress, 'order-123');

      // Subtotal: 200
      // Shipping: 50 (< 500)
      // Tax: 36 (18% of 200)
      // Total: 286
      expect(order.total.amount).toBe(286);
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
      expect(order.domainEvents[0]!.eventName).toBe('OrderCancelled');
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
