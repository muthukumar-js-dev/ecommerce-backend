# Developer Guide

## Getting Started

### Prerequisites

- **Node.js:** 18.x or higher
- **MongoDB:** 6.x or higher
- **TypeScript:** 5.x or higher
- **Git:** Latest version

### Initial Setup

```bash
# Clone repository
git clone https://github.com/muthukumar-js-dev/ecommerce-backend.git
cd ecommerce-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - MONGODB_URI
# - JWT_SECRET
# - STRIPE_SECRET_KEY (for payments)
# - AWS_REGION, S3_BUCKET_NAME (for file storage)

# Run tests
npm test

# Start development server
npm run dev
```

### Project Structure

```
ecommerce-backend/
├── src/
│   ├── domain/              # Domain Layer (Business Logic)
│   │   ├── user/
│   │   │   ├── aggregates/  # User aggregate root
│   │   │   ├── entities/    # User-related entities
│   │   │   ├── value-objects/  # Email, Password, etc.
│   │   │   ├── events/      # UserRegistered, UserLoggedIn, etc.
│   │   │   ├── services/    # UserDomainService
│   │   │   └── specifications/  # Business rules
│   │   ├── product/
│   │   └── order/
│   │
│   ├── application/         # Application Layer (Use Cases)
│   │   ├── commands/        # Write operations
│   │   │   ├── user/
│   │   │   ├── product/
│   │   │   └── order/
│   │   ├── queries/         # Read operations
│   │   │   ├── user/
│   │   │   ├── product/
│   │   │   └── order/
│   │   ├── services/        # Application services
│   │   └── sagas/           # Long-running transactions
│   │
│   ├── infrastructure/      # Infrastructure Layer
│   │   ├── database/
│   │   │   └── mongodb/
│   │   │       ├── repositories/  # Data access
│   │   │       └── read-models/   # Denormalized views
│   │   ├── http/
│   │   │   ├── controllers/ # REST API
│   │   │   ├── middleware/  # Auth, validation, etc.
│   │   │   └── routes/      # Route definitions
│   │   ├── events/
│   │   │   ├── event-bus.ts
│   │   │   ├── event-store.ts
│   │   │   └── handlers/    # Event handlers
│   │   ├── cqrs/
│   │   │   ├── command-bus.ts
│   │   │   ├── query-bus.ts
│   │   │   └── cqrs-module.ts
│   │   ├── adapters/        # External services
│   │   │   ├── stripe/
│   │   │   ├── aws/
│   │   │   └── email/
│   │   └── resilience/      # Circuit breaker, retry
│   │
│   ├── shared/              # Shared Utilities
│   │   ├── types/           # Common types
│   │   ├── errors/          # Error classes
│   │   ├── domain/          # Base classes
│   │   └── utils/           # Utility functions
│   │
│   └── main.ts              # Application entry point
│
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   ├── performance/         # Performance tests
│   └── contract/            # Contract tests
│
├── docs/                    # Documentation
└── gemini-prompt/           # Implementation guides
```

## Adding a New Feature

### Step 1: Define Domain Model

Create the aggregate in the domain layer:

```typescript
// src/domain/review/aggregates/review.aggregate.ts
import { AggregateRoot } from '@shared/domain/aggregate-root';
import { ID } from '@shared/types/common';
import { ReviewCreated } from '../events/review-created.event';

export interface ReviewProps {
  productId: ID;
  userId: ID;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Review extends AggregateRoot<ReviewProps> {
  private constructor(props: ReviewProps, id: ID) {
    super(props, id);
  }

  static create(
    productId: ID,
    userId: ID,
    rating: number,
    comment: string,
    id: ID
  ): Review {
    // Validate
    if (rating < 1 || rating > 5) {
      throw new BusinessRuleError('Rating must be between 1 and 5');
    }

    const review = new Review(
      {
        productId,
        userId,
        rating,
        comment,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id
    );

    // Raise domain event
    review.addDomainEvent(
      new ReviewCreated({
        reviewId: id,
        productId,
        userId,
        rating,
        createdAt: new Date(),
      })
    );

    return review;
  }

  // Getters
  get productId(): ID { return this.props.productId; }
  get rating(): number { return this.props.rating; }
  get comment(): string { return this.props.comment; }
}
```

### Step 2: Create Domain Event

```typescript
// src/domain/review/events/review-created.event.ts
import { DomainEvent } from '@shared/domain/domain-event';

export class ReviewCreated extends DomainEvent {
  constructor(
    public readonly payload: {
      reviewId: string;
      productId: string;
      userId: string;
      rating: number;
      createdAt: Date;
    }
  ) {
    super('ReviewCreated', payload.reviewId);
  }
}
```

### Step 3: Create Command and Handler

```typescript
// src/application/commands/review/create-review.command.ts
import { BaseCommand } from '../base-command';

export class CreateReviewCommand extends BaseCommand {
  constructor(
    public readonly productId: string,
    public readonly userId: string,
    public readonly rating: number,
    public readonly comment: string
  ) {
    super('CreateReviewCommand');
  }
}

// src/application/commands/review/create-review.handler.ts
import { CommandHandler } from '../command-handler.interface';
import { CreateReviewCommand } from './create-review.command';
import { AsyncResult, success, failure } from '@shared/types/result';

export class CreateReviewHandler implements CommandHandler<CreateReviewCommand> {
  constructor(
    private reviewRepository: IReviewRepository,
    private productRepository: IProductRepository
  ) {}

  async handle(command: CreateReviewCommand): AsyncResult<{ reviewId: string }> {
    // Validate product exists
    const product = await this.productRepository.findById(command.productId);
    if (!product) {
      return failure(new BusinessRuleError('Product not found'));
    }

    // Create review aggregate
    const review = Review.create(
      command.productId,
      command.userId,
      command.rating,
      command.comment,
      generateId()
    );

    // Save (this will publish events)
    await this.reviewRepository.save(review);

    return success({ reviewId: review.id.value });
  }
}
```

### Step 4: Create Query and Handler

```typescript
// src/application/queries/review/get-product-reviews.query.ts
import { BaseQuery } from '../base-query';

export class GetProductReviewsQuery extends BaseQuery {
  constructor(
    public readonly productId: string,
    public readonly pagination?: { page: number; limit: number }
  ) {
    super('GetProductReviewsQuery');
  }
}

// src/application/queries/review/get-product-reviews.handler.ts
import { QueryHandler } from '../query-handler.interface';

export class GetProductReviewsHandler implements QueryHandler<GetProductReviewsQuery> {
  constructor(
    private reviewReadRepository: IReviewReadRepository
  ) {}

  async handle(query: GetProductReviewsQuery): AsyncResult<ReviewListResult> {
    const reviews = await this.reviewReadRepository.findByProductId(
      query.productId,
      query.pagination
    );

    return success({
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        userName: r.userName,
        createdAt: r.createdAt,
      })),
      total: reviews.length,
    });
  }
}
```

### Step 5: Create Repository

```typescript
// src/infrastructure/database/mongodb/repositories/review.repository.ts
import { Review } from '@domain/review/aggregates/review.aggregate';

export class ReviewRepository implements IReviewRepository {
  constructor(
    private eventBus: IEventBus
  ) {}

  async save(review: Review): Promise<void> {
    // Persist to database
    await ReviewModel.create({
      _id: review.id.value,
      productId: review.productId,
      userId: review.userId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    });

    // Publish domain events
    for (const event of review.domainEvents) {
      await this.eventBus.publish(event);
    }

    review.clearDomainEvents();
  }

  async findById(id: string): Promise<Review | null> {
    const doc = await ReviewModel.findById(id);
    if (!doc) return null;

    return Review.reconstitute(
      {
        productId: doc.productId,
        userId: doc.userId,
        rating: doc.rating,
        comment: doc.comment,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      doc._id
    );
  }
}
```

### Step 6: Create Event Handler

```typescript
// src/infrastructure/events/handlers/review-created.handler.ts
export class UpdateProductRatingHandler implements EventHandler<ReviewCreated> {
  constructor(
    private productRepository: IProductRepository
  ) {}

  async handle(event: ReviewCreated): Promise<void> {
    const product = await this.productRepository.findById(event.payload.productId);
    if (product) {
      product.updateAverageRating(event.payload.rating);
      await this.productRepository.save(product);
    }
  }
}
```

### Step 7: Register in CQRS Module

```typescript
// src/infrastructure/cqrs/cqrs-module.ts
export class CQRSModule {
  constructor() {
    // ... existing registrations

    // Register review command
    this.commandBus.register(
      'CreateReviewCommand',
      new CreateReviewHandler(reviewRepo, productRepo)
    );

    // Register review query
    this.queryBus.register(
      'GetProductReviewsQuery',
      new GetProductReviewsHandler(reviewReadRepo)
    );
  }
}
```

### Step 8: Create Controller

```typescript
// src/infrastructure/http/controllers/review.controller.ts
export class ReviewController {
  constructor(
    private commandBus: ICommandBus,
    private queryBus: IQueryBus
  ) {}

  async createReview(req: Request, res: Response): Promise<void> {
    const command = new CreateReviewCommand(
      req.body.productId,
      req.user.id,
      req.body.rating,
      req.body.comment
    );

    const result = await this.commandBus.execute(command);

    if (result.success) {
      res.status(201).json(result.value);
    } else {
      res.status(400).json({ error: result.error.message });
    }
  }

  async getProductReviews(req: Request, res: Response): Promise<void> {
    const query = new GetProductReviewsQuery(
      req.params.productId,
      { page: Number(req.query.page) || 1, limit: 10 }
    );

    const result = await this.queryBus.execute(query);

    if (result.success) {
      res.status(200).json(result.value);
    } else {
      res.status(500).json({ error: result.error.message });
    }
  }
}
```

### Step 9: Add Routes

```typescript
// src/infrastructure/http/routes/review.routes.ts
import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';

export function createReviewRoutes(controller: ReviewController): Router {
  const router = Router();

  router.post('/reviews', authenticate, (req, res) => 
    controller.createReview(req, res)
  );

  router.get('/products/:productId/reviews', (req, res) => 
    controller.getProductReviews(req, res)
  );

  return router;
}
```

### Step 10: Write Tests

```typescript
// tests/unit/domain/review/review.aggregate.test.ts
describe('Review Aggregate', () => {
  it('should create review with valid data', () => {
    const review = Review.create(
      'product-123',
      'user-123',
      5,
      'Great product!',
      'review-123'
    );

    expect(review.rating).toBe(5);
    expect(review.comment).toBe('Great product!');
  });

  it('should reject invalid rating', () => {
    expect(() => Review.create(
      'product-123',
      'user-123',
      6, // Invalid
      'Comment',
      'review-123'
    )).toThrow('Rating must be between 1 and 5');
  });

  it('should raise ReviewCreated event', () => {
    const review = Review.create(
      'product-123',
      'user-123',
      5,
      'Great!',
      'review-123'
    );

    expect(review.domainEvents).toHaveLength(1);
    expect(review.domainEvents[0].eventName).toBe('ReviewCreated');
  });
});
```

## Common Tasks

### Running the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start

# Run tests
npm test

# Run specific test file
npm test -- path/to/test.ts

# Run tests with coverage
npm run test:coverage
```

### Database Operations

```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/ecommerce"

# View collections
show collections

# Query data
db.users.find()
db.orders.find({ userId: "user-123" })

# Clear database (development only!)
db.dropDatabase()
```

### Debugging

```typescript
// Add breakpoints in VS Code
// Set breakpoint in code
// Press F5 or use Debug menu

// Console logging
console.log('Debug info:', variable);

// Use debugger statement
debugger; // Execution will pause here
```

## Best Practices

### 1. Domain Layer
- Keep business logic in aggregates
- Use value objects for validation
- Raise domain events for state changes
- Don't reference infrastructure

### 2. Application Layer
- One command/query per use case
- Keep handlers thin (orchestration only)
- Use DTOs for data transfer
- Handle errors gracefully

### 3. Infrastructure Layer
- Implement interfaces from domain
- Handle technical concerns
- No business logic
- Use dependency injection

### 4. Testing
- Test business logic thoroughly
- Mock external dependencies
- Use integration tests for flows
- Maintain high coverage

### 5. Code Organization
- Follow folder structure
- Use meaningful names
- Keep files small and focused
- Document complex logic

## Troubleshooting

### Common Issues

**Issue: Module not found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: TypeScript compilation errors**
```bash
# Check tsconfig.json paths
# Ensure all imports use correct aliases
# Run type check
npm run type-check
```

**Issue: Tests failing**
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests in verbose mode
npm test -- --verbose
```

**Issue: MongoDB connection failed**
```bash
# Check MongoDB is running
mongosh

# Check connection string in .env
# Ensure network access
```

## Additional Resources

- [Architecture Overview](../architecture/overview.md)
- [CQRS Guide](../architecture/cqrs.md)
- [Event-Driven Architecture](../architecture/events.md)
- [Testing Guide](./testing-guide.md)
- [Deployment Guide](./deployment-guide.md)
