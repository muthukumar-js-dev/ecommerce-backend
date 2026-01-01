# Phase 1 - Task 7: Migrate Controllers & Routes

**Duration:** 6-8 days  
**Priority:** High  
**Dependencies:** Tasks 1-6 (All previous tasks)

---

## Objective

Migrate all Express controllers and routes to TypeScript with proper DTOs, request/response typing, and API documentation.

---

## Context

Controllers to migrate:
- User Controller (register, login, profile, update)
- Product Controller (CRUD operations)
- Cart Controller (add, remove, update, list)
- Order Controller (create, list, update status)
- Payment Controller (Stripe integration)

---

## Implementation Steps

### Step 1: Request/Response DTOs

**Create `src/infrastructure/http/dtos/user.dtos.ts`:**

```typescript
import { UserRole } from '@shared/types/common';

// Request DTOs
export interface RegisterUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// Response DTOs
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}
```

**Create `src/infrastructure/http/dtos/product.dtos.ts`:**

```typescript
export interface CreateProductRequest {
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  inventory: number;
  images: string[];
}

export interface UpdateProductRequest {
  title?: string;
  description?: string;
  price?: number;
  inventory?: number;
  images?: string[];
}

export interface ProductResponse {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  inventory: number;
  images: string[];
  sellerId: string;
  createdAt: string;
}

export interface ProductListResponse {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
}
```

### Step 2: User Controller

**Create `src/infrastructure/http/controllers/user.controller.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase } from '@application/use-cases/user/register-user.use-case';
import { LoginUserUseCase } from '@application/use-cases/user/login-user.use-case';
import { GetUserProfileUseCase } from '@application/use-cases/user/get-user-profile.use-case';
import { RegisterUserRequest, LoginUserRequest, AuthResponse, UserResponse } from '../dtos/user.dtos';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class UserController {
  constructor(
    private registerUserUseCase: RegisterUserUseCase,
    private loginUserUseCase: LoginUserUseCase,
    private getUserProfileUseCase: GetUserProfileUseCase
  ) {}

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: RegisterUserRequest = req.body;

      const result = await this.registerUserUseCase.execute(dto);

      if (!result.success) {
        return next(result.error);
      }

      const response: AuthResponse = {
        user: {
          id: result.data.user.id,
          name: result.data.user.name,
          email: result.data.user.email.value,
          role: result.data.user.role,
          createdAt: result.data.user.createdAt.toISOString(),
        },
        token: result.data.token,
      };

      res.status(201).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: LoginUserRequest = req.body;

      const result = await this.loginUserUseCase.execute(dto);

      if (!result.success) {
        return next(result.error);
      }

      const response: AuthResponse = {
        user: {
          id: result.data.user.id,
          name: result.data.user.name,
          email: result.data.user.email.value,
          role: result.data.user.role,
          createdAt: result.data.user.createdAt.toISOString(),
        },
        token: result.data.token,
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.getUserProfileUseCase.execute({ userId });

      if (!result.success) {
        return next(result.error);
      }

      const response: UserResponse = {
        id: result.data.id,
        name: result.data.name,
        email: result.data.email.value,
        role: result.data.role,
        createdAt: result.data.createdAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### Step 3: Routes

**Create `src/infrastructure/http/routes/user.routes.ts`:**

```typescript
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { registerUserSchema, loginUserSchema } from '../validation/user.schemas';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  /**
   * @route   POST /api/users/register
   * @desc    Register a new user
   * @access  Public
   */
  router.post(
    '/register',
    validateRequest(registerUserSchema),
    (req, res, next) => controller.register(req, res, next)
  );

  /**
   * @route   POST /api/users/login
   * @desc    Login user
   * @access  Public
   */
  router.post(
    '/login',
    validateRequest(loginUserSchema),
    (req, res, next) => controller.login(req, res, next)
  );

  /**
   * @route   GET /api/users/profile
   * @desc    Get user profile
   * @access  Private
   */
  router.get(
    '/profile',
    authMiddleware,
    (req, res, next) => controller.getProfile(req, res, next)
  );

  return router;
}
```

### Step 4: Product Controller (Example)

**Create `src/infrastructure/http/controllers/product.controller.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { CreateProductUseCase } from '@application/use-cases/product/create-product.use-case';
import { GetProductsUseCase } from '@application/use-cases/product/get-products.use-case';
import { CreateProductRequest, ProductResponse, ProductListResponse } from '../dtos/product.dtos';

export class ProductController {
  constructor(
    private createProductUseCase: CreateProductUseCase,
    private getProductsUseCase: GetProductsUseCase
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateProductRequest = req.body;

      const result = await this.createProductUseCase.execute(dto);

      if (!result.success) {
        return next(result.error);
      }

      const response: ProductResponse = {
        id: result.data.id,
        title: result.data.title,
        description: result.data.description,
        price: result.data.price.amount,
        currency: result.data.price.currency,
        category: result.data.category,
        inventory: result.data.inventory,
        images: result.data.images,
        sellerId: result.data.sellerId,
        createdAt: result.data.createdAt.toISOString(),
      };

      res.status(201).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.getProductsUseCase.execute({ page, limit });

      if (!result.success) {
        return next(result.error);
      }

      const response: ProductListResponse = {
        products: result.data.products.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price.amount,
          currency: p.price.currency,
          category: p.category,
          inventory: p.inventory,
          images: p.images,
          sellerId: p.sellerId,
          createdAt: p.createdAt.toISOString(),
        })),
        total: result.data.total,
        page,
        limit,
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### Step 5: Main App Setup

**Create `src/infrastructure/http/app.ts`:**

```typescript
import express, { Application } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import { createUserRoutes } from './routes/user.routes';
import { createProductRoutes } from './routes/product.routes';
import { createOrderRoutes } from './routes/order.routes';
import { createCartRoutes } from './routes/cart.routes';

export function createApp(dependencies: any): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(corsMiddleware);

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(requestLogger);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/users', createUserRoutes(dependencies.userController));
  app.use('/api/products', createProductRoutes(dependencies.productController));
  app.use('/api/orders', createOrderRoutes(dependencies.orderController));
  app.use('/api/cart', createCartRoutes(dependencies.cartController));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
```

---

## API Documentation

**Create OpenAPI/Swagger documentation:**

**Create `src/infrastructure/http/swagger.ts`:**

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce API',
      version: '1.0.0',
      description: 'E-Commerce Backend API Documentation',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/infrastructure/http/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Application): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}
```

---

## Testing

**Create `tests/integration/controllers/user.controller.test.ts`:**

```typescript
import request from 'supertest';
import { createApp } from '@infrastructure/http/app';

describe('User Controller', () => {
  let app: any;

  beforeAll(() => {
    app = createApp(/* dependencies */);
  });

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'Password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

---

## Deliverables

- [ ] All DTOs created
- [ ] User controller migrated
- [ ] Product controller migrated
- [ ] Order controller migrated
- [ ] Cart controller migrated
- [ ] All routes defined
- [ ] OpenAPI/Swagger documentation
- [ ] Integration tests
- [ ] Error handling tested

---

**Task Owner:** Development Team  
**Estimated Effort:** 6-8 days  
**Status:** Not Started
