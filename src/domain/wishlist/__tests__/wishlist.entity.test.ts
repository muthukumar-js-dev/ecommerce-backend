import { Wishlist } from '../entities/wishlist.entity';

describe('Wishlist Entity', () => {
  const validProps = {
    userId: 'user123',
    name: 'My Favorites',
    productIds: ['prod1', 'prod2', 'prod3'],
    status: 1,
  };

  describe('create', () => {
    it('should create a wishlist with valid props', () => {
      const wishlist = Wishlist.create(validProps, 'wish123');

      expect(wishlist.id).toBe('wish123');
      expect(wishlist.name).toBe('My Favorites');
      expect(wishlist.productIds).toHaveLength(3);
    });

    it('should set default values', () => {
      const wishlist = Wishlist.create({ userId: 'user123' } as typeof validProps, 'wish123');

      expect(wishlist.name).toBe('New Folder');
      expect(wishlist.productIds).toEqual([]);
      expect(wishlist.status).toBe(1);
    });
  });

  describe('computed properties', () => {
    it('should calculate itemCount correctly', () => {
      const wishlist = Wishlist.create(validProps, 'wish123');
      expect(wishlist.itemCount).toBe(3);
    });

    it('should determine isEmpty correctly', () => {
      const empty = Wishlist.create({ ...validProps, productIds: [] }, 'wish123');
      const full = Wishlist.create(validProps, 'wish456');

      expect(empty.isEmpty).toBe(true);
      expect(full.isEmpty).toBe(false);
    });

    it('should determine isActive correctly', () => {
      const active = Wishlist.create(validProps, 'wish123');
      const inactive = Wishlist.create({ ...validProps, status: 0 }, 'wish456');

      expect(active.isActive).toBe(true);
      expect(inactive.isActive).toBe(false);
    });
  });

  describe('addProduct', () => {
    it('should add product to wishlist', () => {
      const wishlist = Wishlist.create({ ...validProps, productIds: [] }, 'wish123');

      wishlist.addProduct('prod1');

      expect(wishlist.productIds).toContain('prod1');
      expect(wishlist.itemCount).toBe(1);
    });

    it('should not add duplicate product', () => {
      const wishlist = Wishlist.create(validProps, 'wish123');

      wishlist.addProduct('prod1');

      expect(wishlist.itemCount).toBe(3);
    });
  });

  describe('removeProduct', () => {
    it('should remove product from wishlist', () => {
      const wishlist = Wishlist.create(validProps, 'wish123');

      wishlist.removeProduct('prod1');

      expect(wishlist.productIds).not.toContain('prod1');
      expect(wishlist.itemCount).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all products', () => {
      const wishlist = Wishlist.create(validProps, 'wish123');

      wishlist.clear();

      expect(wishlist.productIds).toHaveLength(0);
      expect(wishlist.isEmpty).toBe(true);
    });
  });

  describe('rename', () => {
    it('should rename wishlist', () => {
      const wishlist = Wishlist.create(validProps, 'wish123');

      wishlist.rename('New Name');

      expect(wishlist.name).toBe('New Name');
    });
  });

  describe('activate/deactivate', () => {
    it('should deactivate wishlist', () => {
      const wishlist = Wishlist.create(validProps, 'wish123');

      wishlist.deactivate();

      expect(wishlist.status).toBe(0);
      expect(wishlist.isActive).toBe(false);
    });

    it('should activate wishlist', () => {
      const wishlist = Wishlist.create({ ...validProps, status: 0 }, 'wish123');

      wishlist.activate();

      expect(wishlist.status).toBe(1);
      expect(wishlist.isActive).toBe(true);
    });
  });
});
