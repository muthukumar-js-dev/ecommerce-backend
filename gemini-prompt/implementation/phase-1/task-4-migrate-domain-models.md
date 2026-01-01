# Phase 1 - Task 4: Migrate Domain Models to TypeScript

**Duration:** 5-7 days  
**Priority:** High  
**Dependencies:** Task 1, Task 2, Task 3

---

## Objective

Migrate all Mongoose models from JavaScript to TypeScript with proper type definitions, interfaces, and domain entities. Implement repository pattern to abstract database access.

---

## Context

Current state:
- 11 Mongoose models in JavaScript (`User/models/`)
- Direct Mongoose schema definitions
- No type safety
- No separation between domain and infrastructure

Target state:
- TypeScript interfaces for domain entities
- Mongoose schemas with TypeScript
- Repository pattern for data access
- Clear separation of concerns

---

## Models to Migrate

1. **userModel.js** → User entity + repository
2. **productModel.js** → Product entity + repository
3. **cartModel.js** → Cart entity + repository
4. **orderModel.js** → Order entity + repository
5. **addressModel.js** → Address entity + repository
6. **wishlistModel.js** → Wishlist entity + repository
7. **notificationModel.js** → Notification entity + repository
8. **reviewAndRatingModel.js** → Review entity + repository
9. **stripeOrdersModel.js** → StripeOrder entity + repository

---

## Implementation Steps

### Step 1: Create Domain Entities

**Create `src/domain/user/entities/user.entity.ts`:**

```typescript
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

  get isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }

  get isSeller(): boolean {
    return this.props.role === UserRole.SELLER;
  }

  // Business methods
  updateLastLogin(): void {
    (this.props as any).lastLogin = new Date();
    (this.props as any).updatedAt = new Date();
  }

  incrementOrderCount(): void {
    (this.props as any).currentOrder += 1;
    (this.props as any).updatedAt = new Date();
  }

  decrementOrderCount(): void {
    (this.props as any).currentOrder = Math.max(0, this.props.currentOrder - 1);
    (this.props as any).updatedAt = new Date();
  }
}
```

### Step 2: Create Mongoose Schemas with TypeScript

**Create `src/infrastructure/database/mongodb/schemas/user.schema.ts`:**

```typescript
import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@shared/types/common';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password: string;
  userRole: UserRole;
  token?: string;
  lastLogin?: Date;
  currentOrder: number;
  returnedCount: number;
  stripeCustomerId?: string;
  shopName?: string;
  shopMobileNumber?: string;
  shopAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    userRole: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    token: {
      type: String,
      required: false,
    },
    lastLogin: {
      type: Date,
      required: false,
    },
    currentOrder: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Current order count cannot be negative'],
    },
    returnedCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Returned count cannot be negative'],
    },
    stripeCustomerId: {
      type: String,
      required: false,
    },
    shopName: {
      type: String,
      required: false,
    },
    shopMobileNumber: {
      type: String,
      required: false,
    },
    shopAddress: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userRole: 1 });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });

// Methods
userSchema.methods.toJSON = function (): Partial<IUserDocument> {
  const user = this.toObject();
  delete user.password;
  delete user.token;
  return user;
};

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
```

### Step 3: Create Repository Interfaces

**Create `src/domain/user/repositories/user.repository.interface.ts`:**

```typescript
import { User } from '../entities/user.entity';
import { ID, Email } from '@shared/types/common';
import { Result } from '@shared/types/result';

export interface IUserRepository {
  findById(id: ID): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<Result<User>>;
  update(user: User): Promise<Result<User>>;
  delete(id: ID): Promise<Result<void>>;
  exists(email: Email): Promise<boolean>;
  count(): Promise<number>;
}
```

### Step 4: Implement Repository

**Create `src/infrastructure/database/mongodb/repositories/user.repository.ts`:**

```typescript
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User, UserProps } from '@domain/user/entities/user.entity';
import { UserModel, IUserDocument } from '../schemas/user.schema';
import { ID, Email } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

export class UserRepository implements IUserRepository {
  async findById(id: ID): Promise<User | null> {
    try {
      const doc = await UserModel.findById(id).exec();
      if (!doc) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find user by ID',
        'findById',
        error as Error
      );
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const doc = await UserModel.findOne({ email }).exec();
      if (!doc) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find user by email',
        'findByEmail',
        error as Error
      );
    }
  }

  async save(user: User): Promise<Result<User>> {
    try {
      const doc = new UserModel(this.toPersistence(user));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error: any) {
      if (error.code === 11000) {
        return failure(
          new DatabaseError('Email already exists', 'save', error)
        );
      }
      return failure(
        new DatabaseError('Failed to save user', 'save', error)
      );
    }
  }

  async update(user: User): Promise<Result<User>> {
    try {
      const doc = await UserModel.findByIdAndUpdate(
        user.id,
        this.toPersistence(user),
        { new: true, runValidators: true }
      ).exec();

      if (!doc) {
        return failure(new NotFoundError('User', user.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(
        new DatabaseError('Failed to update user', 'update', error as Error)
      );
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await UserModel.findByIdAndDelete(id).exec();
      if (!result) {
        return failure(new NotFoundError('User', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(
        new DatabaseError('Failed to delete user', 'delete', error as Error)
      );
    }
  }

  async exists(email: Email): Promise<boolean> {
    try {
      const count = await UserModel.countDocuments({ email }).exec();
      return count > 0;
    } catch (error) {
      throw new DatabaseError(
        'Failed to check user existence',
        'exists',
        error as Error
      );
    }
  }

  async count(): Promise<number> {
    try {
      return await UserModel.countDocuments().exec();
    } catch (error) {
      throw new DatabaseError(
        'Failed to count users',
        'count',
        error as Error
      );
    }
  }

  // Mapper methods
  private toDomain(doc: IUserDocument): User {
    return User.create(
      {
        name: doc.name,
        email: doc.email,
        passwordHash: doc.password,
        role: doc.userRole,
        token: doc.token,
        lastLogin: doc.lastLogin,
        currentOrder: doc.currentOrder,
        returnedCount: doc.returnedCount,
        stripeCustomerId: doc.stripeCustomerId,
        shopName: doc.shopName,
        shopMobileNumber: doc.shopMobileNumber,
        shopAddress: doc.shopAddress,
      },
      doc._id.toString()
    );
  }

  private toPersistence(user: User): Partial<IUserDocument> {
    const props = (user as any).props as UserProps;
    return {
      _id: user.id as any,
      name: props.name,
      email: props.email,
      password: props.passwordHash,
      userRole: props.role,
      token: props.token,
      lastLogin: props.lastLogin,
      currentOrder: props.currentOrder,
      returnedCount: props.returnedCount,
      stripeCustomerId: props.stripeCustomerId,
      shopName: props.shopName,
      shopMobileNumber: props.shopMobileNumber,
      shopAddress: props.shopAddress,
    };
  }
}
```

### Step 5: Create Product Entity (Example)

**Create `src/domain/product/entities/product.entity.ts`:**

```typescript
import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';

export interface ProductProps {
  pid: string;
  title: string;
  category: string;
  actualPrice: number;
  sellingPrice: number;
  brand: string;
  description: string;
  averageRating?: number;
  discount?: number;
  outOfStock: boolean;
  images: string[];
  productDetails: Array<{ key: string; value: string }>;
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

  static create(props: Omit<ProductProps, 'createdAt' | 'updatedAt'>, id: ID): Product {
    const now = new Date();
    return new Product(
      {
        ...props,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  get title(): string {
    return this.props.title;
  }

  get price(): number {
    return this.props.sellingPrice;
  }

  get isAvailable(): boolean {
    return !this.props.outOfStock;
  }

  get discountPercentage(): number {
    if (!this.props.discount) {
      return Math.round(
        ((this.props.actualPrice - this.props.sellingPrice) / this.props.actualPrice) * 100
      );
    }
    return this.props.discount;
  }

  markOutOfStock(): void {
    (this.props as any).outOfStock = true;
    (this.props as any).updatedAt = new Date();
  }

  markInStock(): void {
    (this.props as any).outOfStock = false;
    (this.props as any).updatedAt = new Date();
  }
}
```

---

## Testing Requirements

### Unit Tests for Entities

**Create `src/domain/user/__tests__/user.entity.test.ts`:**

```typescript
import { User } from '../entities/user.entity';
import { UserRole } from '@shared/types/common';

describe('User Entity', () => {
  const validProps = {
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.USER,
    currentOrder: 0,
    returnedCount: 0,
  };

  it('should create a user entity', () => {
    const user = User.create(validProps, '123');
    
    expect(user.id).toBe('123');
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
    expect(user.role).toBe(UserRole.USER);
  });

  it('should identify admin users', () => {
    const admin = User.create({ ...validProps, role: UserRole.ADMIN }, '123');
    
    expect(admin.isAdmin).toBe(true);
    expect(admin.isSeller).toBe(false);
  });

  it('should increment order count', () => {
    const user = User.create(validProps, '123');
    
    user.incrementOrderCount();
    
    expect((user as any).props.currentOrder).toBe(1);
  });

  it('should not allow negative order count', () => {
    const user = User.create(validProps, '123');
    
    user.decrementOrderCount();
    
    expect((user as any).props.currentOrder).toBe(0);
  });
});
```

### Integration Tests for Repository

**Create `tests/integration/user.repository.test.ts`:**

```typescript
import { UserRepository } from '@infrastructure/database/mongodb/repositories/user.repository';
import { User } from '@domain/user/entities/user.entity';
import { UserRole } from '@shared/types/common';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../utils/test-helpers';
import { isSuccess } from '@shared/types/result';

describe('UserRepository Integration Tests', () => {
  let repository: UserRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new UserRepository();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should save and retrieve a user', async () => {
    const user = User.create(
      {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed',
        role: UserRole.USER,
        currentOrder: 0,
        returnedCount: 0,
      },
      '507f1f77bcf86cd799439011'
    );

    const saveResult = await repository.save(user);
    expect(isSuccess(saveResult)).toBe(true);

    const found = await repository.findByEmail('test@example.com');
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Test User');
  });

  it('should return null for non-existent user', async () => {
    const found = await repository.findById('507f1f77bcf86cd799439011');
    expect(found).toBeNull();
  });

  it('should check if user exists', async () => {
    const user = User.create(
      {
        name: 'Test',
        email: 'test@example.com',
        passwordHash: 'hashed',
        role: UserRole.USER,
        currentOrder: 0,
        returnedCount: 0,
      },
      '507f1f77bcf86cd799439011'
    );

    await repository.save(user);

    const exists = await repository.exists('test@example.com');
    expect(exists).toBe(true);

    const notExists = await repository.exists('notfound@example.com');
    expect(notExists).toBe(false);
  });
});
```

---

## Deliverables

- [ ] All 9 models migrated to TypeScript
- [ ] Domain entities created for each model
- [ ] Mongoose schemas with TypeScript
- [ ] Repository interfaces defined
- [ ] Repository implementations created
- [ ] Mapper methods (toDomain, toPersistence)
- [ ] Unit tests for all entities
- [ ] Integration tests for all repositories
- [ ] 80%+ test coverage for domain layer
- [ ] Documentation for each entity

---

## Migration Checklist (Per Model)

- [ ] Create domain entity
- [ ] Create Mongoose schema with TypeScript
- [ ] Create repository interface
- [ ] Implement repository
- [ ] Write unit tests for entity
- [ ] Write integration tests for repository
- [ ] Update existing code to use repository
- [ ] Remove old JavaScript model file

---

## Next Steps

After completing this task:
1. Proceed to **Task 5: Migrate Services & Application Layer**
2. Update controllers to use repositories
3. Remove direct Mongoose calls from controllers

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-7 days  
**Status:** Not Started
