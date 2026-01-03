import { Cart } from '../entities/cart.entity';

describe('Cart Entity', () => {
  const validProps = {
    userId: 'user123',
    items: [
      { productId: 'prod1', quantity: 2, later: false },
      { productId: 'prod2', quantity: 1, later: false },
    ],
    totalAmount: 1500,
    totalActualAmount: 2000,
    totalDiscount: 500,
    currency: 'INR',
  };

  describe('create', () => {
    it('should create a cart with valid props', () => {
      const cart = Cart.create(validProps, 'cart123');

      expect(cart.id).toBe('cart123');
      expect(cart.userId).toBe('user123');
      expect(cart.items).toHaveLength(2);
      expect(cart.totalAmount).toBe(1500);
    });

    it('should set default values', () => {
      const cart = Cart.create({ userId: 'user123' } as typeof validProps, 'cart123');

      expect(cart.items).toEqual([]);
      expect(cart.totalAmount).toBe(0);
      expect(cart.totalActualAmount).toBe(0);
      expect(cart.totalDiscount).toBe(0);
      expect(cart.currency).toBe('INR');
    });
  });

  describe('computed properties', () => {
    it('should calculate itemCount correctly', () => {
      const cart = Cart.create(validProps, 'cart123');
      expect(cart.itemCount).toBe(2);
    });

    it('should determine isEmpty correctly', () => {
      const emptyCart = Cart.create({ ...validProps, items: [] }, 'cart123');
      const fullCart = Cart.create(validProps, 'cart456');

      expect(emptyCart.isEmpty).toBe(true);
      expect(fullCart.isEmpty).toBe(false);
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', () => {
      const cart = Cart.create({ ...validProps, items: [] }, 'cart123');

      cart.addItem('prod1', 2);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]?.productId).toBe('prod1');
      expect(cart.items[0]?.quantity).toBe(2);
    });

    it('should increase quantity if item exists', () => {
      const cart = Cart.create(validProps, 'cart123');

      cart.addItem('prod1', 1);

      expect(cart.items).toHaveLength(2);
      expect(cart.items[0]?.quantity).toBe(3);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const cart = Cart.create(validProps, 'cart123');

      cart.removeItem('prod1');

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]?.productId).toBe('prod2');
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const cart = Cart.create(validProps, 'cart123');

      cart.updateQuantity('prod1', 5);

      expect(cart.items[0]?.quantity).toBe(5);
    });
  });

  describe('moveToLater', () => {
    it('should move item to save for later', () => {
      const cart = Cart.create(validProps, 'cart123');

      cart.moveToLater('prod1');

      expect(cart.items[0]?.later).toBe(true);
    });
  });

  describe('moveToCart', () => {
    it('should move item back to cart', () => {
      const cart = Cart.create(
        {
          ...validProps,
          items: [{ productId: 'prod1', quantity: 2, later: true }],
        },
        'cart123'
      );

      cart.moveToCart('prod1');

      expect(cart.items[0]?.later).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      const cart = Cart.create(validProps, 'cart123');

      cart.clear();

      expect(cart.items).toHaveLength(0);
      expect(cart.isEmpty).toBe(true);
    });
  });

  describe('updateTotals', () => {
    it('should update total amounts', () => {
      const cart = Cart.create(validProps, 'cart123');

      cart.updateTotals(1800, 2500);

      expect(cart.totalAmount).toBe(1800);
      expect(cart.totalActualAmount).toBe(2500);
      expect(cart.totalDiscount).toBe(700);
    });
  });
});
