import { ProductRepository } from '../../src/infrastructure/database/mongodb/repositories/product.repository';
import { Product } from '../../src/domain/product/aggregates/product.aggregate';
import { SKU } from '../../src/domain/product/value-objects/sku.vo';
import { Money } from '../../src/domain/product/value-objects/money.vo';
import { Quantity } from '../../src/domain/product/value-objects/quantity.vo';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../utils/test-helpers';
import { isSuccess } from '../../src/shared/types/result';

const mockOutboxRepository = {
  save: jest.fn().mockResolvedValue(undefined),
} as any;

describe('ProductRepository Integration Tests', () => {
  let repository: ProductRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new ProductRepository(mockOutboxRepository);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('save and findById', () => {
    it('should save and retrieve a product', async () => {
      const product = Product.create(
        {
          sku: SKU.create('PROD-001'),
          title: 'Test Product',
          category: 'Electronics',
          actualPrice: Money.create(1000),
          sellingPrice: Money.create(800),
          inventory: Quantity.create(100),
          brand: 'TestBrand',
          description: 'Test description for product',
          images: ['image1.jpg'],
          productDetails: [{ key: 'Color', value: 'Black' }],
          sellerId: '507f1f77bcf86cd799439011',

        },
        '507f1f77bcf86cd799439012'
      );

      const saveResult = await repository.save(product);
      expect(isSuccess(saveResult)).toBe(true);

      if (isSuccess(saveResult)) {
        const found = await repository.findById(saveResult.data.id);
        expect(found).not.toBeNull();
        expect(found?.title).toBe('Test Product');
      }
    });

    it('should return null for non-existent product', async () => {
      const found = await repository.findById('507f1f77bcf86cd799439011');
      expect(found).toBeNull();
    });
  });

  describe('findByPid (SKU)', () => {
    it('should find product by SKU', async () => {
      const product = Product.create(
        {
          sku: SKU.create('PID-123-SKU'),
          title: 'Test Product',
          category: 'Electronics',
          actualPrice: Money.create(1000),
          sellingPrice: Money.create(800),
          inventory: Quantity.create(50),
          brand: 'TestBrand',
          description: 'Test description',
          images: ['image1.jpg'],
          productDetails: [],
          sellerId: '507f1f77bcf86cd799439011',

        },
        '507f1f77bcf86cd799439012'
      );

      await repository.save(product);
      // Repository uses findBySku or findByPid internally mapping to SKU
      const found = await repository.findBySku(SKU.create('PID-123-SKU'));

      expect(found).not.toBeNull();
      expect(found?.sku.value).toBe('PID-123-SKU');
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const product = Product.create(
        {
          sku: SKU.create('PROD-UPDATE'),
          title: 'Original Title',
          category: 'Electronics',
          actualPrice: Money.create(1000),
          sellingPrice: Money.create(800),
          inventory: Quantity.create(10),
          brand: 'TestBrand',
          description: 'Test description',
          images: ['image1.jpg'],
          productDetails: [],
          sellerId: '507f1f77bcf86cd799439011',

        },
        '507f1f77bcf86cd799439012'
      );

      const saveResult = await repository.save(product);
      expect(isSuccess(saveResult)).toBe(true);

      if (isSuccess(saveResult)) {
        const savedProduct = saveResult.data;
        savedProduct.reserveInventory(savedProduct.inventory); // Consume all inventory

        const updateResult = await repository.update(savedProduct);
        expect(isSuccess(updateResult)).toBe(true);

        if (isSuccess(updateResult)) {
          expect(updateResult.data.isAvailable).toBe(false);
        }
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing product', async () => {
      const product = Product.create(
        {
          sku: SKU.create('PROD-DELETE'),
          title: 'To Delete',
          category: 'Electronics',
          actualPrice: Money.create(1000),
          sellingPrice: Money.create(800),
          inventory: Quantity.create(10),
          brand: 'TestBrand',
          description: 'Test description',
          images: ['image1.jpg'],
          productDetails: [],
          sellerId: '507f1f77bcf86cd799439011',

        },
        '507f1f77bcf86cd799439012'
      );

      const saveResult = await repository.save(product);
      expect(isSuccess(saveResult)).toBe(true);

      if (isSuccess(saveResult)) {
        const deleteResult = await repository.delete(saveResult.data.id);
        expect(isSuccess(deleteResult)).toBe(true);

        const found = await repository.findById(saveResult.data.id);
        expect(found).toBeNull();
      }
    });
  });

  describe('findBySellerId', () => {
    it('should find all products by seller', async () => {
      const sellerId = '507f1f77bcf86cd799439011';

      const product1 = Product.create(
        {
          sku: SKU.create('PROD-1-SKU'),
          title: 'Product 1',
          category: 'Electronics',
          actualPrice: Money.create(1000),
          sellingPrice: Money.create(800),
          inventory: Quantity.create(10),
          brand: 'TestBrand',
          description: 'Test description',
          images: ['img1.jpg'],
          productDetails: [],
          sellerId,

        },
        '507f1f77bcf86cd799439012'
      );

      const product2 = Product.create(
        {
          sku: SKU.create('PROD-2-SKU'),
          title: 'Product 2',
          category: 'Electronics',
          actualPrice: Money.create(2000),
          sellingPrice: Money.create(1800),
          inventory: Quantity.create(5),
          brand: 'TestBrand',
          description: 'Test description',
          images: ['img2.jpg'],
          productDetails: [],
          sellerId,

        },
        '507f1f77bcf86cd799439013'
      );

      await repository.save(product1);
      await repository.save(product2);

      const products = await repository.findBySellerId(sellerId);
      expect(products).toHaveLength(2);
    });
  });

  describe('count and findAll', () => {
    it('should count and retrieve all products', async () => {
      expect(await repository.count()).toBe(0);

      const product = Product.create(
        {
          sku: SKU.create('PROD-COUNT'),
          title: 'Count Test',
          category: 'Electronics',
          actualPrice: Money.create(1000),
          sellingPrice: Money.create(800),
          inventory: Quantity.create(10),
          brand: 'TestBrand',
          description: 'Test description',
          images: ['img.jpg'],
          productDetails: [],
          sellerId: '507f1f77bcf86cd799439011',

        },
        '507f1f77bcf86cd799439012'
      );

      await repository.save(product);
      expect(await repository.count()).toBe(1);

      const all = await repository.findAll();
      expect(all).toHaveLength(1);
    });
  });
});
