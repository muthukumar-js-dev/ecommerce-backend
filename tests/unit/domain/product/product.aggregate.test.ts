import { Product } from '@domain/product/aggregates/product.aggregate';
import { Money } from '@domain/product/value-objects/money.vo';
import { SKU } from '@domain/product/value-objects/sku.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';

describe('Product Aggregate', () => {
    describe('Creation', () => {
        it('should create a new product with valid data', () => {
            const product = createTestProduct();

            expect(product).toBeDefined();
            expect(product.id.value).toBe('prod-123');
            expect(product.title).toBe('Test Product');
            expect(product.sku.value).toBe('SKU-TEST-001');
            expect(product.sellingPrice.amount).toBe(100);
            expect(product.inventory.value).toBe(50);
        });

        it('should raise ProductCreated event on creation', () => {
            const product = createTestProduct();

            const events = product.domainEvents;
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('ProductCreated');
            expect(events[0].payload.productId).toBe('prod-123');
        });

        it('should validate selling price is not higher than actual price', () => {
            expect(() =>
                Product.create(
                    {
                        title: 'Test Product',
                        sku: SKU.create('SKU-001'),
                        description: 'Test description',
                        category: 'Electronics',
                        brand: 'TestBrand',
                        sellingPrice: Money.create(150),
                        actualPrice: Money.create(100), // Lower than selling price
                        inventory: Quantity.create(10),
                        sellerId: 'seller-123',
                        images: ['image1.jpg'],
                        productDetails: [],
                    },
                    'prod-123'
                )
            ).toThrow();
        });
    });

    describe('Inventory Management', () => {
        it('should reserve inventory successfully', () => {
            const product = createTestProduct();

            product.reserveInventory(Quantity.create(10));

            expect(product.inventory.value).toBe(40); // 50 - 10
        });

        it('should throw error when reserving more than available', () => {
            const product = createTestProduct();

            expect(() => product.reserveInventory(Quantity.create(100))).toThrow(
                'insufficient inventory'
            );
        });

        it('should restock inventory', () => {
            const product = createTestProduct();
            product.reserveInventory(Quantity.create(10));

            product.restockInventory(Quantity.create(20));

            expect(product.inventory.value).toBe(60); // 40 + 20
        });

        it('should check if product is available', () => {
            const product = createTestProduct();

            expect(product.isAvailable()).toBe(true);

            product.reserveInventory(Quantity.create(50));
            expect(product.isAvailable()).toBe(false);
        });

        it('should check if quantity is available', () => {
            const product = createTestProduct();

            expect(product.hasAvailableQuantity(Quantity.create(30))).toBe(true);
            expect(product.hasAvailableQuantity(Quantity.create(60))).toBe(false);
        });
    });

    describe('Pricing', () => {
        it('should update selling price', () => {
            const product = createTestProduct();

            product.updatePrice(Money.create(90), Money.create(120));

            expect(product.sellingPrice.amount).toBe(90);
            expect(product.actualPrice.amount).toBe(120);
        });

        it('should calculate discount percentage', () => {
            const product = createTestProduct();

            const discount = product.getDiscountPercentage();

            // Selling: 100, Actual: 120 => 16.67% discount
            expect(discount).toBeCloseTo(16.67, 1);
        });

        it('should return 0 discount when prices are equal', () => {
            const product = Product.create(
                {
                    title: 'Test Product',
                    sku: SKU.create('SKU-001'),
                    description: 'Test',
                    category: 'Electronics',
                    brand: 'TestBrand',
                    sellingPrice: Money.create(100),
                    actualPrice: Money.create(100),
                    inventory: Quantity.create(10),
                    sellerId: 'seller-123',
                    images: ['image1.jpg'],
                    productDetails: [],
                },
                'prod-123'
            );

            expect(product.getDiscountPercentage()).toBe(0);
        });
    });

    describe('Product Details', () => {
        it('should update product details', () => {
            const product = createTestProduct();

            product.updateDetails('Updated Title', 'Updated Description');

            expect(product.title).toBe('Updated Title');
            expect(product.description).toBe('Updated Description');
        });

        it('should add product images', () => {
            const product = createTestProduct();

            product.addImage('image2.jpg');

            expect(product.images).toContain('image2.jpg');
            expect(product.images.length).toBe(2);
        });

        it('should remove product images', () => {
            const product = createTestProduct();
            product.addImage('image2.jpg');

            product.removeImage('image1.jpg');

            expect(product.images).not.toContain('image1.jpg');
            expect(product.images.length).toBe(1);
        });
    });

    describe('Product Status', () => {
        it('should mark product as out of stock', () => {
            const product = createTestProduct();
            product.reserveInventory(Quantity.create(50));

            product.markOutOfStock();

            expect(product.isAvailable()).toBe(false);
        });

        it('should deactivate product', () => {
            const product = createTestProduct();

            product.deactivate();

            expect(product.isActive).toBe(false);
        });

        it('should activate product', () => {
            const product = createTestProduct();
            product.deactivate();

            product.activate();

            expect(product.isActive).toBe(true);
        });
    });
});

function createTestProduct(): Product {
    return Product.create(
        {
            title: 'Test Product',
            sku: SKU.create('SKU-TEST-001'),
            description: 'Test product description',
            category: 'Electronics',
            brand: 'TestBrand',
            sellingPrice: Money.create(100),
            actualPrice: Money.create(120),
            inventory: Quantity.create(50),
            sellerId: 'seller-123',
            images: ['image1.jpg'],
            productDetails: [
                { key: 'Color', value: 'Black' },
                { key: 'Size', value: 'Medium' },
            ],
        },
        'prod-123'
    );
}
