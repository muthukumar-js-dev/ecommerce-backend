import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';

export interface WishlistProps {
  userId: ID;
  name: string;
  productIds: ID[];
  status: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Wishlist extends Entity<WishlistProps> {
  private constructor(props: WishlistProps, id: ID) {
    super(props, id);
  }

  static create(props: Omit<WishlistProps, 'createdAt' | 'updatedAt'>, id: ID): Wishlist {
    const now = new Date();
    return new Wishlist(
      {
        ...props,
        name: props.name ?? 'New Folder',
        productIds: props.productIds ?? [],
        status: props.status ?? 1,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  get userId(): ID {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get productIds(): ID[] {
    return this.props.productIds;
  }

  get status(): number {
    return this.props.status;
  }

  get isActive(): boolean {
    return this.props.status === 1;
  }

  get itemCount(): number {
    return this.props.productIds.length;
  }

  get isEmpty(): boolean {
    return this.props.productIds.length === 0;
  }

  addProduct(productId: ID): void {
    if (!this.props.productIds.includes(productId)) {
      (this.props as { productIds: ID[] }).productIds.push(productId);
      (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
    }
  }

  removeProduct(productId: ID): void {
    const productIds = this.props.productIds.filter((id) => id !== productId);
    (this.props as { productIds: ID[] }).productIds = productIds;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  clear(): void {
    (this.props as { productIds: ID[] }).productIds = [];
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  rename(name: string): void {
    (this.props as { name: string }).name = name;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  deactivate(): void {
    (this.props as { status: number }).status = 0;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  activate(): void {
    (this.props as { status: number }).status = 1;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }
}
