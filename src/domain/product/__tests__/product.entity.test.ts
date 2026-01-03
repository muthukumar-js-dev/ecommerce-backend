import { Product } from '../entities/product.entity';

describe('Product Entity', () => {
  const validProps = {
    pid: 'PROD-001',
    title: 'Test Product',
    category: 'Electronics',
    actualPrice: 1000,
    sellingPrice: 800,
    brand: 'TestBrand',
    description: 'This is a test product description',
    averageRating: 4.5,
    discount: 20,
    outOfStock: false,
    images: ['image1.jpg', 'image2.jpg'],
    productDetails: [
      { key: 'Color', value: 'Black' },
      { key: 'Size', value: 'Medium' },
    ],
    sellerId: 'seller123',
  };

  describe('create', () => {
    it('should create a product entity with valid props', () => {
      const product = Product.create(validProps, '123');

      expect(product.id).toBe('123');
      expect(product.pid).toBe('PROD-001');
      expect(product.title).toBe('Test Product');
      expect(product.category).toBe('Electronics');
      expect(product.actualPrice).toBe(1000);
      expect(product.sellingPrice).toBe(800);
    });

    it('should set default values', () => {
      const propsWithoutDefaults = {
        ...validProps,
        averageRating: undefined,
        discount: undefined,
        outOfStock: undefined,
      };

      const product = Product.create(
        propsWithoutDefaults as unknown as typeof validProps,
        '456'
      );

      expect(product.averageRating).toBe(0);
      expect(product.discount).toBe(0);
      expect(product.outOfStock).toBe(false);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const product = Product.create(validProps, '123');

      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('computed properties', () => {
    it('should calculate isAvailable correctly', () => {
      const inStock = Product.create(
        { ...validProps, outOfStock: false },
        '123'
      );
      const outOfStock = Product.create(
        { ...validProps, outOfStock: true },
        '456'
      );

      expect(inStock.isAvailable).toBe(true);
      expect(outOfStock.isAvailable).toBe(false);
    });

    it('should calculate discountPercentage from discount field', () => {
      const product = Product.create({ ...validProps, discount: 25 }, '123');

      expect(product.discountPercentage).toBe(25);
    });

    it('should calculate discountPercentage from prices when discount is 0', () => {
      const product = Product.create(
        {
          ...validProps,
          actualPrice: 1000,
          sellingPrice: 750,
          discount: 0,
        },
        '123'
      );

      expect(product.discountPercentage).toBe(25);
    });

    it('should calculate savings correctly', () => {
      const product = Product.create(
        {
          ...validProps,
          actualPrice: 1000,
          sellingPrice: 700,
        },
        '123'
      );

      expect(product.savings).toBe(300);
    });

    it('should determine hasDiscount correctly', () => {
      const withDiscount = Product.create(
        {
          ...validProps,
          actualPrice: 1000,
          sellingPrice: 800,
        },
        '123'
      );
      const noDiscount = Product.create(
        {
          ...validProps,
          actualPrice: 1000,
          sellingPrice: 1000,
        },
        '456'
      );

      expect(withDiscount.hasDiscount).toBe(true);
      expect(noDiscount.hasDiscount).toBe(false);
    });
  });

  describe('business methods', () => {
    describe('markOutOfStock', () => {
      it('should mark product as out of stock', () => {
        const product = Product.create(
          { ...validProps, outOfStock: false },
          '123'
        );

        product.markOutOfStock();

        expect(product.outOfStock).toBe(true);
        expect(product.isAvailable).toBe(false);
      });
    });

    describe('markInStock', () => {
      it('should mark product as in stock', () => {
        const product = Product.create(
          { ...validProps, outOfStock: true },
          '123'
        );

        product.markInStock();

        expect(product.outOfStock).toBe(false);
        expect(product.isAvailable).toBe(true);
      });
    });

    describe('updateRating', () => {
      it('should update product rating', () => {
        const product = Product.create(validProps, '123');

        product.updateRating(4.8);

        expect(product.averageRating).toBe(4.8);
      });

      it('should throw error for rating below 0', () => {
        const product = Product.create(validProps, '123');

        expect(() => product.updateRating(-1)).toThrow(
          'Rating must be between 0 and 5'
        );
      });

      it('should throw error for rating above 5', () => {
        const product = Product.create(validProps, '123');

        expect(() => product.updateRating(6)).toThrow(
          'Rating must be between 0 and 5'
        );
      });
    });

    describe('updatePrice', () => {
      it('should update product prices', () => {
        const product = Product.create(validProps, '123');

        product.updatePrice(1200, 900);

        expect(product.actualPrice).toBe(1200);
        expect(product.sellingPrice).toBe(900);
      });

      it('should throw error for negative actual price', () => {
        const product = Product.create(validProps, '123');

        expect(() => product.updatePrice(-100, 50)).toThrow(
          'Prices cannot be negative'
        );
      });

      it('should throw error for negative selling price', () => {
        const product = Product.create(validProps, '123');

        expect(() => product.updatePrice(100, -50)).toThrow(
          'Prices cannot be negative'
        );
      });

      it('should throw error when selling price exceeds actual price', () => {
        const product = Product.create(validProps, '123');

        expect(() => product.updatePrice(100, 150)).toThrow(
          'Selling price cannot exceed actual price'
        );
      });
    });

    describe('image management', () => {
      it('should add image to product', () => {
        const product = Product.create(validProps, '123');
        const initialCount = product.images.length;

        product.addImage('image3.jpg');

        expect(product.images).toHaveLength(initialCount + 1);
        expect(product.images).toContain('image3.jpg');
      });

      it('should remove image from product', () => {
        const product = Product.create(validProps, '123');

        product.removeImage('image1.jpg');

        expect(product.images).not.toContain('image1.jpg');
        expect(product.images).toContain('image2.jpg');
      });
    });

    describe('addProductDetail', () => {
      it('should add product detail', () => {
        const product = Product.create(validProps, '123');
        const initialCount = product.productDetails.length;

        product.addProductDetail('Weight', '500g');

        expect(product.productDetails).toHaveLength(initialCount + 1);
        expect(product.productDetails).toContainEqual({
          key: 'Weight',
          value: '500g',
        });
      });
    });

    describe('setStripeId', () => {
      it('should set Stripe product ID', () => {
        const product = Product.create(validProps, '123');

        product.setStripeId('prod_stripe123');

        expect(product.stripeId).toBe('prod_stripe123');
      });
    });
  });

  describe('getters', () => {
    it('should expose all properties via getters', () => {
      const product = Product.create(
        {
          ...validProps,
          images: ['image1.jpg', 'image2.jpg'], // Fresh array to avoid mutation
          productDetails: [
            { key: 'Color', value: 'Black' },
            { key: 'Size', value: 'Medium' },
          ], // Fresh array to avoid mutation
          subCategory: 'Smartphones',
          stripeId: 'prod_123',
          url: 'https://example.com/product',
        },
        '123'
      );

      expect(product.pid).toBe('PROD-001');
      expect(product.title).toBe('Test Product');
      expect(product.category).toBe('Electronics');
      expect(product.actualPrice).toBe(1000);
      expect(product.sellingPrice).toBe(800);
      expect(product.brand).toBe('TestBrand');
      expect(product.description).toBe('This is a test product description');
      expect(product.averageRating).toBe(4.5);
      expect(product.discount).toBe(20);
      expect(product.outOfStock).toBe(false);
      expect(product.images).toEqual(['image1.jpg', 'image2.jpg']);
      expect(product.productDetails).toHaveLength(2);
      expect(product.sellerId).toBe('seller123');
      expect(product.subCategory).toBe('Smartphones');
      expect(product.stripeId).toBe('prod_123');
      expect(product.url).toBe('https://example.com/product');
    });
  });
});
