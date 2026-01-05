import { InventoryService } from '../../services/inventory.service';
import { Product } from '../../aggregates/product.aggregate';
import { Quantity } from '../../value-objects/quantity.vo';
import { Money } from '../../value-objects/money.vo';
import { SKU } from '../../value-objects/sku.vo';

describe('InventoryService', () => {
  let service: InventoryService;
  let product: Product;

  beforeEach(() => {
    service = new InventoryService();
    product = Product.create({
        sku: SKU.create('TEST-SKU'),
        title: 'Test Product',
        description: 'Desc',
        category: 'Cat',
        brand: 'Brand',
        actualPrice: Money.create(100),
        sellingPrice: Money.create(100),
        inventory: Quantity.create(10),
        images: ['img.jpg'],
        productDetails: [],
        sellerId: 'seller1'
    }, 'prod1');
  });

  describe('canFulfillOrder', () => {
    it('should return true if enough inventory', () => {
      expect(service.canFulfillOrder(product, Quantity.create(5))).toBe(true);
    });

    it('should return false if insufficient inventory', () => {
      expect(service.canFulfillOrder(product, Quantity.create(15))).toBe(false);
    });

    it('should return false if product not available', () => {
        product.deactivate();
        expect(service.canFulfillOrder(product, Quantity.create(5))).toBe(false);
    });
  });

  describe('calculateReorderPoint', () => {
    it('should calculate correctly with safety stock', () => {
      // 10 avg daily sales * 5 days lead time * 1.5 safety factor = 75
      const rp = service.calculateReorderPoint(10, 5);
      expect(rp.value).toBe(75);
    });
  });

  describe('needsRestock', () => {
    it('should return true if inventory below reorder point', () => {
        const current = Quantity.create(50);
        const rp = Quantity.create(100);
        expect(service.needsRestock(current, rp)).toBe(true);
    });
    
    it('should return false if inventory above reorder point', () => {
        const current = Quantity.create(150);
        const rp = Quantity.create(100);
        expect(service.needsRestock(current, rp)).toBe(false);
    });
  });
});
