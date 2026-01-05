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
  url?: string;
  stripeId?: string;
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
        isActive: true, // Active by default on creation? Or draft? Assuming active for now.
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
        brand: props.brand,
        description: props.description,
        images: props.images,
        createdAt: now,
      })
    );

    return product;
  }

  static reconstitute(props: ProductProps, id: ID): Product {
    return new Product(props, id);
  }

  // Getters
  get sku(): SKU {
    return this.props.sku;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
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

  get images(): string[] {
    return this.props.images;
  }

  get sellerId(): ID {
    return this.props.sellerId;
  }

  get discountPercentage(): number {
    if (this.props.actualPrice.amount === 0) return 0;
    const discount = this.props.actualPrice.subtract(this.props.sellingPrice);
    return Math.round((discount.amount / this.props.actualPrice.amount) * 100);
  }

  get averageRating(): number {
    return this.props.averageRating || 0;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get url(): string | undefined {
    return this.props.url;
  }

  get stripeId(): string | undefined {
    return this.props.stripeId;
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

  updateDetails(title: string, description: string): void {
    if (title.trim().length < 3) throw new BusinessRuleError('Title too short', 'INVALID_TITLE');
    this.props.title = title;
    this.props.description = description;
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

    if (!this.props.images || this.props.images.length === 0) {
      throw new BusinessRuleError(
        'Product must have at least one image',
        'NO_IMAGES'
      );
    }
  }
}
