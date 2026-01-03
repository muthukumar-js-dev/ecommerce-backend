import { Entity } from '@shared/domain/entity';
import { ID, Email, Timestamp, UserRole } from '@shared/types/common';

export interface UserProps {
  name: string;
  email: Email;
  passwordHash: string;
  role: UserRole;
  token?: string;
  lastLogin?: Timestamp;
  currentOrder: number;
  returnedCount: number;
  stripeCustomerId?: string;
  shopName?: string;
  shopMobileNumber?: string;
  shopAddress?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id: ID) {
    super(props, id);
  }

  static create(props: Omit<UserProps, 'createdAt' | 'updatedAt'>, id: ID): User {
    const now = new Date();
    return new User(
      {
        ...props,
        currentOrder: props.currentOrder ?? 0,
        returnedCount: props.returnedCount ?? 0,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  // Getters
  get name(): string {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get token(): string | undefined {
    return this.props.token;
  }

  get lastLogin(): Timestamp | undefined {
    return this.props.lastLogin;
  }

  get currentOrder(): number {
    return this.props.currentOrder;
  }

  get returnedCount(): number {
    return this.props.returnedCount;
  }

  get stripeCustomerId(): string | undefined {
    return this.props.stripeCustomerId;
  }

  get shopName(): string | undefined {
    return this.props.shopName;
  }

  get shopMobileNumber(): string | undefined {
    return this.props.shopMobileNumber;
  }

  get shopAddress(): string | undefined {
    return this.props.shopAddress;
  }

  get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  get updatedAt(): Timestamp {
    return this.props.updatedAt;
  }

  get isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }

  get isSeller(): boolean {
    return this.props.role === UserRole.SELLER;
  }

  get isUser(): boolean {
    return this.props.role === UserRole.USER;
  }

  // Business methods
  updateLastLogin(): void {
    (this.props as { lastLogin?: Timestamp }).lastLogin = new Date();
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  incrementOrderCount(): void {
    (this.props as { currentOrder: number }).currentOrder += 1;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  decrementOrderCount(): void {
    (this.props as { currentOrder: number }).currentOrder = Math.max(
      0,
      this.props.currentOrder - 1
    );
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  incrementReturnedCount(): void {
    (this.props as { returnedCount: number }).returnedCount += 1;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  updateToken(token: string): void {
    (this.props as { token?: string }).token = token;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  clearToken(): void {
    (this.props as { token?: string }).token = undefined;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  setStripeCustomerId(customerId: string): void {
    (this.props as { stripeCustomerId?: string }).stripeCustomerId = customerId;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  updateShopDetails(details: {
    shopName?: string;
    shopMobileNumber?: string;
    shopAddress?: string;
  }): void {
    if (details.shopName !== undefined) {
      (this.props as { shopName?: string }).shopName = details.shopName;
    }
    if (details.shopMobileNumber !== undefined) {
      (this.props as { shopMobileNumber?: string }).shopMobileNumber =
        details.shopMobileNumber;
    }
    if (details.shopAddress !== undefined) {
      (this.props as { shopAddress?: string }).shopAddress = details.shopAddress;
    }
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }
}
