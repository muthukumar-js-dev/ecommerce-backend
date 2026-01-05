# Domain Events Catalog

## Overview

This document catalogs all domain events in the e-commerce system, their schemas, handlers, and usage.

## Event Naming Convention

- Past tense (OrderPlaced, not PlaceOrder)
- Specific and descriptive
- Include context (UserRegistered, not Registered)

## User Context Events

### UserRegistered (v1)

**Description:** Raised when a new user successfully registers in the system.

**Payload:**
```typescript
{
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  registeredAt: Date;
}
```

**Handlers:**
- `CreateWishlistHandler` - Creates empty wishlist for new user
- `SendWelcomeEmailHandler` - Sends welcome email
- `UpdateUserReadModelHandler` - Updates user read model

**Triggered By:** User.create()

**Example:**
```typescript
new UserRegistered({
  userId: 'user-123',
  email: 'john@example.com',
  name: 'John Doe',
  role: UserRole.USER,
  registeredAt: new Date()
})
```

---

### UserLoggedIn (v1)

**Description:** Raised when a user successfully logs into the system.

**Payload:**
```typescript
{
  userId: string;
  email: string;
  loginAt: Date;
  ipAddress?: string;
  userAgent?: string;
}
```

**Handlers:**
- `UpdateLastLoginHandler` - Updates last login timestamp
- `UpdateUserReadModelHandler` - Updates read model

**Triggered By:** User.recordLogin()

---

### UserRoleChanged (v1)

**Description:** Raised when a user's role is changed (e.g., USER → SELLER).

**Payload:**
```typescript
{
  userId: string;
  previousRole: UserRole;
  newRole: UserRole;
  changedAt: Date;
  changedBy: string;
}
```

**Handlers:**
- `UpdateUserReadModelHandler` - Updates read model
- `NotifyUserHandler` - Sends notification about role change

**Triggered By:** User.changeRole()

---

## Product Context Events

### ProductCreated (v1)

**Description:** Raised when a new product is added to the catalog.

**Payload:**
```typescript
{
  productId: string;
  sku: string;
  title: string;
  category: string;
  price: number;
  sellerId: string;
  brand: string;
  description: string;
  images: string[];
  createdAt: Date;
}
```

**Handlers:**
- `UpdateProductReadModelHandler` - Creates product read model
- `IndexProductHandler` - Indexes product for search
- `NotifySellerHandler` - Notifies seller of product creation

**Triggered By:** Product.create()

---

### ProductOutOfStock (v1)

**Description:** Raised when a product's inventory reaches zero.

**Payload:**
```typescript
{
  productId: string;
  sku: string;
  title: string;
  sellerId: string;
  outOfStockAt: Date;
}
```

**Handlers:**
- `UpdateProductReadModelHandler` - Marks product as out of stock
- `NotifySellerHandler` - Alerts seller to restock
- `RemoveFromRecommendationsHandler` - Removes from active recommendations

**Triggered By:** Product.markOutOfStock()

---

### PriceChanged (v1)

**Description:** Raised when a product's price is updated.

**Payload:**
```typescript
{
  productId: string;
  sku: string;
  oldPrice: number;
  newPrice: number;
  changedAt: Date;
  changedBy: string;
}
```

**Handlers:**
- `UpdateProductReadModelHandler` - Updates price in read model
- `NotifyWishlistUsersHandler` - Notifies users who wishlisted this product
- `UpdatePriceHistoryHandler` - Records price change for analytics

**Triggered By:** Product.updatePrice()

---

## Order Context Events

### OrderPlaced (v1)

**Description:** Raised when a customer successfully places an order.

**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  itemCount: number;
  shippingAddress: {
    name: string;
    firstLine: string;
    city: string;
    state: string;
    postalCode: string;
  };
  placedAt: Date;
}
```

**Handlers:**
- `UpdateOrderReadModelHandler` - Creates order read model
- `ReserveInventoryHandler` - Reserves product inventory
- `SendOrderConfirmationHandler` - Sends confirmation email
- `UpdateUserOrderCountHandler` - Increments user's order count
- `NotifySellerHandler` - Notifies sellers of new orders

**Triggered By:** Order.create()

**Example:**
```typescript
new OrderPlaced({
  orderId: 'order-123',
  orderNumber: 'ORD-2024-001',
  userId: 'user-123',
  userName: 'John Doe',
  userEmail: 'john@example.com',
  items: [{
    productId: 'prod-456',
    productName: 'Product Name',
    quantity: 2,
    price: 100
  }],
  totalAmount: 200,
  itemCount: 1,
  shippingAddress: {...},
  placedAt: new Date()
})
```

---

### OrderConfirmed (v1)

**Description:** Raised when an order is confirmed (payment verified).

**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  userId: string;
  confirmedAt: Date;
}
```

**Handlers:**
- `UpdateOrderReadModelHandler` - Updates order status
- `SendConfirmationEmailHandler` - Sends confirmation email
- `StartFulfillmentHandler` - Initiates fulfillment process

**Triggered By:** Order.confirm()

---

### OrderPaid (v1)

**Description:** Raised when payment for an order is successfully processed.

**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  userId: string;
  paymentId: string;
  amount: number;
  paidAt: Date;
}
```

**Handlers:**
- `UpdateOrderReadModelHandler` - Updates payment status
- `SendPaymentReceiptHandler` - Sends payment receipt
- `ReleaseInventoryHandler` - Confirms inventory reservation

**Triggered By:** Order.markAsPaid()

---

### OrderShipped (v1)

**Description:** Raised when an order is shipped to the customer.

**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  userId: string;
  trackingNumber: string;
  carrier: string;
  shippedAt: Date;
  estimatedDelivery: Date;
}
```

**Handlers:**
- `UpdateOrderReadModelHandler` - Updates shipping status
- `SendShippingNotificationHandler` - Sends tracking info to customer
- `UpdateDeliveryEstimateHandler` - Updates delivery estimate

**Triggered By:** Order.ship()

---

### OrderDelivered (v1)

**Description:** Raised when an order is successfully delivered.

**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  userId: string;
  deliveredAt: Date;
}
```

**Handlers:**
- `UpdateOrderReadModelHandler` - Updates delivery status
- `SendDeliveryConfirmationHandler` - Sends delivery confirmation
- `RequestReviewHandler` - Requests product review from customer

**Triggered By:** Order.deliver()

---

### OrderCancelled (v1)

**Description:** Raised when an order is cancelled by customer or system.

**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  userId: string;
  reason?: string;
  cancelledAt: Date;
  cancelledBy: string;
}
```

**Handlers:**
- `UpdateOrderReadModelHandler` - Updates order status
- `RestoreInventoryHandler` - Restores reserved inventory
- `ProcessRefundHandler` - Initiates refund if payment was made
- `SendCancellationEmailHandler` - Sends cancellation notification
- `UpdateUserOrderCountHandler` - Decrements user's order count

**Triggered By:** Order.cancel()

---

### OrderReturned (v1)

**Description:** Raised when a delivered order is returned by customer.

**Payload:**
```typescript
{
  orderId: string;
  orderNumber: string;
  userId: string;
  reason: string;
  returnedAt: Date;
}
```

**Handlers:**
- `UpdateOrderReadModelHandler` - Updates return status
- `ProcessRefundHandler` - Processes refund
- `RestoreInventoryHandler` - Returns items to inventory
- `UpdateUserReturnCountHandler` - Increments user's return count

**Triggered By:** Order.return()

---

## Event Versioning

### Version Strategy

We use **event versioning** to handle schema changes:

```typescript
// V1
export class OrderPlacedV1 extends DomainEvent {
  constructor(public readonly payload: {
    orderId: string;
    totalAmount: number;
  }) {
    super('OrderPlaced', payload.orderId, 1);
  }
}

// V2 (added more fields)
export class OrderPlacedV2 extends DomainEvent {
  constructor(public readonly payload: {
    orderId: string;
    orderNumber: string; // NEW
    userId: string;      // NEW
    totalAmount: number;
  }) {
    super('OrderPlaced', payload.orderId, 2);
  }
}
```

### Migration Strategy

1. **Additive Changes:** Add new fields with defaults
2. **Breaking Changes:** Create new version, support both
3. **Deprecation:** Mark old version as deprecated
4. **Removal:** Remove after migration period

## Event Statistics

| Context | Events | Handlers | Avg Handlers/Event |
|---------|--------|----------|-------------------|
| User    | 3      | 6        | 2.0               |
| Product | 3      | 9        | 3.0               |
| Order   | 7      | 21       | 3.0               |
| **Total** | **13** | **36** | **2.8**         |

## Event Flow Examples

### Order Placement Flow

```
1. PlaceOrderCommand
   ↓
2. Order.create()
   ↓
3. OrderPlaced event
   ↓
4. Handlers execute in parallel:
   - UpdateOrderReadModel
   - ReserveInventory
   - SendConfirmationEmail
   - UpdateUserOrderCount
   - NotifySeller
```

### User Registration Flow

```
1. RegisterUserCommand
   ↓
2. User.create()
   ↓
3. UserRegistered event
   ↓
4. Handlers execute:
   - CreateWishlist
   - SendWelcomeEmail
   - UpdateUserReadModel
```

## Best Practices

1. **Event Naming:** Use past tense, be specific
2. **Payload:** Include all data handlers need
3. **Versioning:** Plan for schema evolution
4. **Handlers:** Keep idempotent
5. **Ordering:** Don't rely on event order
6. **Monitoring:** Track event processing metrics

## Related Documentation

- [Event-Driven Architecture](../architecture/events.md)
- [CQRS Implementation](../architecture/cqrs.md)
- [Developer Guide](../guides/developer-guide.md)
