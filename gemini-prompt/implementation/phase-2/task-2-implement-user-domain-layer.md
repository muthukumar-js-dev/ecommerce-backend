# Phase 2 - Task 2: Implement Domain Layer (User Context)

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Task 1 (Bounded Contexts Defined)

---

## Objective

Implement a rich domain model for the User Management context using DDD patterns including aggregates, value objects, domain services, specifications, and domain events.

---

## Context

Transform the anemic User entity from Phase 1 into a rich domain model with:
- Business logic encapsulated in the domain
- Value objects for type safety
- Domain events for integration
- Specifications for complex queries
- Domain services for cross-aggregate operations

---

## Implementation Steps

### Step 1: Create Value Objects

**Create `src/domain/user/value-objects/email.vo.ts`:**

```typescript
import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(email: string): Email {
    if (!this.isValid(email)) {
      throw new ValidationError('Invalid email format', [
        { field: 'email', message: 'Email must be a valid email address' },
      ]);
    }

    return new Email({ value: email.toLowerCase().trim() });
  }

  private static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  get value(): string {
    return this.props.value;
  }

  get domain(): string {
    return this.props.value.split('@')[1];
  }

  get localPart(): string {
    return this.props.value.split('@')[0];
  }

  toString(): string {
    return this.value;
  }
}
```

**Create `src/domain/user/value-objects/password.vo.ts`:**

```typescript
import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';
import bcrypt from 'bcrypt';

interface PasswordProps {
  hashedValue: string;
}

export class Password extends ValueObject<PasswordProps> {
  private static readonly MIN_LENGTH = 8;
  private static readonly SALT_ROUNDS = 10;

  private constructor(props: PasswordProps) {
    super(props);
  }

  static async create(plainPassword: string): Promise<Password> {
    this.validate(plainPassword);
    const hashedValue = await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
    return new Password({ hashedValue });
  }

  static fromHash(hashedValue: string): Password {
    return new Password({ hashedValue });
  }

  private static validate(password: string): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!password || password.length < this.MIN_LENGTH) {
      errors.push({
        field: 'password',
        message: `Password must be at least ${this.MIN_LENGTH} characters`,
      });
    }

    if (!/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
      });
    }

    if (!/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
      });
    }

    if (!/[0-9]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Password validation failed', errors);
    }
  }

  async compare(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.props.hashedValue);
  }

  get hash(): string {
    return this.props.hashedValue;
  }
}
```

**Create `src/domain/user/value-objects/phone-number.vo.ts`:**

```typescript
import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface PhoneNumberProps {
  countryCode: string;
  number: string;
}

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  static create(countryCode: string, number: string): PhoneNumber {
    const cleanNumber = number.replace(/\D/g, '');

    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      throw new ValidationError('Invalid phone number', [
        { field: 'phone', message: 'Phone number must be 10-15 digits' },
      ]);
    }

    return new PhoneNumber({
      countryCode: countryCode.startsWith('+') ? countryCode : `+${countryCode}`,
      number: cleanNumber,
    });
  }

  get fullNumber(): string {
    return `${this.props.countryCode}${this.props.number}`;
  }

  get formatted(): string {
    // Format as +XX XXX XXX XXXX
    const { countryCode, number } = this.props;
    const formatted = number.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    return `${countryCode} ${formatted}`;
  }

  toString(): string {
    return this.fullNumber;
  }
}
```

### Step 2: Create Domain Events

**Create `src/domain/user/events/user-registered.event.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID, UserRole } from '@shared/types/common';

export interface UserRegisteredPayload {
  userId: ID;
  email: string;
  name: string;
  role: UserRole;
  registeredAt: Date;
}

export class UserRegistered extends DomainEvent<UserRegisteredPayload> {
  constructor(payload: UserRegisteredPayload) {
    super('UserRegistered', payload, 1); // version 1
  }
}
```

**Create `src/domain/user/events/user-logged-in.event.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface UserLoggedInPayload {
  userId: ID;
  email: string;
  loginAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class UserLoggedIn extends DomainEvent<UserLoggedInPayload> {
  constructor(payload: UserLoggedInPayload) {
    super('UserLoggedIn', payload, 1);
  }
}
```

**Create `src/domain/user/events/user-role-changed.event.ts`:**

```typescript
import { DomainEvent } from '@shared/domain/domain-event';
import { ID, UserRole } from '@shared/types/common';

export interface UserRoleChangedPayload {
  userId: ID;
  previousRole: UserRole;
  newRole: UserRole;
  changedAt: Date;
  changedBy: ID;
}

export class UserRoleChanged extends DomainEvent<UserRoleChangedPayload> {
  constructor(payload: UserRoleChangedPayload) {
    super('UserRoleChanged', payload, 1);
  }
}
```

### Step 3: Create Rich Aggregate

**Create `src/domain/user/aggregates/user.aggregate.ts`:**

```typescript
import { AggregateRoot } from '@shared/domain/aggregate-root';
import { ID, UserRole, Timestamp } from '@shared/types/common';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { UserRegistered } from '../events/user-registered.event';
import { UserLoggedIn } from '../events/user-logged-in.event';
import { UserRoleChanged } from '../events/user-role-changed.event';
import { BusinessRuleError } from '@shared/errors';

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

  get canPlaceOrder(): boolean {
    return this.props.isActive && this.props.currentOrderCount < 50;
  }

  // Business methods
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

  updateSellerDetails(shopName: string, shopAddress: string): void {
    if (!this.isSeller) {
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
  }
}
```

### Step 4: Create Domain Services

**Create `src/domain/user/services/user-domain.service.ts`:**

```typescript
import { User } from '../aggregates/user.aggregate';
import { Email } from '../value-objects/email.vo';
import { IUserRepository } from '../repositories/user.repository.interface';
import { ConflictError } from '@shared/errors';

export class UserDomainService {
  constructor(private readonly userRepository: IUserRepository) {}

  async ensureEmailIsUnique(email: Email): Promise<void> {
    const exists = await this.userRepository.existsByEmail(email.value);
    if (exists) {
      throw new ConflictError('Email already exists');
    }
  }

  async canUserBecomeS seller(user: User): Promise<boolean> {
    // Business rule: User must have at least 5 completed orders to become seller
    const completedOrders = user.currentOrderCount - user.returnedOrderCount;
    return completedOrders >= 5;
  }

  calculateUserTrustScore(user: User): number {
    const totalOrders = user.currentOrderCount;
    const returnedOrders = (user as any).props.returnedOrderCount;
    
    if (totalOrders === 0) {
      return 100; // New users start with full trust
    }

    const returnRate = returnedOrders / totalOrders;
    const trustScore = Math.max(0, 100 - returnRate * 100);
    
    return Math.round(trustScore);
  }
}
```

### Step 5: Create Specifications

**Create `src/domain/user/specifications/user-can-place-order.spec.ts`:**

```typescript
import { Specification } from '@shared/domain/specification';
import { User } from '../aggregates/user.aggregate';

export class UserCanPlaceOrderSpecification implements Specification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.canPlaceOrder;
  }

  getReason(user: User): string | null {
    if (!user.canPlaceOrder) {
      if (!(user as any).props.isActive) {
        return 'User account is not active';
      }
      if (user.currentOrderCount >= 50) {
        return 'User has reached maximum order limit';
      }
    }
    return null;
  }
}
```

**Create `src/domain/user/specifications/user-can-become-seller.spec.ts`:**

```typescript
import { Specification } from '@shared/domain/specification';
import { User } from '../aggregates/user.aggregate';

export class UserCanBecomeSellerSpecification implements Specification<User> {
  private readonly MIN_COMPLETED_ORDERS = 5;

  isSatisfiedBy(user: User): boolean {
    const completedOrders = user.currentOrderCount - (user as any).props.returnedOrderCount;
    return completedOrders >= this.MIN_COMPLETED_ORDERS;
  }

  getReason(user: User): string | null {
    if (!this.isSatisfiedBy(user)) {
      const completedOrders = user.currentOrderCount - (user as any).props.returnedOrderCount;
      return `User needs ${this.MIN_COMPLETED_ORDERS - completedOrders} more completed orders to become a seller`;
    }
    return null;
  }
}
```

### Step 6: Base Classes for DDD

**Create `src/shared/domain/aggregate-root.ts`:**

```typescript
import { Entity } from './entity';
import { DomainEvent } from './domain-event';
import { ID } from '@shared/types/common';

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent<any>[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent<any>> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent<any>): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
```

**Create `src/shared/domain/domain-event.ts`:**

```typescript
import { ID } from '@shared/types/common';

export abstract class DomainEvent<T> {
  public readonly eventId: ID;
  public readonly occurredOn: Date;
  public readonly eventName: string;
  public readonly payload: T;
  public readonly version: number;

  constructor(eventName: string, payload: T, version: number = 1) {
    this.eventId = this.generateId();
    this.occurredOn = new Date();
    this.eventName = eventName;
    this.payload = payload;
    this.version = version;
  }

  private generateId(): ID {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Create `src/shared/domain/specification.ts`:**

```typescript
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  getReason?(candidate: T): string | null;
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
}
```

---

## Testing Requirements

**Create `src/domain/user/__tests__/user.aggregate.test.ts`:**

```typescript
import { User } from '../aggregates/user.aggregate';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { UserRole } from '@shared/types/common';

describe('User Aggregate', () => {
  let email: Email;
  let password: Password;

  beforeEach(async () => {
    email = Email.create('test@example.com');
    password = await Password.create('Password123');
  });

  describe('create', () => {
    it('should create a user and raise UserRegistered event', () => {
      const user = User.create(
        {
          name: 'John Doe',
          email,
          password,
          role: UserRole.USER,
        },
        '123'
      );

      expect(user.id).toBe('123');
      expect(user.name).toBe('John Doe');
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventName).toBe('UserRegistered');
    });
  });

  describe('recordLogin', () => {
    it('should update last login and raise UserLoggedIn event', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );
      user.clearDomainEvents();

      user.recordLogin('192.168.1.1', 'Mozilla/5.0');

      expect((user as any).props.lastLogin).toBeDefined();
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventName).toBe('UserLoggedIn');
    });
  });

  describe('changeRole', () => {
    it('should change role and raise UserRoleChanged event', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );
      user.updateSellerDetails('My Shop', '123 Main St');
      user.clearDomainEvents();

      user.changeRole(UserRole.SELLER, 'admin-123');

      expect(user.role).toBe(UserRole.SELLER);
      expect(user.isSeller).toBe(true);
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventName).toBe('UserRoleChanged');
    });

    it('should throw error when changing to seller without shop details', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      expect(() => user.changeRole(UserRole.SELLER, 'admin-123')).toThrow(
        'Cannot change role to seller without shop details'
      );
    });
  });

  describe('incrementOrderCount', () => {
    it('should increment order count', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      user.incrementOrderCount();

      expect(user.currentOrderCount).toBe(1);
    });

    it('should throw error when max orders reached', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      // Set to max
      for (let i = 0; i < 50; i++) {
        user.incrementOrderCount();
      }

      expect(() => user.incrementOrderCount()).toThrow('maximum order limit');
    });
  });
});
```

---

## Deliverables

- [ ] Value objects (Email, Password, PhoneNumber)
- [ ] Domain events (UserRegistered, UserLoggedIn, UserRoleChanged)
- [ ] Rich User aggregate with business logic
- [ ] Domain services
- [ ] Specifications
- [ ] Base classes (AggregateRoot, DomainEvent, Specification)
- [ ] Unit tests (90%+ coverage)
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 3: Implement Domain Layer (Product Context)**
2. Apply same patterns to other contexts
3. Update repositories to work with rich aggregates

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
