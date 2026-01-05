# TypeScript Migration Guide

## Overview

This document guides you through the migration from JavaScript to TypeScript for the e-commerce backend. It covers breaking changes, new patterns, and migration strategies.

---

## Table of Contents
- [What Changed](#what-changed)
- [Breaking Changes](#breaking-changes)
- [Migration Checklist](#migration-checklist)
- [Code Transformation Examples](#code-transformation-examples)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## What Changed

### Architecture

**Before (JavaScript)**:
- Loosely structured code
- Mixed concerns in single files
- Implicit dependencies
- Runtime type checking

**After (TypeScript)**:
- Clean Architecture with clear layers
- Separation of concerns
- Explicit dependency injection
- Compile-time type safety

### Type Safety

**Before (JavaScript)**:
```javascript
function createUser(data) {
  return {
    id: generateId(),
    name: data.name,
    email: data.email,
    createdAt: new Date()
  };
}
```

**After (TypeScript)**:
```typescript
interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function createUser(data: CreateUserDTO): User {
  return {
    id: generateId(),
    name: data.name,
    email: data.email,
    createdAt: new Date()
  };
}
```

### Error Handling

**Before (JavaScript)**:
```javascript
async function registerUser(data) {
  try {
    const user = await User.create(data);
    return user;
  } catch (error) {
    throw error;
  }
}
```

**After (TypeScript)**:
```typescript
async function registerUser(data: RegisterUserDTO): AsyncResult<User> {
  const exists = await userRepository.findByEmail(data.email);
  if (exists) {
    return failure(new DuplicateEmailError(data.email));
  }

  const user = User.create(data);
  const result = await userRepository.save(user);
  
  if (!result.success) {
    return failure(result.error);
  }

  return success(result.data);
}
```

---

## Breaking Changes

### 1. API Response Format

**Old Format**:
```json
{
  "user": {
    "id": "123",
    "name": "John"
  },
  "token": "jwt-token"
}
```

**New Format**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "name": "John"
    },
    "token": "jwt-token"
  }
}
```

**Error Format Changed**:

**Old**:
```json
{
  "error": "User not found"
}
```

**New**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id 123 not found"
  }
}
```

**Migration**: Update all API clients to handle new response format.

---

### 2. JWT Token Structure

**Old Token Payload**:
```json
{
  "userId": "123",
  "email": "user@example.com"
}
```

**New Token Payload**:
```json
{
  "userId": "123",
  "email": "user@example.com",
  "role": "user"
}
```

**Migration**: 
- Regenerate all existing tokens
- Update token verification logic
- Update frontend to handle role field

---

### 3. Database Schema Changes

#### User Schema

**Added Fields**:
- `userRole`: Enum (`user`, `admin`, `seller`)
- `stripeCustomerId`: String (optional)

**Changed Fields**:
- `createdAt`: Now required, auto-generated
- `updatedAt`: Now required, auto-updated

**Migration Script**:
```javascript
// scripts/migrate-users.js
db.users.updateMany(
  { userRole: { $exists: false } },
  { $set: { userRole: 'user' } }
);

db.users.updateMany(
  { createdAt: { $exists: false } },
  { $set: { createdAt: new Date(), updatedAt: new Date() } }
);
```

#### Product Schema

**Added Fields**:
- `pid`: String (unique product identifier)
- `sellerId`: Reference to User
- `subCategory`: String

**Changed Fields**:
- `price` → `actualPrice` and `sellingPrice`
- `stock` → `outOfStock` (boolean)

**Migration Script**:
```javascript
// scripts/migrate-products.js
db.products.find().forEach(product => {
  db.products.updateOne(
    { _id: product._id },
    {
      $set: {
        pid: `PROD-${product._id}`,
        actualPrice: product.price,
        sellingPrice: product.price,
        outOfStock: product.stock === 0
      },
      $unset: { price: '', stock: '' }
    }
  );
});
```

#### Order Schema

**Added Fields**:
- `orderNumber`: String (unique, auto-generated)
- `items`: Array of order items with product details

**Changed Structure**:
- Orders now store product snapshots
- Payment information embedded

**Migration**: Complex - requires data transformation. Contact team lead.

---

### 4. Environment Variables

**New Required Variables**:
```env
# TypeScript specific
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
```

**Removed Variables**:
- `SESSION_SECRET` (replaced by JWT_SECRET)
- `COOKIE_MAX_AGE` (JWT handles expiration)

---

### 5. API Endpoints

#### Changed Endpoints

| Old Endpoint | New Endpoint | Notes |
|-------------|--------------|-------|
| `POST /users/signup` | `POST /api/users/register` | Standardized naming |
| `POST /users/signin` | `POST /api/users/login` | Standardized naming |
| `GET /user/profile` | `GET /api/users/profile` | Added `/api` prefix |
| `PUT /products/:id` | `PATCH /api/products/:id` | Changed to PATCH |
| `GET /orders/user/:userId` | `GET /api/orders` | Uses auth token |

#### New Endpoints

- `GET /api/users/:id` - Get user by ID (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/products/seller/:sellerId` - Get products by seller
- `POST /api/cart/items` - Add to cart
- `DELETE /api/cart` - Clear cart
- `POST /api/reviews` - Create review
- `POST /api/wishlist/items` - Add to wishlist
- `GET /api/notifications` - Get user notifications

---

## Migration Checklist

### Backend Migration

- [ ] **Update Dependencies**
  ```bash
  npm install
  ```

- [ ] **Run Database Migrations**
  ```bash
  npm run migrate:users
  npm run migrate:products
  npm run migrate:orders
  ```

- [ ] **Update Environment Variables**
  - Copy `.env.example` to `.env`
  - Fill in all required values
  - Remove deprecated variables

- [ ] **Verify Database Indexes**
  ```bash
  npm run db:indexes
  ```

- [ ] **Run Tests**
  ```bash
  npm test
  ```

- [ ] **Build Application**
  ```bash
  npm run build
  ```

### Frontend Migration

- [ ] **Update API Client**
  - Change base URL to include `/api` prefix
  - Update response handling for new format
  - Add error handling for new error format

- [ ] **Update Authentication**
  - Store JWT token in localStorage/cookies
  - Include token in Authorization header
  - Handle token expiration

- [ ] **Update API Calls**
  - Update all endpoint URLs
  - Change HTTP methods where needed
  - Update request/response types

### Testing Migration

- [ ] **Update Test Data**
  - Use new schema format
  - Include required fields
  - Update assertions for new response format

- [ ] **Update Integration Tests**
  - Use new API endpoints
  - Test new authentication flow
  - Verify error responses

### Deployment Migration

- [ ] **Update CI/CD Pipeline**
  - Add TypeScript build step
  - Update environment variables
  - Run migrations before deployment

- [ ] **Database Backup**
  - Backup production database
  - Test migration on staging
  - Verify data integrity

- [ ] **Gradual Rollout**
  - Deploy to staging first
  - Run smoke tests
  - Monitor for errors
  - Deploy to production

---

## Code Transformation Examples

### Example 1: User Registration

**Before (JavaScript)**:
```javascript
// routes/user.js
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    const token = jwt.sign({ userId: user._id }, process.env.SECRET);
    
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**After (TypeScript)**:
```typescript
// use-cases/user/register-user.use-case.ts
export class RegisterUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: RegisterUserDTO): AsyncResult<RegisterUserResponse> {
    // Check if user exists
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      return failure(new DuplicateEmailError(dto.email));
    }

    // Hash password
    const hashedPassword = await this.passwordHasher.hash(dto.password);

    // Create user entity
    const user = User.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      userRole: UserRole.USER
    });

    // Save to database
    const result = await this.userRepository.save(user);
    if (!result.success) {
      return failure(result.error);
    }

    // Generate token
    const token = this.generateToken(result.data);

    return success({
      user: this.toDTO(result.data),
      token
    });
  }
}

// controllers/user.controller.ts
export class UserController {
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

### Example 2: Product Creation

**Before (JavaScript)**:
```javascript
router.post('/products', auth, async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      sellerId: req.user.id
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**After (TypeScript)**:
```typescript
// use-cases/product/create-product.use-case.ts
export class CreateProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  async execute(sellerId: ID, dto: CreateProductDTO): AsyncResult<Product> {
    // Validate
    if (dto.sellingPrice > dto.actualPrice) {
      return failure(new ValidationError('Selling price cannot exceed actual price'));
    }

    // Create entity
    const product = Product.create({
      ...dto,
      sellerId,
      pid: this.generatePid()
    });

    // Save
    return this.productRepository.save(product);
  }

  private generatePid(): string {
    return `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// controllers/product.controller.ts
export class ProductController {
  constructor(private productService: ProductService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user!.userId;
      const result = await this.productService.createProduct(sellerId, req.body);

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

## Common Patterns

### Pattern 1: Result Type

Replace try-catch with Result pattern:

**Before**:
```javascript
try {
  const user = await findUser(id);
  return user;
} catch (error) {
  throw error;
}
```

**After**:
```typescript
const user = await userRepository.findById(id);
if (!user) {
  return failure(new NotFoundError('User', id));
}
return success(user);
```

### Pattern 2: Dependency Injection

**Before**:
```javascript
class UserService {
  async getUser(id) {
    return User.findById(id);
  }
}
```

**After**:
```typescript
class UserService {
  constructor(private userRepository: IUserRepository) {}

  async getUser(id: ID): AsyncResult<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      return failure(new NotFoundError('User', id));
    }
    return success(user);
  }
}
```

### Pattern 3: DTOs

**Before**:
```javascript
function createOrder(data) {
  return Order.create(data);
}
```

**After**:
```typescript
interface CreateOrderDTO {
  userId: string;
  items: OrderItemDTO[];
  shippingAddress: AddressDTO;
  paymentMethod: PaymentMethod;
}

function createOrder(dto: CreateOrderDTO): Order {
  return Order.create(dto);
}
```

---

## Troubleshooting

### Issue: TypeScript Compilation Errors

**Problem**: `Property 'userId' does not exist on type 'Request'`

**Solution**: Extend Express Request type:
```typescript
// types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}
```

### Issue: Module Resolution

**Problem**: `Cannot find module '@domain/user'`

**Solution**: Check `tsconfig.json` paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

### Issue: Database Migration Fails

**Problem**: Existing data doesn't match new schema

**Solution**: Write migration script to transform data:
```javascript
// scripts/migrate-data.js
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Transform data
  const users = await db.collection('users').find({}).toArray();
  for (const user of users) {
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { userRole: 'user', updatedAt: new Date() } }
    );
  }
  
  console.log('Migration complete');
  process.exit(0);
}

migrate();
```

---

## Support

For migration assistance:
1. Check this guide
2. Review code examples in `src/`
3. Contact development team
4. Create GitHub issue

---

## Timeline

Recommended migration timeline:

**Week 1**: Backend setup and testing
- Install dependencies
- Run database migrations
- Deploy to staging
- Run integration tests

**Week 2**: Frontend updates
- Update API client
- Update authentication
- Update all API calls
- Test thoroughly

**Week 3**: Production deployment
- Backup database
- Deploy backend
- Deploy frontend
- Monitor for issues

**Week 4**: Cleanup
- Remove old code
- Update documentation
- Knowledge transfer
