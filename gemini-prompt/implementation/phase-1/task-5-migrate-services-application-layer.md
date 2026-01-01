# Phase 1 - Task 5: Migrate Services & Application Layer

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Task 4 (Domain Models)

---

## Objective

Migrate business logic from controllers to a dedicated application layer using Use Cases pattern. Create DTOs for all operations and implement application services that orchestrate domain logic.

---

## Context

Current state:
- Business logic mixed in controllers
- No separation of concerns
- Direct database access from controllers
- No reusable business operations

Target state:
- Use Cases for each business operation
- DTOs for input/output
- Application services orchestrating domain logic
- Clean separation from infrastructure

---

## Architecture Pattern

```
Controller → Use Case → Domain Service → Repository
     ↓          ↓            ↓              ↓
   DTO      Command      Entity         Database
```

---

## Implementation Steps

### Step 1: Create DTOs

**Create `src/application/dtos/user/register-user.dto.ts`:**

```typescript
import { UserRole } from '@shared/types/common';

export interface RegisterUserRequestDTO {
  name: string;
  email: string;
  password: string;
  userRole?: UserRole;
}

export interface RegisterUserResponseDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}
```

**Create `src/application/dtos/user/login-user.dto.ts`:**

```typescript
export interface LoginUserRequestDTO {
  email: string;
  password: string;
}

export interface LoginUserResponseDTO {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
  expiresIn: string;
}
```

**Create `src/application/dtos/product/create-product.dto.ts`:**

```typescript
export interface CreateProductRequestDTO {
  pid: string;
  title: string;
  category: string;
  actualPrice: number;
  sellingPrice: number;
  brand: string;
  description: string;
  images: string[];
  productDetails: Array<{ key: string; value: string }>;
  subCategory?: string;
}

export interface ProductResponseDTO {
  id: string;
  pid: string;
  title: string;
  category: string;
  actualPrice: number;
  sellingPrice: number;
  discount: number;
  brand: string;
  description: string;
  outOfStock: boolean;
  images: string[];
  averageRating?: number;
  createdAt: string;
}
```

**Create `src/application/dtos/cart/add-to-cart.dto.ts`:**

```typescript
export interface AddToCartRequestDTO {
  productId: string;
  quantity: number;
  amount: number;
  actualAmount: number;
  currency: string;
}

export interface CartResponseDTO {
  id: string;
  userId: string;
  items: CartItemDTO[];
  totalAmount: number;
  totalActualAmount: number;
  totalDiscount: string;
  currency: string;
}

export interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  later: boolean;
}
```

### Step 2: Create Use Cases

**Create `src/application/use-cases/user/register-user.use-case.ts`:**

```typescript
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User } from '@domain/user/entities/user.entity';
import { RegisterUserRequestDTO, RegisterUserResponseDTO } from '@application/dtos/user/register-user.dto';
import { Result, success, failure, AsyncResult } from '@shared/types/result';
import { ValidationError, ConflictError } from '@shared/errors';
import { UserRole } from '@shared/types/common';
import bcrypt from 'bcrypt';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async execute(dto: RegisterUserRequestDTO): AsyncResult<RegisterUserResponseDTO> {
    // Validate input
    const validationResult = this.validate(dto);
    if (!validationResult.success) {
      return validationResult;
    }

    // Check if user already exists
    const exists = await this.userRepository.exists(dto.email);
    if (exists) {
      return failure(new ConflictError('User with this email already exists'));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user entity
    const user = User.create(
      {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.userRole ?? UserRole.USER,
        currentOrder: 0,
        returnedCount: 0,
      },
      this.generateId()
    );

    // Save user
    const saveResult = await this.userRepository.save(user);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    // Return response
    return success(this.toDTO(saveResult.data));
  }

  private validate(dto: RegisterUserRequestDTO): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!dto.name || dto.name.trim().length < 2) {
      errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
    }

    if (!dto.email || !this.isValidEmail(dto.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!dto.password || dto.password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }

    if (errors.length > 0) {
      return failure(new ValidationError('Validation failed', errors));
    }

    return success(undefined);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateId(): string {
    // In production, use proper ID generation
    return new Date().getTime().toString();
  }

  private toDTO(user: User): RegisterUserResponseDTO {
    const props = (user as any).props;
    return {
      id: user.id,
      name: props.name,
      email: props.email,
      role: props.role,
      createdAt: props.createdAt.toISOString(),
    };
  }
}
```

**Create `src/application/use-cases/user/login-user.use-case.ts`:**

```typescript
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { LoginUserRequestDTO, LoginUserResponseDTO } from '@application/dtos/user/login-user.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { AuthenticationError, ValidationError } from '@shared/errors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { APP_CONSTANTS } from '@shared/constants';

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtSecret: string
  ) {}

  async execute(dto: LoginUserRequestDTO): AsyncResult<LoginUserResponseDTO> {
    // Validate input
    if (!dto.email || !dto.password) {
      return failure(
        new ValidationError('Email and password are required', [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is required' },
        ])
      );
    }

    // Find user
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      return failure(new AuthenticationError('Invalid email or password'));
    }

    // Verify password
    const props = (user as any).props;
    const isPasswordValid = await bcrypt.compare(dto.password, props.passwordHash);
    if (!isPasswordValid) {
      return failure(new AuthenticationError('Invalid email or password'));
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: props.email,
        role: props.role,
      },
      this.jwtSecret,
      { expiresIn: APP_CONSTANTS.JWT_EXPIRY }
    );

    // Update last login
    user.updateLastLogin();
    await this.userRepository.update(user);

    // Return response
    return success({
      user: {
        id: user.id,
        name: props.name,
        email: props.email,
        role: props.role,
      },
      token,
      expiresIn: APP_CONSTANTS.JWT_EXPIRY,
    });
  }
}
```

**Create `src/application/use-cases/cart/add-to-cart.use-case.ts`:**

```typescript
import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { AddToCartRequestDTO, CartResponseDTO } from '@application/dtos/cart/add-to-cart.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError, ValidationError, OutOfStockError } from '@shared/errors';
import { ID } from '@shared/types/common';

export class AddToCartUseCase {
  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly productRepository: IProductRepository
  ) {}

  async execute(userId: ID, dto: AddToCartRequestDTO): AsyncResult<CartResponseDTO> {
    // Validate input
    const validationResult = this.validate(dto);
    if (!validationResult.success) {
      return validationResult;
    }

    // Check if product exists
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      return failure(new NotFoundError('Product', dto.productId));
    }

    // Check if product is in stock
    if (!product.isAvailable) {
      return failure(new OutOfStockError(product.title));
    }

    // Get or create cart
    let cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      cart = await this.cartRepository.create(userId);
    }

    // Add item to cart
    const addResult = cart.addItem({
      productId: dto.productId,
      quantity: dto.quantity,
      price: dto.amount,
      actualPrice: dto.actualAmount,
    });

    if (!addResult.success) {
      return failure(addResult.error);
    }

    // Save cart
    const saveResult = await this.cartRepository.save(cart);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    // Return response
    return success(this.toDTO(saveResult.data));
  }

  private validate(dto: AddToCartRequestDTO): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!dto.productId) {
      errors.push({ field: 'productId', message: 'Product ID is required' });
    }

    if (!dto.quantity || dto.quantity < 1) {
      errors.push({ field: 'quantity', message: 'Quantity must be at least 1' });
    }

    if (dto.quantity > 10) {
      errors.push({ field: 'quantity', message: 'Maximum quantity is 10' });
    }

    if (errors.length > 0) {
      return failure(new ValidationError('Validation failed', errors));
    }

    return success(undefined);
  }

  private toDTO(cart: Cart): CartResponseDTO {
    // Map cart entity to DTO
    // Implementation depends on Cart entity structure
    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        later: item.later,
      })),
      totalAmount: cart.totalAmount,
      totalActualAmount: cart.totalActualAmount,
      totalDiscount: cart.totalDiscount,
      currency: cart.currency,
    };
  }
}
```

### Step 3: Create Application Services

**Create `src/application/services/user.service.ts`:**

```typescript
import { RegisterUserUseCase } from '../use-cases/user/register-user.use-case';
import { LoginUserUseCase } from '../use-cases/user/login-user.use-case';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { RegisterUserRequestDTO, RegisterUserResponseDTO } from '../dtos/user/register-user.dto';
import { LoginUserRequestDTO, LoginUserResponseDTO } from '../dtos/user/login-user.dto';
import { AsyncResult } from '@shared/types/result';

export class UserService {
  private registerUseCase: RegisterUserUseCase;
  private loginUseCase: LoginUserUseCase;

  constructor(
    userRepository: IUserRepository,
    jwtSecret: string
  ) {
    this.registerUseCase = new RegisterUserUseCase(userRepository);
    this.loginUseCase = new LoginUserUseCase(userRepository, jwtSecret);
  }

  async register(dto: RegisterUserRequestDTO): AsyncResult<RegisterUserResponseDTO> {
    return this.registerUseCase.execute(dto);
  }

  async login(dto: LoginUserRequestDTO): AsyncResult<LoginUserResponseDTO> {
    return this.loginUseCase.execute(dto);
  }
}
```

### Step 4: Dependency Injection Container

**Create `src/infrastructure/di/container.ts`:**

```typescript
import { UserRepository } from '@infrastructure/database/mongodb/repositories/user.repository';
import { ProductRepository } from '@infrastructure/database/mongodb/repositories/product.repository';
import { CartRepository } from '@infrastructure/database/mongodb/repositories/cart.repository';
import { UserService } from '@application/services/user.service';
import { ProductService } from '@application/services/product.service';
import { CartService } from '@application/services/cart.service';

export class Container {
  private static instance: Container;
  
  // Repositories
  private userRepository: UserRepository;
  private productRepository: ProductRepository;
  private cartRepository: CartRepository;
  
  // Services
  private userService: UserService;
  private productService: ProductService;
  private cartService: CartService;

  private constructor() {
    // Initialize repositories
    this.userRepository = new UserRepository();
    this.productRepository = new ProductRepository();
    this.cartRepository = new CartRepository();
    
    // Initialize services
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    this.userService = new UserService(this.userRepository, jwtSecret);
    this.productService = new ProductService(this.productRepository);
    this.cartService = new CartService(this.cartRepository, this.productRepository);
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  getUserService(): UserService {
    return this.userService;
  }

  getProductService(): ProductService {
    return this.productService;
  }

  getCartService(): CartService {
    return this.cartService;
  }
}
```

---

## Testing Requirements

### Unit Tests for Use Cases

**Create `src/application/use-cases/user/__tests__/register-user.use-case.test.ts`:**

```typescript
import { RegisterUserUseCase } from '../register-user.use-case';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { UserRole } from '@shared/types/common';
import { isSuccess, isFailure } from '@shared/types/result';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      exists: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };
    
    useCase = new RegisterUserUseCase(mockRepository);
  });

  it('should register a new user successfully', async () => {
    mockRepository.exists.mockResolvedValue(false);
    mockRepository.save.mockResolvedValue({
      success: true,
      data: expect.any(Object),
    } as any);

    const dto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    const result = await useCase.execute(dto);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.email).toBe('john@example.com');
      expect(result.data.role).toBe(UserRole.USER);
    }
  });

  it('should fail if email already exists', async () => {
    mockRepository.exists.mockResolvedValue(true);

    const dto = {
      name: 'John Doe',
      email: 'existing@example.com',
      password: 'password123',
    };

    const result = await useCase.execute(dto);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('should fail with validation error for invalid email', async () => {
    const dto = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'password123',
    };

    const result = await useCase.execute(dto);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('should fail with validation error for short password', async () => {
    const dto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: '123',
    };

    const result = await useCase.execute(dto);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
```

---

## Deliverables

- [ ] DTOs for all operations (User, Product, Cart, Order, etc.)
- [ ] Use Cases for all business operations
- [ ] Application Services
- [ ] Dependency Injection Container
- [ ] Unit tests for all Use Cases (80%+ coverage)
- [ ] Integration tests for Services
- [ ] Documentation for each Use Case

---

## Use Cases to Implement

### User Domain
- [ ] RegisterUserUseCase
- [ ] LoginUserUseCase
- [ ] GetUserProfileUseCase
- [ ] UpdateUserRoleUseCase

### Product Domain
- [ ] CreateProductUseCase
- [ ] GetProductUseCase
- [ ] ListProductsUseCase
- [ ] UpdateProductUseCase

### Cart Domain
- [ ] AddToCartUseCase
- [ ] RemoveFromCartUseCase
- [ ] UpdateCartItemQuantityUseCase
- [ ] GetCartUseCase
- [ ] ClearCartUseCase

### Order Domain
- [ ] PlaceOrderUseCase
- [ ] GetOrderUseCase
- [ ] ListOrdersUseCase
- [ ] CancelOrderUseCase
- [ ] UpdateOrderStatusUseCase

### Payment Domain
- [ ] InitiatePaymentUseCase
- [ ] ProcessPaymentUseCase
- [ ] RefundPaymentUseCase

---

## Next Steps

After completing this task:
1. Proceed to **Task 6: Migrate Middleware**
2. Update controllers to use Application Services
3. Remove business logic from controllers

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
