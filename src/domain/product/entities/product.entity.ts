import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';

export interface ProductDetail {
  key: string;
  value: string;
}

export interface ProductProps {
  pid: string;
  title: string;
  category: string;
  actualPrice: number;
  sellingPrice: number;
  brand: string;
  description: string;
  averageRating: number;
  discount: number;
  outOfStock: boolean;
  images: string[];
  productDetails: ProductDetail[];
  sellerId: ID;
  subCategory?: string;
  stripeId?: string;
  url?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Product extends Entity<ProductProps> {
  private constructor(props: ProductProps, id: ID) {
    super(props, id);
  }

  static create(
    props: Omit<ProductProps, 'createdAt' | 'updatedAt'>,
    id: ID
  ): Product {
    const now = new Date();
    return new Product(
      {
        ...props,
        averageRating: props.averageRating ?? 0,
        discount: props.discount ?? 0,
        outOfStock: props.outOfStock ?? false,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  // Getters
  get pid(): string {
    return this.props.pid;
  }

  get title(): string {
    return this.props.title;
  }

  get category(): string {
    return this.props.category;
  }

  get actualPrice(): number {
    return this.props.actualPrice;
  }

  get sellingPrice(): number {
    return this.props.sellingPrice;
  }

  get brand(): string {
    return this.props.brand;
  }

  get description(): string {
    return this.props.description;
  }

  get averageRating(): number {
    return this.props.averageRating;
  }

  get discount(): number {
    return this.props.discount;
  }

  get outOfStock(): boolean {
    return this.props.outOfStock;
  }

  get images(): string[] {
    return this.props.images;
  }

  get productDetails(): ProductDetail[] {
    return this.props.productDetails;
  }

  get sellerId(): ID {
    return this.props.sellerId;
  }

  get subCategory(): string | undefined {
    return this.props.subCategory;
  }

  get stripeId(): string | undefined {
    return this.props.stripeId;
  }

  get url(): string | undefined {
    return this.props.url;
  }

  get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  get updatedAt(): Timestamp {
    return this.props.updatedAt;
  }

  // Computed properties
  get isAvailable(): boolean {
    return !this.props.outOfStock;
  }

  get discountPercentage(): number {
    if (this.props.discount > 0) {
      return this.props.discount;
    }
    if (this.props.actualPrice > 0 && this.props.sellingPrice > 0) {
      return Math.round(
        ((this.props.actualPrice - this.props.sellingPrice) /
          this.props.actualPrice) *
          100
      );
    }
    return 0;
  }

  get savings(): number {
    return this.props.actualPrice - this.props.sellingPrice;
  }

  get hasDiscount(): boolean {
    return this.savings > 0;
  }

  // Business methods
  markOutOfStock(): void {
    (this.props as { outOfStock: boolean }).outOfStock = true;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  markInStock(): void {
    (this.props as { outOfStock: boolean }).outOfStock = false;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  updateRating(newRating: number): void {
    if (newRating < 0 || newRating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    (this.props as { averageRating: number }).averageRating = newRating;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  updatePrice(actualPrice: number, sellingPrice: number): void {
    if (actualPrice < 0 || sellingPrice < 0) {
      throw new Error('Prices cannot be negative');
    }
    if (sellingPrice > actualPrice) {
      throw new Error('Selling price cannot exceed actual price');
    }
    (this.props as { actualPrice: number }).actualPrice = actualPrice;
    (this.props as { sellingPrice: number }).sellingPrice = sellingPrice;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  addImage(imageUrl: string): void {
    (this.props as { images: string[] }).images.push(imageUrl);
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  removeImage(imageUrl: string): void {
    const images = this.props.images.filter((img) => img !== imageUrl);
    (this.props as { images: string[] }).images = images;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  addProductDetail(key: string, value: string): void {
    (this.props as { productDetails: ProductDetail[] }).productDetails.push({
      key,
      value,
    });
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  setStripeId(stripeId: string): void {
    (this.props as { stripeId?: string }).stripeId = stripeId;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }
}
