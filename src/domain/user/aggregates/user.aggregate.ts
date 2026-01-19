import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { ID, UserRole, Timestamp } from '../../../shared/types/common';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { UserRegistered } from '../events/user-registered.event';
import { UserLoggedIn } from '../events/user-logged-in.event';
import { UserRoleChanged } from '../events/user-role-changed.event';
import { BusinessRuleError } from '../../../shared/errors';

export interface UserProps {
  name: string;
  email: Email;
  password: Password;
  role: UserRole;
  phoneNumber?: PhoneNumber;
  lastLogin?: Timestamp;
  currentOrderCount: number;
  returnedOrderCount: number;
  stripeCustomerId?: string;
  shopName?: string;
  shopAddress?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * User Aggregate Root
 * Encapsulates all business logic related to users
 */
export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id: ID) {
    super(props, id);
  }

  static create(
    props: Omit<UserProps, 'createdAt' | 'updatedAt' | 'isActive' | 'currentOrderCount' | 'returnedOrderCount'>,
    id: ID
  ): User {
    const now = new Date();
    const user = new User(
      {
        ...props,
        currentOrderCount: 0,
        returnedOrderCount: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      id
    );

    // Raise domain event
    user.addDomainEvent(
      new UserRegistered({
        userId: id,
        email: props.email.value,
        name: props.name,
        role: props.role,
        registeredAt: now,
      })
    );

    return user;
  }

  /**
   * Reconstitute user from persistence
   */
  static reconstitute(props: UserProps, id: ID): User {
    return new User(props, id);
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

  get isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }

  get isSeller(): boolean {
    return this.props.role === UserRole.SELLER;
  }

  get isCustomer(): boolean {
    return this.props.role === UserRole.USER;
  }

  get currentOrderCount(): number {
    return this.props.currentOrderCount;
  }

  get returnedOrderCount(): number {
    return this.props.returnedOrderCount;
  }

  get canPlaceOrder(): boolean {
    return this.props.isActive && this.props.currentOrderCount < 50;
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

  get lastLogin(): Date | undefined {
    return this.props.lastLogin;
  }

  get stripeCustomerId(): string | undefined {
    return this.props.stripeCustomerId;
  }

  get shopName(): string | undefined {
    return this.props.shopName;
  }

  get shopAddress(): string | undefined {
    return this.props.shopAddress;
  }

  get password(): Password {
    return this.props.password;
  }

  get phoneNumber(): PhoneNumber | undefined {
    return this.props.phoneNumber;
  }

  // Business methods
  changeEmail(newEmail: Email): void {
    this.props.email = newEmail;
    this.props.updatedAt = new Date();
    // Raise event? UserEmailChanged
  }

  async verifyPassword(plainPassword: string): Promise<boolean> {
    return this.props.password.compare(plainPassword);
  }

  recordLogin(ipAddress?: string, userAgent?: string): void {
    this.props.lastLogin = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new UserLoggedIn({
        userId: this.id,
        email: this.props.email.value,
        loginAt: this.props.lastLogin,
        ipAddress,
        userAgent,
      })
    );
  }

  changeRole(newRole: UserRole, changedBy: ID): void {
    if (newRole === UserRole.SELLER && !this.hasSellerDetails()) {
      throw new BusinessRuleError(
        'Cannot change role to seller without shop details',
        'SELLER_DETAILS_REQUIRED'
      );
    }

    const previousRole = this.props.role;
    this.props.role = newRole;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new UserRoleChanged({
        userId: this.id,
        previousRole,
        newRole,
        changedAt: new Date(),
        changedBy,
      })
    );
  }

  updateProfile(name: string, phoneNumber?: PhoneNumber): void {
    if (name && name.trim().length >= 2) {
      this.props.name = name;
    }

    if (phoneNumber) {
      this.props.phoneNumber = phoneNumber;
    }

    this.props.updatedAt = new Date();
  }

  updateSellerDetails(shopName: string, shopAddress: string): void {
    if (!this.isSeller && this.props.role !== UserRole.USER) {
      throw new BusinessRuleError(
        'Only sellers can have shop details',
        'NOT_A_SELLER'
      );
    }

    this.props.shopName = shopName;
    this.props.shopAddress = shopAddress;
    this.props.updatedAt = new Date();
  }

  incrementOrderCount(): void {
    if (!this.canPlaceOrder) {
      throw new BusinessRuleError(
        'User has reached maximum order limit',
        'MAX_ORDERS_REACHED'
      );
    }

    this.props.currentOrderCount += 1;
    this.props.updatedAt = new Date();
  }

  decrementOrderCount(): void {
    this.props.currentOrderCount = Math.max(0, this.props.currentOrderCount - 1);
    this.props.updatedAt = new Date();
  }

  incrementReturnCount(): void {
    this.props.returnedOrderCount += 1;
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

  setStripeCustomerId(customerId: string): void {
    this.props.stripeCustomerId = customerId;
    this.props.updatedAt = new Date();
  }

  private hasSellerDetails(): boolean {
    return !!this.props.shopName && !!this.props.shopAddress;
  }

  // Validation
  validate(): void {
    if (!this.props.name || this.props.name.trim().length < 2) {
      throw new BusinessRuleError('Name must be at least 2 characters', 'INVALID_NAME');
    }

    if (this.props.currentOrderCount < 0) {
      throw new BusinessRuleError('Order count cannot be negative', 'INVALID_ORDER_COUNT');
    }

    if (this.props.returnedOrderCount < 0) {
      throw new BusinessRuleError('Return count cannot be negative', 'INVALID_RETURN_COUNT');
    }
  }
}
