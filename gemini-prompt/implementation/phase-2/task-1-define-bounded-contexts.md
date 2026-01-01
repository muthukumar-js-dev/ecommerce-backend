# Phase 2 - Task 1: Define Bounded Contexts & Domain Model

**Duration:** 4-5 days  
**Priority:** Critical (Blocking)  
**Dependencies:** Phase 1 Complete

---

## Objective

Conduct domain analysis to identify bounded contexts, define ubiquitous language, establish aggregate boundaries, and create a comprehensive domain model that will guide the entire architectural refactor.

---

## Context

Domain-Driven Design (DDD) starts with understanding the business domain. We need to:
- Identify natural boundaries in the business
- Define a common language with domain experts
- Map relationships between contexts
- Establish aggregate boundaries
- Document domain rules and invariants

This is a **collaborative exercise** requiring input from:
- Product owners
- Business stakeholders
- Development team
- Domain experts (if available)

---

## Deliverables

### 1. Bounded Context Map

**Create `docs/architecture/bounded-contexts.md`:**

```markdown
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
- SMS service (for 2FA)

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
- SMS service (Twilio)

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
```

### 2. Ubiquitous Language Glossary

**Create `docs/architecture/ubiquitous-language.md`:**

```markdown
# Ubiquitous Language Glossary

## Purpose

This glossary defines the common language used across the e-commerce domain. All team members (developers, product owners, stakeholders) should use these terms consistently.

---

## User Management

**User:** A person who has registered an account in the system

**Customer:** A user who makes purchases (role: user)

**Seller:** A user who lists products for sale (role: seller)

**Admin:** A user with administrative privileges (role: admin)

**Authentication:** The process of verifying user identity

**Authorization:** The process of determining user permissions

**Session:** A period of authenticated user activity

**Profile:** User's personal information and preferences

---

## Product Catalog

**Product:** An item available for purchase

**SKU (Stock Keeping Unit):** Unique identifier for a product variant

**Category:** A classification grouping for products

**Brand:** The manufacturer or brand name of a product

**Inventory:** The quantity of a product available for sale

**Out of Stock:** Product with zero inventory

**Price:** The selling price of a product

**Discount:** A reduction in price

**Product Image:** Visual representation of a product

---

## Shopping Cart

**Cart:** A temporary collection of products a user intends to purchase

**Cart Item:** A product in the cart with quantity

**Wishlist:** A saved list of products for future consideration

**Subtotal:** Sum of all cart items before discounts

**Total:** Final amount after discounts and taxes

**Abandoned Cart:** A cart that hasn't been checked out within a time period

---

## Order Management

**Order:** A confirmed purchase request

**Order Item:** A product within an order

**Order Number:** Unique identifier for an order (user-facing)

**Order Status:** Current state of an order (ordered, processing, shipped, delivered)

**Shipping Address:** Delivery location for an order

**Billing Address:** Payment address for an order

**Tracking Number:** Shipment tracking identifier

**Delivery Date:** Expected or actual delivery date

**Return:** Process of sending back a delivered product

**Refund:** Money returned to customer

**Cancellation:** Voiding an order before shipment

---

## Payment

**Payment:** A financial transaction for an order

**Payment Method:** How payment is made (card, cash on delivery, UPI)

**Transaction:** A single payment operation

**Authorization:** Reserving funds on a payment method

**Capture:** Actually charging the payment method

**Refund:** Returning money to the customer

**Payment Gateway:** External service processing payments (Stripe)

**Payment Status:** Current state (pending, authorized, captured, failed, refunded)

---

## Notification

**Notification:** A message sent to a user

**Channel:** Medium of notification (email, SMS, push)

**Template:** Predefined format for notifications

**Notification Type:** Category of notification (order status, promotion, etc.)

---

## Business Rules

**Invariant:** A rule that must always be true

**Aggregate:** A cluster of domain objects treated as a unit

**Aggregate Root:** The entry point to an aggregate

**Domain Event:** Something that happened in the domain

**Command:** An intention to change state

**Query:** A request for information

---

## Technical Terms

**Bounded Context:** A boundary within which a model is defined

**Ubiquitous Language:** Common vocabulary used by all team members

**Anti-Corruption Layer:** Translation layer for external systems

**Repository:** Abstraction for data access

**Value Object:** An immutable object defined by its attributes

**Entity:** An object defined by its identity

```

### 3. Aggregate Design

**Create `docs/architecture/aggregates.md`:**

```markdown
# Aggregate Design

## Principles

1. **Consistency Boundary:** Aggregates enforce business invariants
2. **Transactional Boundary:** Changes within aggregate are atomic
3. **Small Aggregates:** Prefer smaller aggregates for better performance
4. **Reference by ID:** Aggregates reference each other by ID, not object reference

---

## User Aggregate

**Aggregate Root:** User

**Entities:**
- User (root)

**Value Objects:**
- Email
- Password (hashed)
- PhoneNumber
- Address

**Invariants:**
- Email must be unique
- Password must meet complexity requirements
- Seller must have shop details

**Lifecycle:**
1. User registers → UserRegistered event
2. User logs in → UserLoggedIn event
3. User updates profile → UserProfileUpdated event
4. User changes role → UserRoleChanged event

---

## Product Aggregate

**Aggregate Root:** Product

**Entities:**
- Product (root)

**Value Objects:**
- ProductId
- SKU
- Money (price)
- ProductImage
- ProductDetails

**Invariants:**
- Selling price must be <= actual price
- Product must have at least one image
- Out of stock products cannot be purchased

**Lifecycle:**
1. Product created → ProductCreated event
2. Price updated → PriceChanged event
3. Inventory depleted → ProductOutOfStock event
4. Inventory replenished → ProductRestocked event

---

## Order Aggregate

**Aggregate Root:** Order

**Entities:**
- Order (root)
- OrderItem (child)

**Value Objects:**
- OrderId
- OrderNumber
- Money (amounts)
- ShippingAddress
- OrderStatus

**Invariants:**
- Order must have at least one item
- Order total must match sum of items
- Cannot cancel shipped orders
- Cannot modify confirmed orders

**State Machine:**
```
PENDING → CONFIRMED → PAID → PROCESSING → SHIPPED → DELIVERED
   ↓          ↓         ↓         ↓
CANCELLED  CANCELLED  CANCELLED  RETURNED
```

**Lifecycle:**
1. Order placed → OrderPlaced event
2. Payment confirmed → OrderPaid event
3. Order shipped → OrderShipped event
4. Order delivered → OrderDelivered event
5. Order cancelled → OrderCancelled event

---

## Cart Aggregate

**Aggregate Root:** Cart

**Entities:**
- Cart (root)
- CartItem (child)

**Value Objects:**
- CartId
- Money (amounts)
- Quantity

**Invariants:**
- Cart items must reference valid products
- Quantity must be positive
- Maximum 50 items per cart

**Lifecycle:**
1. Item added → ItemAddedToCart event
2. Quantity updated → CartItemQuantityUpdated event
3. Item removed → ItemRemovedFromCart event
4. Cart cleared → CartCleared event

---

## Payment Aggregate

**Aggregate Root:** Payment

**Entities:**
- Payment (root)
- Transaction (child)

**Value Objects:**
- PaymentId
- TransactionId
- Money (amount)
- PaymentStatus

**Invariants:**
- Payment amount must match order total
- Cannot refund more than paid amount
- Payment must be authorized before capture

**State Machine:**
```
INITIATED → AUTHORIZED → CAPTURED → COMPLETED
    ↓           ↓            ↓
  FAILED     FAILED      REFUNDED
```

**Lifecycle:**
1. Payment initiated → PaymentInitiated event
2. Payment authorized → PaymentAuthorized event
3. Payment captured → PaymentCaptured event
4. Payment failed → PaymentFailed event
5. Refund processed → PaymentRefunded event
```

---

## Implementation Steps

### Step 1: Domain Expert Workshops (2 days)

**Activities:**
1. **Event Storming Session**
   - Identify domain events
   - Map event flow
   - Identify aggregates
   - Define commands and queries

2. **Ubiquitous Language Workshop**
   - Define key terms
   - Resolve ambiguities
   - Document business rules
   - Create glossary

3. **Bounded Context Mapping**
   - Identify context boundaries
   - Define context relationships
   - Map data flow
   - Identify shared kernel

### Step 2: Documentation (2 days)

1. Create bounded context documentation
2. Write ubiquitous language glossary
3. Design aggregates
4. Create context map diagrams
5. Document domain events

### Step 3: Validation (1 day)

1. Review with stakeholders
2. Validate with domain experts
3. Get team consensus
4. Finalize documentation

---

## Validation Checklist

- [ ] All bounded contexts identified
- [ ] Context relationships defined
- [ ] Ubiquitous language documented
- [ ] All aggregates designed
- [ ] Aggregate boundaries validated
- [ ] Domain events cataloged
- [ ] Business rules documented
- [ ] Stakeholder approval obtained
- [ ] Team understands the model

---

## Next Steps

After completing this task:
1. Proceed to **Task 2: Implement Domain Layer (User Context)**
2. Use this documentation as reference
3. Refine model as understanding improves

---

**Task Owner:** Tech Lead + Domain Experts  
**Reviewer:** Architect  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
