# E-Commerce Backend Architecture

## Overview

This document describes the architecture of the e-commerce backend system after the TypeScript migration. The system follows **Clean Architecture** principles with clear separation of concerns and dependency inversion.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Layer (Express)                     │
│  Controllers → Middleware → Routes → Validation             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Application Layer                          │
│  Use Cases → DTOs → Application Services                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Domain Layer                             │
│  Entities → Value Objects → Domain Events → Interfaces      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                 Infrastructure Layer                         │
│  Repositories → Database → External Services                │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Layers

### 1. Domain Layer (`src/domain/`)

**Purpose**: Contains the core business logic and rules. This is the heart of the application and has no dependencies on external frameworks or libraries.

**Components**:

#### Entities
Business objects with identity and lifecycle:
- `User` - User account management
- `Product` - Product catalog
- `Order` - Order processing
- `Cart` - Shopping cart
- `Address` - User addresses
- `Review` - Product reviews
- `Wishlist` - User wishlists
- `Notification` - User notifications

#### Value Objects
Immutable objects defined by their attributes:
- `Email` - Email validation and formatting
- `Money` - Currency and amount handling
- `OrderStatus` - Order state enumeration

#### Repository Interfaces
Define contracts for data persistence:
```typescript
interface IUserRepository {
  findById(id: ID): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): AsyncResult<User>;
  update(user: User): AsyncResult<User>;
  delete(id: ID): AsyncResult<void>;
}
```

**Key Principles**:
- No external dependencies
- Pure business logic
- Framework-agnostic
- Testable in isolation

---

### 2. Application Layer (`src/application/`)

**Purpose**: Orchestrates the flow of data between the domain and infrastructure layers. Contains use cases that implement specific business workflows.

**Components**:

#### Use Cases
Single-responsibility business operations:
- **User**: `RegisterUserUseCase`, `LoginUserUseCase`, `UpdateProfileUseCase`
- **Product**: `CreateProductUseCase`, `UpdateProductUseCase`, `DeleteProductUseCase`
- **Order**: `PlaceOrderUseCase`, `CancelOrderUseCase`, `UpdateOrderStatusUseCase`
- **Cart**: `AddToCartUseCase`, `RemoveFromCartUseCase`, `ClearCartUseCase`
- **Review**: `CreateReviewUseCase`, `UpdateReviewUseCase`, `DeleteReviewUseCase`
- **Wishlist**: `AddToWishlistUseCase`, `RemoveFromWishlistUseCase`
- **Notification**: `CreateNotificationUseCase`, `MarkAsReadUseCase`
- **Address**: `CreateAddressUseCase`, `UpdateAddressUseCase`, `DeleteAddressUseCase`

#### DTOs (Data Transfer Objects)
Define the shape of data crossing layer boundaries:
```typescript
interface RegisterUserRequestDTO {
  name: string;
  email: string;
  password: string;
}

interface RegisterUserResponseDTO {
  user: UserDTO;
  token: string;
}
```

#### Application Services
Aggregate related use cases:
```typescript
class UserService {
  constructor(
    private registerUseCase: RegisterUserUseCase,
    private loginUseCase: LoginUserUseCase,
    private updateProfileUseCase: UpdateProfileUseCase
  ) {}
  
  async register(dto: RegisterUserRequestDTO): AsyncResult<RegisterUserResponseDTO> {
    return this.registerUseCase.execute(dto);
  }
}
```

---

### 3. Infrastructure Layer (`src/infrastructure/`)

**Purpose**: Handles all external concerns including HTTP, database, and third-party services.

**Components**:

#### Database (`infrastructure/database/`)
- **MongoDB Schemas**: Mongoose schema definitions
- **Repositories**: Concrete implementations of repository interfaces
- **Migrations**: Database migration scripts

#### HTTP (`infrastructure/http/`)
- **Controllers**: Handle HTTP requests/responses
- **Routes**: Define API endpoints
- **Middleware**: Authentication, validation, error handling, logging
- **Validation**: Joi schemas for request validation

#### External Services
- **Stripe**: Payment processing
- **AWS S3**: File storage
- **Email**: Email notifications (if implemented)

**Example Controller**:
```typescript
class UserController {
  constructor(private userService: UserService) {}
  
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.userService.register(req.body);
      
      if (!result.success) {
        return next(result.error);
      }
      
      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }
}
```

---

### 4. Shared Layer (`src/shared/`)

**Purpose**: Common utilities, types, and helpers used across all layers.

**Components**:
- **Types**: Common TypeScript types and interfaces
- **Errors**: Custom error classes
- **Utils**: Helper functions
- **Constants**: Application-wide constants

---

## Design Patterns

### 1. Repository Pattern

Abstracts data access logic and provides a collection-like interface for domain entities.

```typescript
// Domain layer - Interface
interface IProductRepository {
  findById(id: ID): Promise<Product | null>;
  findByPid(pid: string): Promise<Product | null>;
  save(product: Product): AsyncResult<Product>;
  update(product: Product): AsyncResult<Product>;
  delete(id: ID): AsyncResult<void>;
}

// Infrastructure layer - Implementation
class MongoProductRepository implements IProductRepository {
  async findById(id: ID): Promise<Product | null> {
    const doc = await ProductModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }
  
  private toDomain(doc: any): Product {
    // Convert MongoDB document to domain entity
  }
}
```

**Benefits**:
- Decouples domain from data access
- Easy to test with mock repositories
- Can swap database implementations

---

### 2. Result Pattern

Explicit error handling without exceptions for business logic.

```typescript
type Result<T> = Success<T> | Failure;

interface Success<T> {
  success: true;
  data: T;
}

interface Failure {
  success: false;
  error: DomainError;
}

// Usage
async function registerUser(dto: RegisterUserDTO): AsyncResult<User> {
  if (await userExists(dto.email)) {
    return failure(new DuplicateEmailError(dto.email));
  }
  
  const user = User.create(dto);
  return success(user);
}
```

**Benefits**:
- Explicit error handling
- Type-safe error propagation
- Forces error consideration

---

### 3. Dependency Injection

All dependencies are injected through constructors, enabling loose coupling and testability.

```typescript
class PlaceOrderUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private cartRepository: ICartRepository,
    private productRepository: IProductRepository,
    private paymentService: IPaymentService
  ) {}
  
  async execute(userId: ID, dto: PlaceOrderDTO): AsyncResult<Order> {
    // Use injected dependencies
  }
}
```

**Benefits**:
- Loose coupling
- Easy to test with mocks
- Flexible configuration

---

### 4. Middleware Pattern

Chain of responsibility for HTTP request processing.

```typescript
// Authentication middleware
export const authMiddleware = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return next(new AuthenticationError('No token provided'));
  }
  
  const decoded = verifyToken(token);
  req.user = decoded;
  next();
};

// Usage
router.post('/orders', authMiddleware, validateRequest(schema), controller.create);
```

---

## Data Flow

### Request Flow (Example: Place Order)

```
1. HTTP Request
   POST /api/orders
   Headers: { Authorization: "Bearer token" }
   Body: { paymentMethod: "card", shippingAddressId: "addr-123" }
   
2. Middleware Chain
   → authMiddleware: Validates JWT token, extracts userId
   → validateRequest: Validates request body against Joi schema
   
3. Controller
   → OrderController.placeOrder()
   → Extracts userId from req.user
   → Calls OrderService.placeOrder(userId, dto)
   
4. Application Service
   → OrderService.placeOrder()
   → Delegates to PlaceOrderUseCase.execute()
   
5. Use Case
   → PlaceOrderUseCase.execute()
   → Gets cart from CartRepository
   → Validates cart has items
   → Creates Order entity
   → Processes payment via PaymentService
   → Saves order via OrderRepository
   → Clears cart via CartRepository
   → Returns Result<Order>
   
6. Response Flow (back up the chain)
   → Use Case returns Result<Order>
   → Service returns Result<OrderDTO>
   → Controller transforms to HTTP response
   → Middleware handles errors if any
   → HTTP Response sent to client
```

---

## Error Handling

### Error Hierarchy

```typescript
abstract class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
  }
}

class ValidationError extends DomainError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} with id ${id} not found`, 404);
  }
}

class AuthenticationError extends DomainError {
  constructor(message: string) {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}
```

### Error Middleware

```typescript
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof DomainError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};
```

---

## Database Design

### MongoDB Collections

- `users` - User accounts
- `products` - Product catalog
- `orders` - Order history
- `carts` - Shopping carts
- `addresses` - User addresses
- `reviews` - Product reviews
- `wishlists` - User wishlists
- `notifications` - User notifications

### Key Indexes

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ stripeCustomerId: 1 });

// Products
db.products.createIndex({ pid: 1 }, { unique: true });
db.products.createIndex({ sellerId: 1 });
db.products.createIndex({ category: 1 });

// Orders
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ createdAt: -1 });

// Reviews
db.reviews.createIndex({ productId: 1 });
db.reviews.createIndex({ userId: 1 });
```

---

## Security

### Authentication
- JWT-based authentication
- Tokens include: `userId`, `email`, `role`
- Token expiration: 7 days
- Refresh token mechanism (if implemented)

### Authorization
- Role-based access control (RBAC)
- Roles: `USER`, `ADMIN`, `SELLER`
- Middleware checks user role for protected routes

### Input Validation
- Joi schemas for all request bodies
- Validation middleware runs before controllers
- Sanitization of user inputs

### Password Security
- Bcrypt hashing with salt rounds: 10
- Passwords never stored in plain text
- Password strength requirements enforced

---

## Performance Considerations

### Caching Strategy
- In-memory caching for frequently accessed data
- Redis integration (future enhancement)

### Database Optimization
- Proper indexing on frequently queried fields
- Pagination for list endpoints
- Projection to limit returned fields

### API Rate Limiting
- Rate limiting middleware
- Different limits for authenticated vs. unauthenticated users

---

## Testing Strategy

### Unit Tests
- Domain entities and value objects
- Use cases in isolation
- Pure business logic

### Integration Tests
- Repository implementations
- Controller endpoints
- Database interactions

### E2E Tests
- Complete user flows
- Critical business scenarios
- End-to-end workflows

**Coverage Target**: 80%+

---

## Deployment

### Environment Variables
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://...
JWT_SECRET=...
STRIPE_SECRET_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Build Process
```bash
npm run build    # Compile TypeScript to JavaScript
npm start        # Run production server
```

### Health Checks
- `/health` endpoint for monitoring
- Database connection check
- External service availability

---

## Future Enhancements

1. **Caching Layer**: Redis for session management and caching
2. **Message Queue**: RabbitMQ/SQS for async processing
3. **Event Sourcing**: Track all domain events
4. **CQRS**: Separate read/write models
5. **Microservices**: Split into smaller services
6. **GraphQL**: Alternative API layer
7. **Real-time**: WebSocket support for notifications

---

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
