import { ProductRepository } from '../../src/infrastructure/database/mongodb/repositories/product.repository';
import { Product } from '../../src/domain/product/entities/product.entity';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../utils/test-helpers';
import { isSuccess } from '../../src/shared/types/result';

describe('ProductRepository Integration Tests', () => {
  let repository: ProductRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new ProductRepository();
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
          pid: 'PROD-001',
          title: 'Test Product',
          category: 'Electronics',
          actualPrice: 1000,
          sellingPrice: 800,
          brand: 'TestBrand',
          description: 'Test description for product',
          averageRating: 4.5,
          discount: 20,
          outOfStock: false,
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

  describe('findByPid', () => {
    it('should find product by PID', async () => {
      const product = Product.create(
        {
          pid: 'UNIQUE-PID-123',
          title: 'Test Product',
          category: 'Electronics',
          actualPrice: 1000,
          sellingPrice: 800,
          brand: 'TestBrand',
          description: 'Test description',
          averageRating: 0,
          discount: 0,
          outOfStock: false,
          images: ['image1.jpg'],
          productDetails: [],
          sellerId: '507f1f77bcf86cd799439011',
        },
        '507f1f77bcf86cd799439012'
      );

      await repository.save(product);
      const found = await repository.findByPid('UNIQUE-PID-123');

      expect(found).not.toBeNull();
      expect(found?.pid).toBe('UNIQUE-PID-123');
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const product = Product.create(
        {
          pid: 'PROD-UPDATE',
          title: 'Original Title',
          category: 'Electronics',
          actualPrice: 1000,
          sellingPrice: 800,
          brand: 'TestBrand',
          description: 'Test description',
          averageRating: 0,
          discount: 0,
          outOfStock: false,
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
        savedProduct.markOutOfStock();

        const updateResult = await repository.update(savedProduct);
        expect(isSuccess(updateResult)).toBe(true);

        if (isSuccess(updateResult)) {
          expect(updateResult.data.outOfStock).toBe(true);
        }
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing product', async () => {
      const product = Product.create(
        {
          pid: 'PROD-DELETE',
          title: 'To Delete',
          category: 'Electronics',
          actualPrice: 1000,
          sellingPrice: 800,
          brand: 'TestBrand',
          description: 'Test description',
          averageRating: 0,
          discount: 0,
          outOfStock: false,
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
          pid: 'PROD-1',
          title: 'Product 1',
          category: 'Electronics',
          actualPrice: 1000,
          sellingPrice: 800,
          brand: 'TestBrand',
          description: 'Test description',
          averageRating: 0,
          discount: 0,
          outOfStock: false,
          images: ['img1.jpg'],
          productDetails: [],
          sellerId,
        },
        '507f1f77bcf86cd799439012'
      );

      const product2 = Product.create(
        {
          pid: 'PROD-2',
          title: 'Product 2',
          category: 'Electronics',
          actualPrice: 2000,
          sellingPrice: 1800,
          brand: 'TestBrand',
          description: 'Test description',
          averageRating: 0,
          discount: 0,
          outOfStock: false,
          images: ['img2.jpg'],
          productDetails: [],
          sellerId,
        },
        '507f1f77bcf86cd799439013'
      );

      const save1 = await repository.save(product1);
      expect(isSuccess(save1)).toBe(true);

      const save2 = await repository.save(product2);
      expect(isSuccess(save2)).toBe(true);

      const products = await repository.findBySellerId(sellerId);
      expect(products).toHaveLength(2);
    });
  });

  describe('count and findAll', () => {
    it('should count and retrieve all products', async () => {
      expect(await repository.count()).toBe(0);

      const product = Product.create(
        {
          pid: 'PROD-COUNT',
          title: 'Count Test',
          category: 'Electronics',
          actualPrice: 1000,
          sellingPrice: 800,
          brand: 'TestBrand',
          description: 'Test description',
          averageRating: 0,
          discount: 0,
          outOfStock: false,
          images: ['img.jpg'],
          productDetails: [],
          sellerId: '507f1f77bcf86cd799439011',
        },
        '507f1f77bcf86cd799439012'
      );

      const saveResult = await repository.save(product);
      expect(isSuccess(saveResult)).toBe(true);
      expect(await repository.count()).toBe(1);

      const all = await repository.findAll();
      expect(all).toHaveLength(1);
    });
  });
});
