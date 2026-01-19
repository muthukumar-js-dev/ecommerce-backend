import { Product } from '../../aggregates/product.aggregate';
import { Money } from '../../value-objects/money.vo';
import { SKU } from '../../value-objects/sku.vo';
import { Quantity } from '../../value-objects/quantity.vo';

describe('Product Aggregate', () => {
  const validProps = {
    sku: SKU.create('PROD001'),
    title: 'Test Product',
    description: 'Test description',
    category: 'Electronics',
    brand: 'TestBrand',
    actualPrice: Money.create(1000),
    sellingPrice: Money.create(800),
    inventory: Quantity.create(100),
    images: ['image1.jpg'],
    productDetails: [],
    sellerId: 'seller-123',
  };

  describe('create', () => {
    it('should create product and raise ProductCreated event', () => {
      const product = Product.create(validProps, 'prod-123');

      expect(product.id).toBe('prod-123');
      expect(product.title).toBe('Test Product');
      expect(product.domainEvents).toHaveLength(1);
      expect(product.domainEvents[0]!.eventName).toBe('ProductCreated');
    });

    it('should throw error if selling price > actual price', () => {
      const invalidProps = {
        ...validProps,
        sellingPrice: Money.create(1200),
      };

      expect(() => Product.create(invalidProps, 'prod-123')).toThrow(
        'Selling price cannot exceed actual price'
      );
    });

    it('should throw error if title is too short', () => {
      const invalidProps = { ...validProps, title: 'Ab' };
      expect(() => Product.create(invalidProps, '1')).toThrow('Product title must be at least 3 characters');
    });

    it('should throw error if no images', () => {
      const invalidProps = { ...validProps, images: [] };
      expect(() => Product.create(invalidProps, '1')).toThrow('Product must have at least one image');
    });
  });

  describe('reserveInventory', () => {
    it('should reduce inventory', () => {
      const product = Product.create(validProps, 'prod-123');
      product.clearDomainEvents();

      product.reserveInventory(Quantity.create(10));

      expect(product.inventory.value).toBe(90);
    });

    it('should raise ProductOutOfStock when inventory reaches zero', () => {
      const product = Product.create(validProps, 'prod-123');
      product.clearDomainEvents();

      product.reserveInventory(Quantity.create(100));

      expect(product.inventory.isZero).toBe(true);
      expect(product.domainEvents).toHaveLength(1);
      expect(product.domainEvents[0]!.eventName).toBe('ProductOutOfStock');
    });

    it('should throw error for insufficient inventory', () => {
      const product = Product.create(validProps, 'prod-123');

      expect(() => product.reserveInventory(Quantity.create(150))).toThrow(
        'Insufficient inventory'
      );
    });
  });

  describe('updatePrice', () => {
    it('should update price and raise PriceChanged event', () => {
      const product = Product.create(validProps, 'prod-123');
      product.clearDomainEvents();

      product.updatePrice(Money.create(750), product.actualPrice, 'admin-123');

      expect(product.sellingPrice.amount).toBe(750);
      expect(product.domainEvents).toHaveLength(1);
      expect(product.domainEvents[0]!.eventName).toBe('PriceChanged');
    });
  });

  describe('discountPercentage', () => {
    it('should calculate discount correctly', () => {
      const product = Product.create(validProps, 'prod-123');
      expect(product.discountPercentage).toBe(20); // (1000-800)/1000 * 100
    });
  });

  describe('availability', () => {
    it('should return available if active and has inventory', () => {
      const product = Product.create(validProps, '1');
      expect(product.isAvailable).toBe(true);
    });

    it('should return unavailable if inventory is 0', () => {
      const product = Product.create({ ...validProps, inventory: Quantity.zero() }, '1');
      expect(product.isAvailable).toBe(false);
    });

    it('should return unavailable if deactivated', () => {
      const product = Product.create(validProps, '1');
      product.deactivate();
      expect(product.isAvailable).toBe(false);
    });
  });
});
