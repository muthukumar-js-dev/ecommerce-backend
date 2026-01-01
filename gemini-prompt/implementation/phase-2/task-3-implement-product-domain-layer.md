# Phase 2 - Task 3: Implement Domain Layer (Product Context)

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Task 2 (User Domain Layer)

---

## Objective

Implement a rich domain model for the Product Catalog context including product aggregates, inventory management, pricing rules, and product-related domain events.

---

## Context

The Product Catalog context is responsible for:
- Product information management
- Inventory tracking
- Pricing and discount management
- Category and brand organization
- Product availability rules

---

## Implementation Steps

### Step 1: Create Value Objects

**Create `src/domain/product/value-objects/money.vo.ts`:**

```typescript
import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';
import { Currency } from '@shared/types/common';

interface MoneyProps {
  amount: number;
  currency: Currency;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static create(amount: number, currency: Currency = 'INR'): Money {
    if (amount < 0) {
      throw new ValidationError('Invalid amount', [
        { field: 'amount', message: 'Amount cannot be negative' },
      ]);
    }

    return new Money({ amount: Math.round(amount * 100) / 100, currency });
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): Currency {
    return this.props.currency;
  }

  get formatted(): string {
    const symbol = this.getCurrencySymbol();
    return `${symbol}${this.props.amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return Money.create(this.amount * factor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new ValidationError('Currency mismatch', [
        { field: 'currency', message: 'Cannot operate on different currencies' },
      ]);
    }
  }

  private getCurrencySymbol(): string {
    const symbols: Record<Currency, string> = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    return symbols[this.currency] || this.currency;
  }
}
```

**Create `src/domain/product/value-objects/sku.vo.ts`:**

```typescript
import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface SKUProps {
  value: string;
}

export class SKU extends ValueObject<SKUProps> {
  private static readonly PATTERN = /^[A-Z0-9]{6,12}$/;

  private constructor(props: SKUProps) {
    super(props);
  }

  static create(value: string): SKU {
    const normalized = value.toUpperCase().trim();

    if (!this.PATTERN.test(normalized)) {
      throw new ValidationError('Invalid SKU format', [
        {
          field: 'sku',
          message: 'SKU must be 6-12 alphanumeric characters',
        },
      ]);
    }

    return new SKU({ value: normalized });
  }

  static generate(category: string, sequence: number): SKU {
    const categoryCode = category.substring(0, 3).toUpperCase();
    const sequenceStr = sequence.toString().padStart(6, '0');
    return new SKU({ value: `${categoryCode}${sequenceStr}` });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}
```

**Create `src/domain/product/value-objects/quantity.vo.ts`:**

```typescript
import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface QuantityProps {
  value: number;
}

export class Quantity extends ValueObject<QuantityProps> {
  private constructor(props: QuantityProps) {
    super(props);
  }

  static create(value: number): Quantity {
    if (value < 0) {
      throw new ValidationError('Invalid quantity', [
        { field: 'quantity', message: 'Quantity cannot be negative' },
      ]);
    }

    if (!Number.isInteger(value)) {
      throw new ValidationError('Invalid quantity', [
        { field: 'quantity', message: 'Quantity must be a whole number' },
      ]);
    }

    return new Quantity({ value });
  }

  static zero(): Quantity {
    return new Quantity({ value: 0 });
  }

  get value(): number {
    return this.props.value;
  }

  get isZero(): boolean {
    return this.value === 0;
  }

  get isAvailable(): boolean {
    return this.value > 0;
  }

  add(other: Quantity): Quantity {
    return Quantity.create(this.value + other.value);
  }

  subtract(other: Quantity): Quantity {
    return Quantity.create(this.value - other.value);
  }

  isGreaterThan(other: Quantity): boolean {
    return this.value > other.value;
  }
}
```

### Step 2: Create Domain Events

**Create `src/domain/product/events/product-created.event.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface ProductCreatedPayload {
  productId: ID;
  sku: string;
  title: string;
  category: string;
  price: number;
  sellerId: ID;
  createdAt: Date;
}

export class ProductCreated extends DomainEvent<ProductCreatedPayload> {
  constructor(payload: ProductCreatedPayload) {
    super('ProductCreated', payload, 1);
  }
}
```

**Create `src/domain/product/events/product-out-of-stock.event.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface ProductOutOfStockPayload {
  productId: ID;
  sku: string;
  title: string;
  occurredAt: Date;
}

export class ProductOutOfStock extends DomainEvent<ProductOutOfStockPayload> {
  constructor(payload: ProductOutOfStockPayload) {
    super('ProductOutOfStock', payload, 1);
  }
}
```

**Create `src/domain/product/events/price-changed.event.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface PriceChangedPayload {
  productId: ID;
  sku: string;
  previousPrice: number;
  newPrice: number;
  changedAt: Date;
  changedBy: ID;
}

export class PriceChanged extends DomainEvent<PriceChangedPayload> {
  constructor(payload: PriceChangedPayload) {
    super('PriceChanged', payload, 1);
  }
}
```

### Step 3: Create Product Aggregate

**Create `src/domain/product/aggregates/product.aggregate.ts`:**

```typescript
import { AggregateRoot } from '@shared/domain/aggregate-root';
import { ID, Timestamp } from '@shared/types/common';
import { Money } from '../value-objects/money.vo';
import { SKU } from '../value-objects/sku.vo';
import { Quantity } from '../value-objects/quantity.vo';
import { ProductCreated } from '../events/product-created.event';
import { ProductOutOfStock } from '../events/product-out-of-stock.event';
import { PriceChanged } from '../events/price-changed.event';
import { BusinessRuleError } from '@shared/errors';

export interface ProductProps {
  sku: SKU;
  title: string;
  description: string;
  category: string;
  brand: string;
  actualPrice: Money;
  sellingPrice: Money;
  inventory: Quantity;
  images: string[];
  productDetails: Array<{ key: string; value: string }>;
  sellerId: ID;
  subCategory?: string;
  averageRating?: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Product extends AggregateRoot<ProductProps> {
  private constructor(props: ProductProps, id: ID) {
    super(props, id);
  }

  static create(
    props: Omit<ProductProps, 'createdAt' | 'updatedAt' | 'isActive' | 'averageRating'>,
    id: ID
  ): Product {
    const now = new Date();
    const product = new Product(
      {
        ...props,
        isActive: true,
        averageRating: 0,
        createdAt: now,
        updatedAt: now,
      },
      id
    );

    // Validate business rules
    product.validate();

    // Raise domain event
    product.addDomainEvent(
      new ProductCreated({
        productId: id,
        sku: props.sku.value,
        title: props.title,
        category: props.category,
        price: props.sellingPrice.amount,
        sellerId: props.sellerId,
        createdAt: now,
      })
    );

    return product;
  }

  // Getters
  get sku(): SKU {
    return this.props.sku;
  }

  get title(): string {
    return this.props.title;
  }

  get sellingPrice(): Money {
    return this.props.sellingPrice;
  }

  get actualPrice(): Money {
    return this.props.actualPrice;
  }

  get inventory(): Quantity {
    return this.props.inventory;
  }

  get isAvailable(): boolean {
    return this.props.isActive && this.props.inventory.isAvailable;
  }

  get discountPercentage(): number {
    const discount = this.props.actualPrice.subtract(this.props.sellingPrice);
    return Math.round((discount.amount / this.props.actualPrice.amount) * 100);
  }

  // Business methods
  updatePrice(newPrice: Money, changedBy: ID): void {
    if (newPrice.isGreaterThan(this.props.actualPrice)) {
      throw new BusinessRuleError(
        'Selling price cannot be greater than actual price',
        'INVALID_PRICE'
      );
    }

    const previousPrice = this.props.sellingPrice.amount;
    this.props.sellingPrice = newPrice;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new PriceChanged({
        productId: this.id,
        sku: this.props.sku.value,
        previousPrice,
        newPrice: newPrice.amount,
        changedAt: new Date(),
        changedBy,
      })
    );
  }

  reserveInventory(quantity: Quantity): void {
    if (quantity.isGreaterThan(this.props.inventory)) {
      throw new BusinessRuleError(
        'Insufficient inventory',
        'INSUFFICIENT_INVENTORY'
      );
    }

    this.props.inventory = this.props.inventory.subtract(quantity);
    this.props.updatedAt = new Date();

    if (this.props.inventory.isZero) {
      this.addDomainEvent(
        new ProductOutOfStock({
          productId: this.id,
          sku: this.props.sku.value,
          title: this.props.title,
          occurredAt: new Date(),
        })
      );
    }
  }

  restockInventory(quantity: Quantity): void {
    this.props.inventory = this.props.inventory.add(quantity);
    this.props.updatedAt = new Date();
  }

  updateRating(newRating: number): void {
    if (newRating < 0 || newRating > 5) {
      throw new BusinessRuleError('Rating must be between 0 and 5', 'INVALID_RATING');
    }

    this.props.averageRating = newRating;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  // Validation
  validate(): void {
    if (!this.props.title || this.props.title.trim().length < 3) {
      throw new BusinessRuleError(
        'Product title must be at least 3 characters',
        'INVALID_TITLE'
      );
    }

    if (this.props.sellingPrice.isGreaterThan(this.props.actualPrice)) {
      throw new BusinessRuleError(
        'Selling price cannot exceed actual price',
        'INVALID_PRICE'
      );
    }

    if (this.props.images.length === 0) {
      throw new BusinessRuleError(
        'Product must have at least one image',
        'NO_IMAGES'
      );
    }
  }
}
```

### Step 4: Create Domain Services

**Create `src/domain/product/services/pricing.service.ts`:**

```typescript
import { Money } from '../value-objects/money.vo';

export class PricingService {
  calculateDiscount(actualPrice: Money, sellingPrice: Money): number {
    const discount = actualPrice.subtract(sellingPrice);
    return Math.round((discount.amount / actualPrice.amount) * 100);
  }

  applyDiscountPercentage(price: Money, discountPercent: number): Money {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    const discountAmount = price.amount * (discountPercent / 100);
    return Money.create(price.amount - discountAmount, price.currency);
  }

  calculateBulkDiscount(price: Money, quantity: number): Money {
    let discountPercent = 0;

    if (quantity >= 10 && quantity < 50) {
      discountPercent = 5;
    } else if (quantity >= 50 && quantity < 100) {
      discountPercent = 10;
    } else if (quantity >= 100) {
      discountPercent = 15;
    }

    return this.applyDiscountPercentage(price, discountPercent);
  }
}
```

**Create `src/domain/product/services/inventory.service.ts`:**

```typescript
import { Product } from '../aggregates/product.aggregate';
import { Quantity } from '../value-objects/quantity.vo';
import { BusinessRuleError } from '@shared/errors';

export class InventoryService {
  canFulfillOrder(product: Product, requestedQuantity: Quantity): boolean {
    return product.isAvailable && !requestedQuantity.isGreaterThan(product.inventory);
  }

  calculateReorderPoint(averageDailySales: number, leadTimeDays: number): Quantity {
    const reorderPoint = Math.ceil(averageDailySales * leadTimeDays * 1.5); // 50% safety stock
    return Quantity.create(reorderPoint);
  }

  needsRestock(currentInventory: Quantity, reorderPoint: Quantity): boolean {
    return currentInventory.isLessThan(reorderPoint);
  }
}
```

### Step 5: Create Specifications

**Create `src/domain/product/specifications/product-available.spec.ts`:**

```typescript
import { Specification } from '@shared/domain/specification';
import { Product } from '../aggregates/product.aggregate';

export class ProductAvailableSpecification implements Specification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.isAvailable;
  }

  getReason(product: Product): string | null {
    if (!product.isAvailable) {
      if (!(product as any).props.isActive) {
        return 'Product is not active';
      }
      if (product.inventory.isZero) {
        return 'Product is out of stock';
      }
    }
    return null;
  }
}
```

---

## Testing Requirements

**Create `src/domain/product/__tests__/product.aggregate.test.ts`:**

```typescript
import { Product } from '../aggregates/product.aggregate';
import { Money } from '../value-objects/money.vo';
import { SKU } from '../value-objects/sku.vo';
import { Quantity } from '../value-objects/quantity.vo';

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
      expect(product.domainEvents[0].eventName).toBe('ProductCreated');
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
      expect(product.domainEvents[0].eventName).toBe('ProductOutOfStock');
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

      product.updatePrice(Money.create(750), 'admin-123');

      expect(product.sellingPrice.amount).toBe(750);
      expect(product.domainEvents).toHaveLength(1);
      expect(product.domainEvents[0].eventName).toBe('PriceChanged');
    });
  });

  describe('discountPercentage', () => {
    it('should calculate discount correctly', () => {
      const product = Product.create(validProps, 'prod-123');

      expect(product.discountPercentage).toBe(20); // (1000-800)/1000 * 100
    });
  });
});
```

---

## Deliverables

- [ ] Value objects (Money, SKU, Quantity)
- [ ] Domain events (ProductCreated, ProductOutOfStock, PriceChanged)
- [ ] Product aggregate with business logic
- [ ] Domain services (Pricing, Inventory)
- [ ] Specifications
- [ ] Unit tests (90%+ coverage)
- [ ] Integration with repository
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 4: Implement Domain Layer (Order Context)**
2. Integrate with CQRS pattern
3. Create read models for product queries

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
