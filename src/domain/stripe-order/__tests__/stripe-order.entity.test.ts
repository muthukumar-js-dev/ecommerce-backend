import { StripeOrder } from '../entities/stripe-order.entity';

describe('StripeOrder Entity', () => {
  const validProps = {
    userId: 'user123',
    items: [
      { productId: 'prod1', quantity: 2, price: 500 },
      { productId: 'prod2', quantity: 1, price: 1000 },
    ],
    addressId: 'addr123',
    totalAmount: 2000,
    stripePaymentIntentId: 'pi_123456',
    status: 'pending',
  };

  describe('create', () => {
    it('should create a stripe order with valid props', () => {
      const order = StripeOrder.create(validProps, 'order123');

      expect(order.id).toBe('order123');
      expect(order.totalAmount).toBe(2000);
      expect(order.items).toHaveLength(2);
    });

    it('should set default values', () => {
      const props = { ...validProps, status: undefined, totalAmount: undefined };
      const order = StripeOrder.create(props as unknown as typeof validProps, 'order123');

      expect(order.status).toBe('pending');
      expect(order.totalAmount).toBe(0);
    });
  });

  describe('setPaymentIntentId', () => {
    it('should set payment intent ID', () => {
      const order = StripeOrder.create({ ...validProps, stripePaymentIntentId: undefined }, 'order123');

      order.setPaymentIntentId('pi_new123');

      expect(order.stripePaymentIntentId).toBe('pi_new123');
    });
  });

  describe('updateStatus', () => {
    it('should update order status', () => {
      const order = StripeOrder.create(validProps, 'order123');

      order.updateStatus('completed');

      expect(order.status).toBe('completed');
    });
  });
});
