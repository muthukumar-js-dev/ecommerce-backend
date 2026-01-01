# Phase 1 - Task 6: Migrate Middleware

**Duration:** 2-3 days  
**Priority:** High  
**Dependencies:** Tasks 1-5 (TypeScript Setup + Domain Models)

---

## Objective

Migrate all Express middleware to TypeScript with proper typing, error handling, and testability.

---

## Context

Middleware to migrate:
- Authentication (JWT validation)
- Request validation (Joi schemas)
- Error handling
- Logging
- CORS
- Rate limiting (future)

---

## Implementation Steps

### Step 1: Authentication Middleware

**Create `src/infrastructure/http/middleware/auth.middleware.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '@shared/errors';
import { UserRole } from '@shared/types/common';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: UserRole;
    };

    (req as AuthenticatedRequest).user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
```

**Create role-based authorization:**

```typescript
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(new AuthenticationError('Not authenticated'));
    }

    if (!roles.includes(authReq.user.role)) {
      return next(
        new AuthorizationError(
          `Requires one of: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
}

// Usage:
// router.post('/admin', authMiddleware, requireRole(UserRole.ADMIN), handler);
```

### Step 2: Validation Middleware

**Create `src/infrastructure/http/middleware/validation.middleware.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@shared/errors';

export function validateRequest(schema: {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        errors.push(...error.details.map((d) => d.message));
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        errors.push(...error.details.map((d) => d.message));
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        errors.push(...error.details.map((d) => d.message));
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
}
```

**Create validation schemas:**

```typescript
// src/infrastructure/http/validation/user.schemas.ts
import Joi from 'joi';

export const registerUserSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      }),
  }),
};

export const loginUserSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const updateUserSchema = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
  }).min(1), // At least one field required
};
```

### Step 3: Error Handling Middleware

**Create `src/infrastructure/http/middleware/error-handler.middleware.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import {
  DomainError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from '@shared/errors';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known errors
  if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof AuthenticationError) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof AuthorizationError) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof DomainError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    },
  });
}
```

### Step 4: Logging Middleware

**Create `src/infrastructure/http/middleware/logging.middleware.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
  id: string;
  startTime: number;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const reqWithId = req as RequestWithId;
  reqWithId.id = uuidv4();
  reqWithId.startTime = Date.now();

  // Log request
  console.log({
    type: 'REQUEST',
    requestId: reqWithId.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - reqWithId.startTime;

    console.log({
      type: 'RESPONSE',
      requestId: reqWithId.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}
```

### Step 5: CORS Middleware

**Create `src/infrastructure/http/middleware/cors.middleware.ts`:**

```typescript
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24 hours
});
```

### Step 6: Rate Limiting Middleware (Optional)

**Create `src/infrastructure/http/middleware/rate-limit.middleware.ts`:**

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:general:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit auth endpoints to 5 requests per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
});
```

---

## Testing

**Create `tests/unit/middleware/auth.middleware.test.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthenticatedRequest } from '@infrastructure/http/middleware/auth.middleware';
import { AuthenticationError } from '@shared/errors';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();
  });

  it('should authenticate valid token', () => {
    const token = jwt.sign(
      { userId: '123', email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET!
    );

    req.headers = { authorization: `Bearer ${token}` };

    authMiddleware(req as Request, res as Response, next);

    expect((req as AuthenticatedRequest).user).toEqual({
      id: '123',
      email: 'test@example.com',
      role: 'user',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('should reject missing token', () => {
    authMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.any(AuthenticationError)
    );
  });

  it('should reject invalid token', () => {
    req.headers = { authorization: 'Bearer invalid-token' };

    authMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.any(AuthenticationError)
    );
  });
});
```

---

## Deliverables

- [ ] Authentication middleware with JWT
- [ ] Role-based authorization
- [ ] Request validation middleware
- [ ] Error handling middleware
- [ ] Logging middleware
- [ ] CORS middleware
- [ ] Rate limiting (optional)
- [ ] Unit tests for all middleware
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 7: Migrate Controllers & Routes**
2. Integrate middleware with routes
3. Test middleware in integration tests

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 2-3 days  
**Status:** Not Started
