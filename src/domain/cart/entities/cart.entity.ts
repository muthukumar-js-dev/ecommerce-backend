import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';

export interface CartItem {
  productId: ID;
  quantity: number;
  later: boolean;
}

export interface CartProps {
  userId: ID;
  items: CartItem[];
  totalAmount: number;
  totalActualAmount: number;
  totalDiscount: number;
  currency: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Cart extends Entity<CartProps> {
  private constructor(props: CartProps, id: ID) {
    super(props, id);
  }

  static create(props: Omit<CartProps, 'createdAt' | 'updatedAt'>, id: ID): Cart {
    const now = new Date();
    return new Cart(
      {
        ...props,
        items: props.items ?? [],
        totalAmount: props.totalAmount ?? 0,
        totalActualAmount: props.totalActualAmount ?? 0,
        totalDiscount: props.totalDiscount ?? 0,
        currency: props.currency ?? 'INR',
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  get userId(): ID {
    return this.props.userId;
  }

  get items(): CartItem[] {
    return this.props.items;
  }

  get totalAmount(): number {
    return this.props.totalAmount;
  }

  get totalActualAmount(): number {
    return this.props.totalActualAmount;
  }

  get totalDiscount(): number {
    return this.props.totalDiscount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get itemCount(): number {
    return this.props.items.length;
  }

  get isEmpty(): boolean {
    return this.props.items.length === 0;
  }

  addItem(productId: ID, quantity: number): void {
    const existingItem = this.props.items.find((item) => item.productId === productId);
    if (existingItem !== undefined) {
      (existingItem as { quantity: number }).quantity += quantity;
    } else {
      (this.props as { items: CartItem[] }).items.push({
        productId,
        quantity,
        later: false,
      });
    }
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  removeItem(productId: ID): void {
    const items = this.props.items.filter((item) => item.productId !== productId);
    (this.props as { items: CartItem[] }).items = items;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  updateQuantity(productId: ID, quantity: number): void {
    const item = this.props.items.find((item) => item.productId === productId);
    if (item !== undefined) {
      (item as { quantity: number }).quantity = quantity;
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  moveToLater(productId: ID): void {
    const item = this.props.items.find((item) => item.productId === productId);
    if (item !== undefined) {
      (item as { later: boolean }).later = true;
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  moveToCart(productId: ID): void {
    const item = this.props.items.find((item) => item.productId === productId);
    if (item !== undefined) {
      (item as { later: boolean }).later = false;
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  clear(): void {
    (this.props as { items: CartItem[] }).items = [];
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  updateTotals(totalAmount: number, totalActualAmount: number): void {
    (this.props as { totalAmount: number }).totalAmount = totalAmount;
    (this.props as { totalActualAmount: number }).totalActualAmount = totalActualAmount;
    (this.props as { totalDiscount: number }).totalDiscount = totalActualAmount - totalAmount;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }
}
