# E-Commerce Backend Architecture

## Overview

This document describes the architecture of the e-commerce backend system after Phase 2 refactoring, implementing Domain-Driven Design (DDD), Clean Architecture, CQRS, and Event-Driven patterns.

## Architecture Style

### Core Principles

1. **Domain-Driven Design (DDD)**
   - Business logic organized by bounded contexts
   - Rich domain models with behavior
   - Ubiquitous language throughout the codebase
   - Aggregates enforce consistency boundaries

2. **Clean Architecture**
   - Separation of concerns across layers
   - Dependency inversion (dependencies point inward)
   - Framework-independent domain layer
   - Testable business logic

3. **CQRS (Command Query Responsibility Segregation)**
   - Separate read and write models
   - Optimized queries for performance
   - Commands for state changes
   - Eventual consistency between models

4. **Event-Driven Architecture**
   - Domain events for cross-aggregate communication
   - Event sourcing for audit trail
   - Asynchronous processing
   - Loose coupling between components

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (REST)                        │
│                   Express Controllers                       │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
          ┌────▼─────┐           ┌────▼─────┐
          │ Commands │           │ Queries  │
          │   Bus    │           │   Bus    │
          └────┬─────┘           └────┬─────┘
               │                      │
      ┌────────▼────────┐    ┌────────▼────────┐
      │ Command Handlers│    │ Query Handlers  │
      └────────┬────────┘    └────────┬────────┘
               │                      │
      ┌────────▼────────┐    ┌────────▼────────┐
      │  Domain Layer   │    │  Read Models    │
      │   (Aggregates)  │    │ (Denormalized)  │
      │                 │    │                 │
      │ • User          │    │ • UserReadModel │
      │ • Product       │    │ • OrderReadModel│
      │ • Order         │    │ • ProductRead   │
      └────────┬────────┘    └─────────────────┘
               │
      ┌────────▼────────┐
      │   Event Bus     │
      │                 │
      │ • Publishes     │
      │ • Subscribes    │
      │ • Stores        │
      └────────┬────────┘
               │
      ┌────────▼────────┐
      │ Event Handlers  │
      │                 │
      │ • Update Reads  │
      │ • Send Emails   │
      │ • Process Logic │
      └─────────────────┘
```

## Layer Responsibilities

### 1. Presentation Layer (`src/infrastructure/http`)

**Responsibilities:**
- HTTP request/response handling
- Input validation and sanitization
- Authentication and authorization
- Request mapping to commands/queries
- Response formatting

**Key Components:**
- Controllers (User, Product, Order, etc.)
- Middleware (auth, error handling, logging)
- Route definitions
- DTOs for API contracts

**Example:**
```typescript
// src/infrastructure/http/controllers/order.controller.ts
@Post('/orders')
async placeOrder(req: Request, res: Response) {
  const command = new PlaceOrderCommand(
    req.user.id,
    req.body.items,
    req.body.shippingAddressId,
    req.body.paymentMethodId
  );
  
  const result = await this.commandBus.execute(command);
  
  if (result.success) {
    res.status(201).json(result.value);
  } else {
    res.status(400).json({ error: result.error });
  }
}
```

### 2. Application Layer (`src/application`)

**Responsibilities:**
- Use case orchestration
- Command and query handling
- Transaction management
- Saga coordination
- Application services

**Key Components:**
- Commands and Command Handlers
- Queries and Query Handlers
- Application Services
- Sagas (PlaceOrderSaga)
- DTOs for internal communication

**Example:**
```typescript
// src/application/commands/order/place-order.handler.ts
export class PlaceOrderHandler implements CommandHandler<PlaceOrderCommand> {
  async handle(command: PlaceOrderCommand): AsyncResult<OrderResult> {
    // 1. Validate user can place order
    // 2. Check product availability
    // 3. Create order aggregate
    // 4. Persist order
    // 5. Publish OrderPlaced event
    // 6. Return result
  }
}
```

### 3. Domain Layer (`src/domain`)

**Responsibilities:**
- Business logic and rules
- Aggregate roots and entities
- Value objects
- Domain events
- Domain services
- Specifications

**Key Components:**
- Aggregates (User, Product, Order)
- Value Objects (Email, Money, SKU)
- Domain Events (UserRegistered, OrderPlaced)
- Domain Services (UserDomainService)
- Specifications (UserCanPlaceOrderSpec)

**Example:**
```typescript
// src/domain/order/aggregates/order.aggregate.ts
export class Order extends AggregateRoot<OrderProps> {
  confirm(): void {
    if (!this.canBeConfirmed()) {
      throw new BusinessRuleError('Order cannot be confirmed');
    }
    
    this.props.status = OrderStatus.confirmed();
    this.addDomainEvent(new OrderConfirmed({
      orderId: this.id,
      confirmedAt: new Date()
    }));
  }
}
```

### 4. Infrastructure Layer (`src/infrastructure`)

**Responsibilities:**
- Database access (repositories)
- External service integration
- Event bus and event store
- CQRS infrastructure
- Messaging and queues

**Key Components:**
- Repositories (UserRepository, OrderRepository)
- Event Bus and Event Store
- External Adapters (Stripe, S3, Email)
- Read Model Repositories
- CQRS Module

**Example:**
```typescript
// src/infrastructure/database/mongodb/repositories/order.repository.ts
export class OrderRepository implements IOrderRepository {
  async save(order: Order): Promise<void> {
    const model = this.toModel(order);
    await OrderModel.create(model);
    
    // Publish domain events
    for (const event of order.domainEvents) {
      await this.eventBus.publish(event);
    }
  }
}
```

## Technology Stack

### Core Technologies
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5+
- **Framework:** Express.js
- **Database:** MongoDB 6+
- **Testing:** Jest

### Key Libraries
- **Validation:** Joi
- **Authentication:** JWT (jsonwebtoken)
- **ODM:** Mongoose
- **Payment:** Stripe SDK
- **Storage:** AWS SDK (S3)
- **Testing:** Supertest, MongoDB Memory Server

### Development Tools
- **Build:** TypeScript Compiler, tsc-alias
- **Linting:** ESLint
- **Formatting:** Prettier
- **API Docs:** Swagger/OpenAPI

## Design Patterns

### 1. Repository Pattern
Abstracts data access, allowing domain layer to remain persistence-ignorant.

### 2. Unit of Work
Manages transactions and ensures consistency (via Mongoose sessions).

### 3. Specification Pattern
Encapsulates business rules for reusability and testability.

### 4. Saga Pattern
Coordinates long-running transactions across aggregates.

### 5. Anti-Corruption Layer
Protects domain from external service changes via adapters.

### 6. Circuit Breaker
Prevents cascading failures in external service calls.

## Key Architectural Decisions

### Why DDD?
- Complex business logic requires rich domain models
- Multiple bounded contexts (User, Product, Order)
- Need for ubiquitous language
- Business rules change frequently

### Why CQRS?
- Different read and write performance requirements
- Complex queries need denormalized data
- Write operations need strong consistency
- Read scalability requirements

### Why Event-Driven?
- Loose coupling between aggregates
- Audit trail requirements
- Asynchronous processing needs
- Integration with external systems

### Why Clean Architecture?
- Framework independence
- Testability
- Maintainability
- Clear separation of concerns

## Bounded Contexts

### User Context
- User registration and authentication
- Profile management
- Role management
- Wishlist

### Product Context
- Product catalog
- Inventory management
- Pricing
- Reviews

### Order Context
- Order placement
- Order lifecycle
- Payment processing
- Shipping

### Shared Kernel
- Common value objects (Money, ID)
- Common types (Result, Timestamp)
- Common errors (BusinessRuleError)

## Data Flow

### Write Flow (Command)
```
1. API Request → Controller
2. Controller → Create Command
3. Command → CommandBus
4. CommandBus → Command Handler
5. Handler → Domain Aggregate
6. Aggregate → Apply Business Rules
7. Aggregate → Raise Domain Events
8. Handler → Repository.save()
9. Repository → Persist to DB
10. Repository → Publish Events
11. Event Handlers → Update Read Models
12. Response → Client
```

### Read Flow (Query)
```
1. API Request → Controller
2. Controller → Create Query
3. Query → QueryBus
4. QueryBus → Query Handler
5. Handler → Read Model Repository
6. Repository → Query Denormalized Data
7. Response → Client
```

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Read replicas for queries
- Event bus can be distributed (future: RabbitMQ/Kafka)

### Performance Optimization
- Read models optimized for queries
- Caching layer (future: Redis)
- Connection pooling
- Indexed queries

### Monitoring
- Application metrics
- Event processing metrics
- Database performance
- External service health

## Security

### Authentication
- JWT-based authentication
- Token expiration and refresh
- Role-based access control (RBAC)

### Authorization
- Route-level guards
- Resource-level permissions
- Admin-only operations

### Data Protection
- Password hashing (bcrypt)
- Input validation and sanitization
- SQL injection prevention (via Mongoose)
- XSS protection (via helmet)

## Next Steps

For detailed information, see:
- [CQRS Implementation](./cqrs.md)
- [Event-Driven Architecture](./events.md)
- [Bounded Contexts](./bounded-contexts.md)
- [Aggregates](./aggregates.md)
- [Developer Guide](../guides/developer-guide.md)
