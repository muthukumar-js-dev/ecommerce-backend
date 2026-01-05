# Bounded Contexts

## Overview

This document defines the bounded contexts for the e-commerce system. Each context represents a distinct area of the business with its own models, rules, and responsibilities.

---

## Context Catalog

### 1. User Management Context

**Purpose:** Manage user accounts, authentication, and authorization

**Responsibilities:**
- User registration and login
- Password management
- Role and permission management
- User profile management
- Session management

**Key Entities:**
- User
- UserProfile
- Role
- Permission
- Session

**Key Value Objects:**
- Email
- Password
- PhoneNumber
- Address

**Domain Events:**
- UserRegistered
- UserLoggedIn
- UserLoggedOut
- UserProfileUpdated
- UserRoleChanged
- PasswordChanged

**External Dependencies:**
- Email service (for verification)
- SMS service (for 2FA - future)

**Upstream Contexts:** None

**Downstream Contexts:**
- Order Management (user info)
- Shopping Cart (user identity)
- Notification (user preferences)

---

### 2. Product Catalog Context

**Purpose:** Manage product information and inventory

**Responsibilities:**
- Product creation and management
- Category and brand management
- Inventory tracking
- Product search and filtering
- Pricing management

**Key Entities:**
- Product
- Category
- Brand
- Inventory

**Key Value Objects:**
- ProductId
- SKU
- Money (price)
- Quantity
- ProductImage

**Domain Events:**
- ProductCreated
- ProductUpdated
- ProductDeleted
- ProductOutOfStock
- ProductRestocked
- PriceChanged

**External Dependencies:**
- Image storage (AWS S3)
- Search engine (future: Elasticsearch)

**Upstream Contexts:**
- User Management (seller info)

**Downstream Contexts:**
- Shopping Cart (product details)
- Order Management (product info)

---

### 3. Shopping Cart Context

**Purpose:** Manage shopping carts and wishlists

**Responsibilities:**
- Add/remove items from cart
- Update item quantities
- Calculate totals and discounts
- Manage wishlists
- Cart persistence

**Key Entities:**
- Cart
- CartItem
- Wishlist

**Key Value Objects:**
- CartId
- Money (amounts)
- Quantity
- Discount

**Domain Events:**
- ItemAddedToCart
- ItemRemovedFromCart
- CartCleared
- ItemMovedToWishlist
- CartAbandoned (future)

**External Dependencies:** None

**Upstream Contexts:**
- User Management (user identity)
- Product Catalog (product info, pricing)

**Downstream Contexts:**
- Order Management (cart checkout)

---

### 4. Order Management Context

**Purpose:** Handle order lifecycle from placement to delivery

**Responsibilities:**
- Order placement
- Order status tracking
- Order cancellation
- Return and refund processing
- Order history

**Key Entities:**
- Order (Aggregate Root)
- OrderItem
- ShippingAddress
- OrderStatus
- Return

**Key Value Objects:**
- OrderId
- OrderNumber
- Money (total, subtotal)
- TrackingNumber
- DeliveryDate

**Domain Events:**
- OrderPlaced
- OrderConfirmed
- OrderPaid
- OrderShipped
- OrderDelivered
- OrderCancelled
- OrderReturned
- ReturnRequested
- ReturnApproved

**External Dependencies:**
- Shipping service
- Inventory service

**Upstream Contexts:**
- User Management (user info)
- Product Catalog (product info)
- Shopping Cart (cart items)
- Payment (payment confirmation)

**Downstream Contexts:**
- Notification (order updates)

---

### 5. Payment Context

**Purpose:** Handle payment processing and financial transactions

**Responsibilities:**
- Payment processing
- Payment method management
- Refund processing
- Payment history
- Transaction reconciliation

**Key Entities:**
- Payment (Aggregate Root)
- PaymentMethod
- Transaction
- Refund

**Key Value Objects:**
- PaymentId
- TransactionId
- Money (amount)
- PaymentStatus
- StripeCustomerId

**Domain Events:**
- PaymentInitiated
- PaymentAuthorized
- PaymentCaptured
- PaymentFailed
- PaymentRefunded
- RefundInitiated
- RefundCompleted

**External Dependencies:**
- Stripe API
- Payment gateway

**Upstream Contexts:**
- Order Management (order total)
- User Management (customer info)

**Downstream Contexts:**
- Order Management (payment confirmation)
- Notification (payment receipts)

---

### 6. Notification Context

**Purpose:** Send notifications to users via various channels

**Responsibilities:**
- Email notifications
- SMS notifications (future)
- Push notifications (future)
- Notification templates
- Notification preferences
- Notification history

**Key Entities:**
- Notification
- NotificationTemplate
- NotificationPreference

**Key Value Objects:**
- NotificationId
- NotificationType
- Channel (email, sms, push)

**Domain Events:**
- NotificationSent
- NotificationFailed
- NotificationRead

**External Dependencies:**
- Email service (SendGrid, AWS SES)
- SMS service (Twilio - future)

**Upstream Contexts:**
- User Management (user contact info)
- Order Management (order updates)
- Payment (payment receipts)

**Downstream Contexts:** None

---

## Context Relationships

### Partnership
- Order Management ↔ Payment (tight collaboration)

### Customer-Supplier
- Product Catalog → Shopping Cart
- Shopping Cart → Order Management
- Order Management → Notification

### Conformist
- All contexts → User Management (for user identity)

### Anti-Corruption Layer
- Payment Context (Stripe integration)
- Notification Context (Email service)

---

## Shared Kernel

**Common Types:**
- ID (string)
- Email
- Money
- Timestamp
- Result<T, E>

**Common Errors:**
- ValidationError
- NotFoundError
- AuthenticationError
- BusinessRuleError

---

## Context Map Diagram

```
┌─────────────────┐
│      User       │
│   Management    │
└────────┬────────┘
         │ (provides identity)
         ├──────────────┬──────────────┬──────────────┐
         │              │              │              │
         ▼              ▼              ▼              ▼
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  Product   │  │  Shopping  │  │   Order    │  │  Payment   │
│  Catalog   │  │    Cart    │  │ Management │  │            │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │               │
      └───────────────┴───────────────┴───────────────┘
                              │
                              ▼
                      ┌────────────┐
                      │Notification│
                      └────────────┘
```

---

## Integration Patterns

### Synchronous Communication
- User Management → All contexts (authentication/authorization)
- Product Catalog → Shopping Cart (product validation)
- Shopping Cart → Order Management (checkout)

### Asynchronous Communication (via Domain Events)
- Order Management → Notification (order status updates)
- Payment → Order Management (payment confirmation)
- Product Catalog → Notification (stock alerts - future)

### Data Consistency
- **Strong Consistency:** Within aggregate boundaries
- **Eventual Consistency:** Across bounded contexts
- **Event Sourcing:** Payment and Order contexts (future consideration)

---

## Context Boundaries

### Physical Boundaries (Current)
- All contexts in single codebase (modular monolith)
- Separated by domain folders
- Shared infrastructure layer

### Logical Boundaries
- Clear module separation
- No direct cross-context entity references
- Communication via IDs and events

### Future Evolution
- Potential microservices: Payment, Notification
- Keep core contexts (User, Product, Order, Cart) together
- Extract supporting contexts as services

---

## Bounded Context Checklist

- [x] User Management Context - Defined
- [x] Product Catalog Context - Defined
- [x] Shopping Cart Context - Defined
- [x] Order Management Context - Defined
- [x] Payment Context - Defined
- [x] Notification Context - Defined
- [x] Context relationships mapped
- [x] Shared kernel identified
- [x] Integration patterns defined
