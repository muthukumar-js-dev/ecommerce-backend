# Developer Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites
- Node.js >= 18.x
- MongoDB >= 6.0
- npm >= 9.x
- Git

### Initial Setup

1. **Clone the repository**:
```bash
git clone https://github.com/muthukumar-js-dev/ecommerce-backend.git
cd ecommerce-backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Setup environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

4. **Run database migrations** (if any):
```bash
npm run migrate
```

5. **Start development server**:
```bash
npm run dev
```

The server will start at `http://localhost:3000`

### Verify Setup

1. **Check health endpoint**:
```bash
curl http://localhost:3000/health
```

2. **View API documentation**:
Open `http://localhost:3000/api-docs` in your browser

3. **Run tests**:
```bash
npm test
```

---

## Project Structure

```
ecommerce-backend/
├── src/
│   ├── domain/              # Business logic and entities
│   │   ├── user/
│   │   ├── product/
│   │   ├── order/
│   │   ├── cart/
│   │   ├── address/
│   │   ├── review/
│   │   ├── wishlist/
│   │   └── notification/
│   ├── application/         # Use cases and DTOs
│   │   ├── use-cases/
│   │   ├── services/
│   │   └── dtos/
│   ├── infrastructure/      # External concerns
│   │   ├── database/
│   │   ├── http/
│   │   └── external-services/
│   ├── shared/             # Common utilities
│   │   ├── types/
│   │   ├── errors/
│   │   └── utils/
│   └── main.ts             # Application entry point
├── tests/
│   ├── integration/
│   └── setup.ts
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── dist/                   # Compiled output
```

### Key Directories

- **`src/domain/`**: Pure business logic, no external dependencies
- **`src/application/`**: Orchestrates domain logic, implements use cases
- **`src/infrastructure/`**: Handles HTTP, database, external services
- **`src/shared/`**: Common code used across layers
- **`tests/`**: All test files

---

## Development Workflow

### Daily Workflow

1. **Pull latest changes**:
```bash
git pull origin main
```

2. **Create feature branch**:
```bash
git checkout -b feature/your-feature-name
```

3. **Make changes and test**:
```bash
npm run dev          # Start dev server
npm test             # Run tests
npm run lint         # Check code style
```

4. **Commit changes**:
```bash
git add .
git commit -m "feat: add new feature"
```

5. **Push and create PR**:
```bash
git push origin feature/your-feature-name
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Run production build

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:integration # Run integration tests only
npm run test:unit        # Run unit tests only

# Code Quality
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors
npm run format           # Format code with Prettier
npm run format:check     # Check formatting
npm run type-check       # TypeScript type checking
npm run validate         # Run all checks (type + lint + format)

# Build
npm run clean            # Remove dist folder
npm run build            # Compile TypeScript
npm run build:watch      # Watch mode compilation
```

---

## Code Style Guide

### TypeScript Guidelines

#### 1. Always Use Explicit Types

❌ **Bad**:
```typescript
const user = { name: 'John', email: 'john@example.com' };
function getUser() {
  return user;
}
```

✅ **Good**:
```typescript
interface User {
  name: string;
  email: string;
}

const user: User = { name: 'John', email: 'john@example.com' };

function getUser(): User {
  return user;
}
```

#### 2. Avoid `any` Type

❌ **Bad**:
```typescript
function processData(data: any): any {
  return data.value;
}
```

✅ **Good**:
```typescript
interface Data {
  value: string;
}

function processData(data: Data): string {
  return data.value;
}
```

#### 3. Use Interfaces for Object Shapes

✅ **Good**:
```typescript
interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}

interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
```

#### 4. Use Enums for Constants

✅ **Good**:
```typescript
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SELLER = 'seller'
}

enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered'
}
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `user-repository.ts`)
- **Classes**: `PascalCase` (e.g., `UserRepository`)
- **Interfaces**: `IPascalCase` (e.g., `IUserRepository`)
- **Functions**: `camelCase` (e.g., `getUserById`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_LOGIN_ATTEMPTS`)
- **Private members**: `_camelCase` (e.g., `_privateMethod`)

### Code Organization

#### Use Case Structure
```typescript
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(dto: RegisterUserDTO): AsyncResult<UserDTO> {
    // 1. Validate input
    const validation = this.validate(dto);
    if (!validation.success) {
      return failure(validation.error);
    }

    // 2. Check business rules
    const exists = await this.userRepository.findByEmail(dto.email);
    if (exists) {
      return failure(new DuplicateEmailError(dto.email));
    }

    // 3. Create entity
    const user = User.create(dto);

    // 4. Persist
    const result = await this.userRepository.save(user);
    if (!result.success) {
      return failure(result.error);
    }

    // 5. Side effects
    await this.emailService.sendWelcomeEmail(user.email);

    // 6. Return result
    return success(this.toDTO(result.data));
  }

  private validate(dto: RegisterUserDTO): Result<void> {
    // Validation logic
  }

  private toDTO(user: User): UserDTO {
    // Convert to DTO
  }
}
```

### Error Handling

Always use the Result pattern for business logic:

```typescript
// ✅ Good
async function createProduct(dto: CreateProductDTO): AsyncResult<Product> {
  if (!dto.price || dto.price <= 0) {
    return failure(new ValidationError('Price must be positive'));
  }

  const product = Product.create(dto);
  return success(product);
}

// ❌ Bad - Don't throw in business logic
async function createProduct(dto: CreateProductDTO): Promise<Product> {
  if (!dto.price || dto.price <= 0) {
    throw new Error('Price must be positive');
  }

  return Product.create(dto);
}
```

---

## Adding New Features

### Step-by-Step Guide

Let's add a new feature: **Product Categories**

#### Step 1: Create Domain Entity

`src/domain/category/entities/category.entity.ts`:
```typescript
import { Entity } from '@shared/types/entity';
import { ID } from '@shared/types/common';

interface CategoryProps {
  name: string;
  description: string;
  parentId?: ID;
  createdAt: Date;
  updatedAt: Date;
}

export class Category extends Entity<CategoryProps> {
  private constructor(props: CategoryProps, id?: ID) {
    super(props, id);
  }

  static create(props: Omit<CategoryProps, 'createdAt' | 'updatedAt'>, id?: ID): Category {
    return new Category({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date()
    }, id);
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }
}
```

#### Step 2: Create Repository Interface

`src/domain/category/repositories/category.repository.interface.ts`:
```typescript
import { Category } from '../entities/category.entity';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

export interface ICategoryRepository {
  findById(id: ID): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  save(category: Category): AsyncResult<Category>;
  update(category: Category): AsyncResult<Category>;
  delete(id: ID): AsyncResult<void>;
}
```

#### Step 3: Implement Repository

`src/infrastructure/database/mongodb/repositories/category.repository.ts`:
```typescript
import { ICategoryRepository } from '@domain/category/repositories/category.repository.interface';
import { Category } from '@domain/category/entities/category.entity';
import { CategoryModel } from '../schemas/category.schema';
import { success, failure, AsyncResult } from '@shared/types/result';

export class MongoCategoryRepository implements ICategoryRepository {
  async findById(id: string): Promise<Category | null> {
    const doc = await CategoryModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async save(category: Category): AsyncResult<Category> {
    try {
      const doc = await CategoryModel.create(this.toPersistence(category));
      return success(this.toDomain(doc));
    } catch (error) {
      return failure(error as Error);
    }
  }

  private toDomain(doc: any): Category {
    return Category.create({
      name: doc.name,
      description: doc.description,
      parentId: doc.parentId
    }, doc._id.toString());
  }

  private toPersistence(category: Category): any {
    return {
      name: category.name,
      description: category.description
    };
  }
}
```

#### Step 4: Create MongoDB Schema

`src/infrastructure/database/mongodb/schemas/category.schema.ts`:
```typescript
import mongoose, { Schema } from 'mongoose';

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'Category' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const CategoryModel = mongoose.model('Category', categorySchema);
```

#### Step 5: Create Use Cases

`src/application/use-cases/category/create-category.use-case.ts`:
```typescript
import { ICategoryRepository } from '@domain/category/repositories/category.repository.interface';
import { Category } from '@domain/category/entities/category.entity';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ValidationError } from '@shared/errors';

interface CreateCategoryDTO {
  name: string;
  description: string;
  parentId?: string;
}

export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(dto: CreateCategoryDTO): AsyncResult<Category> {
    // Validate
    if (!dto.name || dto.name.trim().length === 0) {
      return failure(new ValidationError('Category name is required'));
    }

    // Check if exists
    const exists = await this.categoryRepository.findByName(dto.name);
    if (exists) {
      return failure(new ValidationError('Category already exists'));
    }

    // Create and save
    const category = Category.create(dto);
    return this.categoryRepository.save(category);
  }
}
```

#### Step 6: Create Controller

`src/infrastructure/http/controllers/category.controller.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '@application/services/category.service';

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.categoryService.createCategory(req.body);

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

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await this.categoryService.getAllCategories();
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
}
```

#### Step 7: Create Routes

`src/infrastructure/http/routes/category.routes.ts`:
```typescript
import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { createCategorySchema } from '../validation/category.schemas';

export function createCategoryRoutes(controller: CategoryController): Router {
  const router = Router();

  router.post(
    '/',
    authMiddleware,
    validateRequest(createCategorySchema),
    (req, res, next) => controller.create(req, res, next)
  );

  router.get('/', (req, res, next) => controller.getAll(req, res, next));

  return router;
}
```

#### Step 8: Add Validation Schema

`src/infrastructure/http/validation/category.schemas.ts`:
```typescript
import Joi from 'joi';

export const createCategorySchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().min(10).max(500).required(),
    parentId: Joi.string().optional()
  })
};
```

#### Step 9: Write Tests

`tests/integration/category.test.ts`:
```typescript
import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests } from './setup';

describe('Category API', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  it('should create a category', async () => {
    const response = await request(app)
      .post('/api/categories')
      .send({
        name: 'Electronics',
        description: 'Electronic products'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Electronics');
  });
});
```

#### Step 10: Update Documentation

Add to Swagger documentation and update ARCHITECTURE.md

---

## Testing

### Writing Tests

#### Unit Tests
Test business logic in isolation:

```typescript
describe('Category Entity', () => {
  it('should create a category', () => {
    const category = Category.create({
      name: 'Electronics',
      description: 'Electronic products'
    });

    expect(category.name).toBe('Electronics');
    expect(category.description).toBe('Electronic products');
  });

  it('should update category name', () => {
    const category = Category.create({
      name: 'Electronics',
      description: 'Electronic products'
    });

    category.updateName('Consumer Electronics');

    expect(category.name).toBe('Consumer Electronics');
  });
});
```

#### Integration Tests
Test with real database:

```typescript
describe('CategoryRepository', () => {
  let repository: ICategoryRepository;

  beforeEach(async () => {
    repository = new MongoCategoryRepository();
    await clearDatabase();
  });

  it('should save and retrieve category', async () => {
    const category = Category.create({
      name: 'Electronics',
      description: 'Electronic products'
    });

    const result = await repository.save(category);
    expect(result.success).toBe(true);

    const found = await repository.findById(result.data!.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Electronics');
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- category.test.ts

# Integration tests only
npm run test:integration
```

---

## Debugging

### VS Code Debug Configuration

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/main.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

Use structured logging:
```typescript
import { logger } from '@shared/utils/logger';

logger.info('User registered', { userId: user.id, email: user.email });
logger.error('Failed to process order', { error, orderId });
logger.debug('Processing payment', { amount, currency });
```

---

## Common Tasks

### Add New Endpoint

1. Create use case
2. Add to service
3. Create controller method
4. Add route
5. Add validation schema
6. Write tests
7. Update Swagger docs

### Update Database Schema

1. Modify Mongoose schema
2. Create migration script if needed
3. Update repository
4. Update tests
5. Document changes

### Add Middleware

1. Create middleware function
2. Add to route or app
3. Write tests
4. Document usage

---

## Troubleshooting

### Common Issues

**Issue**: Tests failing with "Cannot find module"
**Solution**: Check `tsconfig.test.json` paths and Jest `moduleNameMapper`

**Issue**: TypeScript compilation errors
**Solution**: Run `npm run type-check` to see all errors

**Issue**: Database connection fails
**Solution**: Check MongoDB is running and `MONGODB_URI` is correct

**Issue**: JWT token invalid
**Solution**: Verify `JWT_SECRET` matches between environments

### Getting Help

1. Check documentation in `docs/`
2. Review existing code for patterns
3. Ask team members
4. Check GitHub issues

---

## Best Practices

1. **Always write tests** for new features
2. **Use TypeScript strictly** - no `any` types
3. **Follow clean architecture** - respect layer boundaries
4. **Document public APIs** with JSDoc
5. **Keep functions small** - single responsibility
6. **Use meaningful names** - code should be self-documenting
7. **Handle errors explicitly** - use Result pattern
8. **Review your own code** before creating PR
9. **Keep commits atomic** - one logical change per commit
10. **Update documentation** when changing behavior
