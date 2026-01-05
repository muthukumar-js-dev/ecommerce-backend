import { ProductAvailableSpecification } from '../../specifications/product-available.specification';
import { Product } from '../../aggregates/product.aggregate';
import { Quantity } from '../../value-objects/quantity.vo';
import { Money } from '../../value-objects/money.vo';
import { SKU } from '../../value-objects/sku.vo';

describe('ProductAvailableSpecification', () => {
  let spec: ProductAvailableSpecification;
  let product: Product;

  beforeEach(() => {
    spec = new ProductAvailableSpecification();
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

  it('should be satisfied for active product with inventory', () => {
    expect(spec.isSatisfiedBy(product)).toBe(true);
    expect(spec.getReason(product)).toBeNull();
  });

  it('should not be satisfied for inactive product', () => {
    product.deactivate();
    expect(spec.isSatisfiedBy(product)).toBe(false);
    expect(spec.getReason(product)).toBe('Product is not active');
  });

  it('should not be satisfied for out of stock product', () => {
    product.reserveInventory(Quantity.create(10)); // Reserves all 10
    expect(spec.isSatisfiedBy(product)).toBe(false);
    expect(spec.getReason(product)).toBe('Product is out of stock');
  });
});
