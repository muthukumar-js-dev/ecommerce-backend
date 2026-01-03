import { Order } from '../entities/order.entity';
import { OrderStatus, PaymentMethod } from '@shared/types/common';

describe('Order Entity', () => {
  const validProps = {
    userId: 'user123',
    items: [
      {
        productId: 'prod1',
        quantity: 2,
        status: OrderStatus.ORDERED,
        orderedDate: new Date(),
        cancelOrder: false,
        returnProduct: false,
      },
    ],
    paymentMethod: PaymentMethod.CARD,
  };

  describe('create', () => {
    it('should create an order with valid props', () => {
      const order = Order.create(validProps, 'order123');

      expect(order.id).toBe('order123');
      expect(order.userId).toBe('user123');
      expect(order.items).toHaveLength(1);
    });

    it('should set default items', () => {
      const props = { ...validProps, items: undefined };
      const order = Order.create(props as unknown as typeof validProps, 'order123');

      expect(order.items).toEqual([]);
    });
  });

  describe('computed properties', () => {
    it('should calculate itemCount correctly', () => {
      const order = Order.create(validProps, 'order123');
      expect(order.itemCount).toBe(1);
    });

    it('should calculate totalQuantity correctly', () => {
      const order = Order.create(validProps, 'order123');
      expect(order.totalQuantity).toBe(2);
    });
  });

  describe('updateItemStatus', () => {
    it('should update item status', () => {
      const order = Order.create(validProps, 'order123');

      order.updateItemStatus('prod1', OrderStatus.SHIPPED);

      expect(order.items[0]?.status).toBe(OrderStatus.SHIPPED);
    });

    it('should set delivered date when status is delivered', () => {
      const order = Order.create(validProps, 'order123');

      order.updateItemStatus('prod1', OrderStatus.DELIVERED);

      expect(order.items[0]?.status).toBe(OrderStatus.DELIVERED);
      expect(order.items[0]?.deliveredDate).toBeInstanceOf(Date);
    });
  });

  describe('cancelItem', () => {
    it('should cancel an item', () => {
      const order = Order.create(validProps, 'order123');

      order.cancelItem('prod1');

      expect(order.items[0]?.cancelOrder).toBe(true);
      expect(order.items[0]?.cancelStatus).toBe('applied');
    });
  });

  describe('acceptCancellation', () => {
    it('should accept cancellation', () => {
      const order = Order.create(validProps, 'order123');
      order.cancelItem('prod1');

      order.acceptCancellation('prod1');

      expect(order.items[0]?.cancelStatus).toBe('accepted');
    });
  });

  describe('initiateReturn', () => {
    it('should initiate return', () => {
      const order = Order.create(validProps, 'order123');

      order.initiateReturn('prod1', 'refund');

      expect(order.items[0]?.returnProduct).toBe(true);
      expect(order.items[0]?.returnOption).toBe('refund');
      expect(order.items[0]?.returnStatus).toBe('initiated');
    });
  });

  describe('updateReturnStatus', () => {
    it('should update return status', () => {
      const order = Order.create(validProps, 'order123');
      order.initiateReturn('prod1', 'refund');

      order.updateReturnStatus('prod1', 'completed');

      expect(order.items[0]?.returnStatus).toBe('completed');
    });
  });

  describe('setDeliveryDate', () => {
    it('should set delivery date', () => {
      const order = Order.create(validProps, 'order123');
      const deliveryDate = new Date('2026-01-10');

      order.setDeliveryDate('prod1', deliveryDate);

      expect(order.items[0]?.deliveryDate).toEqual(deliveryDate);
    });
  });
});
