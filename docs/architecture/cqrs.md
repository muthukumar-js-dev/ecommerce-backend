# CQRS Implementation Guide

## Overview

Command Query Responsibility Segregation (CQRS) is a pattern that separates read and write operations into different models. This separation allows us to optimize each side independently.

## Core Concepts

### Commands
Commands represent **intentions to change state**. They are imperative and return minimal data.

**Characteristics:**
- Named with verbs (PlaceOrder, UpdateUser, CancelOrder)
- Contain all data needed for the operation
- Return success/failure with minimal data
- Can fail due to business rule violations
- Processed synchronously

### Queries
Queries represent **requests for data**. They never modify state.

**Characteristics:**
- Named with nouns (GetOrderHistory, ListProducts)
- Contain filter/pagination parameters
- Return read models (DTOs)
- Never fail due to business rules
- Can be cached
- Processed synchronously or asynchronously

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Write Side                         │
│                                                     │
│  Command → Handler → Aggregate → Repository        │
│                         ↓                           │
│                    Domain Events                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ↓
            ┌──────────────────────┐
            │     Event Bus        │
            └──────────┬───────────┘
                       │
                       ↓
            ┌──────────────────────┐
            │   Event Handlers     │
            └──────────┬───────────┘
                       │
                       ↓
┌──────────────────────▼──────────────────────────────┐
│                  Read Side                          │
│                                                     │
│  Query → Handler → Read Model Repository           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Implementation

### 1. Commands

#### Command Definition
```typescript
// src/application/commands/order/place-order.command.ts
export class PlaceOrderCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly items: OrderItemDTO[],
    public readonly shippingAddressId: string,
    public readonly paymentMethodId: string
  ) {
    super('PlaceOrderCommand');
  }
}
```

#### Command Handler
```typescript
// src/application/commands/order/place-order.handler.ts
export class PlaceOrderHandler implements CommandHandler<PlaceOrderCommand, OrderResult> {
  constructor(
    private orderRepository: IOrderRepository,
    private userRepository: IUserRepository,
    private productRepository: IProductRepository
  ) {}

  async handle(command: PlaceOrderCommand): AsyncResult<OrderResult> {
    // 1. Validate user can place order
    const user = await this.userRepository.findById(command.userId);
    if (!user || !user.canPlaceOrder) {
      return failure(new BusinessRuleError('User cannot place order'));
    }

    // 2. Validate products and create order items
    const orderItems: OrderItem[] = [];
    for (const item of command.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product || !product.hasAvailableQuantity(item.quantity)) {
        return failure(new BusinessRuleError('Product not available'));
      }
      
      orderItems.push(OrderItem.create({
        productId: product.id,
        productName: product.title,
        quantity: Quantity.create(item.quantity),
        price: product.sellingPrice
      }));
    }

    // 3. Get shipping address
    const address = await this.addressRepository.findById(command.shippingAddressId);
    if (!address) {
      return failure(new BusinessRuleError('Invalid shipping address'));
    }

    // 4. Create order aggregate
    const order = Order.create(
      command.userId,
      orderItems,
      address,
      generateId()
    );

    // 5. Save order (this will publish domain events)
    await this.orderRepository.save(order);

    // 6. Return result
    return success({
      orderId: order.id.value,
      orderNumber: order.orderNumber.value,
      total: order.totalAmount.amount
    });
  }
}
```

#### Command Registration
```typescript
// src/infrastructure/cqrs/cqrs-module.ts
this.commandBus.register(
  'PlaceOrderCommand',
  new PlaceOrderHandler(orderRepo, userRepo, productRepo)
);
```

### 2. Queries

#### Query Definition
```typescript
// src/application/queries/order/get-order-history.query.ts
export class GetOrderHistoryQuery extends BaseQuery {
  constructor(
    public readonly userId: string,
    public readonly pagination?: PaginationParams
  ) {
    super('GetOrderHistoryQuery');
  }
}
```

#### Query Handler
```typescript
// src/application/queries/order/get-order-history.handler.ts
export class GetOrderHistoryHandler implements QueryHandler<GetOrderHistoryQuery, OrderHistoryResult> {
  constructor(
    private orderReadRepository: IOrderReadRepository
  ) {}

  async handle(query: GetOrderHistoryQuery): AsyncResult<OrderHistoryResult> {
    // Query denormalized read model
    const orders = await this.orderReadRepository.findByUserId(
      query.userId,
      query.pagination
    );

    return success({
      orders: orders.map(o => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        status: o.status,
        placedAt: o.placedAt,
        items: o.items
      })),
      total: orders.length
    });
  }
}
```

#### Query Registration
```typescript
// src/infrastructure/cqrs/cqrs-module.ts
this.queryBus.register(
  'GetOrderHistoryQuery',
  new GetOrderHistoryHandler(orderReadRepo)
);
```

### 3. Read Models

#### Read Model Schema
```typescript
// src/infrastructure/database/mongodb/read-models/order-read.model.ts
export interface OrderReadModel {
  id: string;
  orderNumber: string;
  userId: string;
  userName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: string;
  shippingAddress: {
    name: string;
    firstLine: string;
    city: string;
    state: string;
    postalCode: string;
  };
  placedAt: Date;
  updatedAt: Date;
}
```

#### Read Model Update (via Event Handler)
```typescript
// src/infrastructure/events/handlers/order-placed.handler.ts
export class UpdateOrderReadModelHandler implements EventHandler<OrderPlaced> {
  constructor(
    private orderReadRepository: IOrderReadRepository
  ) {}

  async handle(event: OrderPlaced): Promise<void> {
    // Create denormalized read model
    await this.orderReadRepository.create({
      id: event.payload.orderId,
      orderNumber: event.payload.orderNumber,
      userId: event.payload.userId,
      userName: event.payload.userName,
      items: event.payload.items,
      total: event.payload.totalAmount,
      status: 'PENDING',
      placedAt: event.payload.placedAt,
      updatedAt: new Date()
    });
  }
}
```

## Eventual Consistency

### How It Works

1. **Command Executes**
   ```
   PlaceOrderCommand → Handler → Order.create() → Repository.save()
   ```

2. **Domain Event Published**
   ```
   OrderPlaced event → Event Bus
   ```

3. **Event Handlers Update Read Models**
   ```
   Event Bus → UpdateOrderReadModelHandler → OrderReadModel.create()
   ```

4. **Query Returns Updated Data**
   ```
   GetOrderHistoryQuery → Handler → OrderReadModel.find()
   ```

### Handling Consistency Window

**Problem:** Read model might not be immediately updated after command.

**Solutions:**

1. **Return Data from Command**
   ```typescript
   // Return essential data immediately
   return success({
     orderId: order.id,
     orderNumber: order.orderNumber
   });
   ```

2. **Client-Side Optimistic Update**
   ```typescript
   // Update UI immediately, sync with server later
   ```

3. **Polling/WebSocket**
   ```typescript
   // Poll for updates or use WebSocket for real-time sync
   ```

## Usage Examples

### Placing an Order

```typescript
// In controller
const command = new PlaceOrderCommand(
  req.user.id,
  req.body.items,
  req.body.shippingAddressId,
  req.body.paymentMethodId
);

const result = await commandBus.execute(command);

if (result.success) {
  res.status(201).json({
    orderId: result.value.orderId,
    orderNumber: result.value.orderNumber
  });
} else {
  res.status(400).json({ error: result.error.message });
}
```

### Querying Order History

```typescript
// In controller
const query = new GetOrderHistoryQuery(
  req.user.id,
  { page: 1, limit: 10 }
);

const result = await queryBus.execute(query);

if (result.success) {
  res.status(200).json(result.value);
} else {
  res.status(500).json({ error: result.error.message });
}
```

## Benefits

### Performance
- **Read Optimization:** Denormalized data for fast queries
- **Write Optimization:** No complex joins during writes
- **Independent Scaling:** Scale reads and writes separately

### Maintainability
- **Clear Separation:** Commands and queries have different concerns
- **Single Responsibility:** Each handler does one thing
- **Testability:** Easy to test in isolation

### Flexibility
- **Multiple Read Models:** Different views of same data
- **Technology Choice:** Different databases for reads and writes
- **Caching:** Easy to cache read models

## Trade-offs

### Complexity
- More code (commands, queries, handlers, read models)
- Event handling infrastructure needed
- Eventual consistency to manage

### Consistency
- Read models may be stale
- Need to handle consistency window
- More complex error scenarios

### When to Use CQRS

**Use CQRS when:**
- ✅ Complex business logic
- ✅ Different read/write performance needs
- ✅ Multiple views of same data
- ✅ Audit trail requirements
- ✅ Scalability requirements

**Don't use CQRS when:**
- ❌ Simple CRUD operations
- ❌ Strong consistency required everywhere
- ❌ Small team with limited experience
- ❌ Rapid prototyping phase

## Best Practices

1. **Keep Commands Small:** One command = one use case
2. **Validate Early:** Validate in command handler before touching domain
3. **Return Minimal Data:** Commands return IDs, not full objects
4. **Optimize Read Models:** Denormalize for query performance
5. **Version Events:** Plan for schema evolution
6. **Monitor Lag:** Track read model update latency
7. **Handle Failures:** Retry event processing on failure

## Related Documentation

- [Event-Driven Architecture](./events.md)
- [Domain Events Catalog](../events/event-catalog.md)
- [Developer Guide](../guides/developer-guide.md)
