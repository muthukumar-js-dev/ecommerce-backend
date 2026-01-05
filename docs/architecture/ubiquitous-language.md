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

**Role:** A set of permissions assigned to a user

**Permission:** A specific action a user is allowed to perform

---

## Product Catalog

**Product:** An item available for purchase

**SKU (Stock Keeping Unit):** Unique identifier for a product variant

**Category:** A classification grouping for products

**Brand:** The manufacturer or brand name of a product

**Inventory:** The quantity of a product available for sale

**Out of Stock:** Product with zero inventory

**Price:** The selling price of a product

**Actual Price:** The original price before discounts

**Selling Price:** The current price after discounts

**Discount:** A reduction in price

**Product Image:** Visual representation of a product

**Product Details:** Descriptive information about a product

**Seller:** The user who owns/created the product

---

## Shopping Cart

**Cart:** A temporary collection of products a user intends to purchase

**Cart Item:** A product in the cart with quantity

**Wishlist:** A saved list of products for future consideration

**Subtotal:** Sum of all cart items before discounts

**Total:** Final amount after discounts and taxes

**Abandoned Cart:** A cart that hasn't been checked out within a time period

**Quantity:** The number of units of a product

**Cart Limit:** Maximum number of items allowed in a cart (50 items)

---

## Order Management

**Order:** A confirmed purchase request

**Order Item:** A product within an order

**Order Number:** Unique identifier for an order (user-facing)

**Order ID:** Internal system identifier for an order

**Order Status:** Current state of an order

**Shipping Address:** Delivery location for an order

**Billing Address:** Payment address for an order

**Tracking Number:** Shipment tracking identifier

**Delivery Date:** Expected or actual delivery date

**Return:** Process of sending back a delivered product

**Refund:** Money returned to customer

**Cancellation:** Voiding an order before shipment

**Order Total:** Final amount to be paid

**Subtotal:** Sum of order items before tax and shipping

---

### Order Status States

**Pending:** Order created but not yet confirmed

**Confirmed:** Order confirmed and awaiting payment

**Paid:** Payment received successfully

**Processing:** Order being prepared for shipment

**Shipped:** Order dispatched for delivery

**Delivered:** Order successfully delivered to customer

**Cancelled:** Order voided before shipment

**Returned:** Order sent back after delivery

---

## Payment

**Payment:** A financial transaction for an order

**Payment Method:** How payment is made (card, cash on delivery, UPI, netbanking)

**Transaction:** A single payment operation

**Authorization:** Reserving funds on a payment method

**Capture:** Actually charging the payment method

**Refund:** Returning money to the customer

**Payment Gateway:** External service processing payments (Stripe)

**Payment Status:** Current state of payment

**Stripe Customer ID:** Identifier in Stripe system

**Transaction ID:** Unique identifier for a transaction

---

### Payment Status States

**Initiated:** Payment process started

**Authorized:** Funds reserved but not captured

**Captured:** Funds successfully charged

**Failed:** Payment attempt unsuccessful

**Refunded:** Money returned to customer

**Completed:** Payment fully processed

---

## Notification

**Notification:** A message sent to a user

**Channel:** Medium of notification (email, SMS, push)

**Template:** Predefined format for notifications

**Notification Type:** Category of notification (order status, promotion, etc.)

**Notification Preference:** User's preferred notification settings

**Read Status:** Whether notification has been viewed

**Notification History:** Record of all notifications sent to a user

---

## Business Rules

**Invariant:** A rule that must always be true

**Aggregate:** A cluster of domain objects treated as a unit

**Aggregate Root:** The entry point to an aggregate

**Domain Event:** Something that happened in the domain

**Command:** An intention to change state

**Query:** A request for information

**Business Rule:** A constraint or policy in the domain

**Consistency Boundary:** Scope within which data must be consistent

---

## Technical Terms

**Bounded Context:** A boundary within which a model is defined

**Ubiquitous Language:** Common vocabulary used by all team members

**Anti-Corruption Layer:** Translation layer for external systems

**Repository:** Abstraction for data access

**Value Object:** An immutable object defined by its attributes

**Entity:** An object defined by its identity

**Use Case:** A specific business operation

**DTO (Data Transfer Object):** Object for transferring data between layers

**Service:** Orchestrator of use cases

---

## Common Value Objects

**Email:** Valid email address format

**Password:** Hashed password meeting security requirements

**Phone Number:** Valid phone number format

**Money:** Amount with currency (currently INR)

**Address:** Physical location with street, city, state, zip

**ID:** Unique identifier (string)

**Timestamp:** Date and time of an event

**Quantity:** Positive integer representing count

---

## Domain Events

### User Events
- **UserRegistered:** New user account created
- **UserLoggedIn:** User authenticated successfully
- **UserLoggedOut:** User session ended
- **UserProfileUpdated:** User information changed
- **UserRoleChanged:** User permissions modified
- **PasswordChanged:** User password updated

### Product Events
- **ProductCreated:** New product added to catalog
- **ProductUpdated:** Product information modified
- **ProductDeleted:** Product removed from catalog
- **ProductOutOfStock:** Inventory depleted
- **ProductRestocked:** Inventory replenished
- **PriceChanged:** Product price updated

### Cart Events
- **ItemAddedToCart:** Product added to shopping cart
- **ItemRemovedFromCart:** Product removed from cart
- **CartCleared:** All items removed from cart
- **CartItemQuantityUpdated:** Item quantity changed
- **ItemMovedToWishlist:** Product moved from cart to wishlist

### Order Events
- **OrderPlaced:** New order created
- **OrderConfirmed:** Order validated and confirmed
- **OrderPaid:** Payment received for order
- **OrderShipped:** Order dispatched for delivery
- **OrderDelivered:** Order received by customer
- **OrderCancelled:** Order voided
- **OrderReturned:** Order sent back
- **ReturnRequested:** Customer initiated return
- **ReturnApproved:** Return request accepted

### Payment Events
- **PaymentInitiated:** Payment process started
- **PaymentAuthorized:** Funds reserved
- **PaymentCaptured:** Funds charged
- **PaymentFailed:** Payment unsuccessful
- **PaymentRefunded:** Money returned
- **RefundInitiated:** Refund process started
- **RefundCompleted:** Refund processed successfully

### Notification Events
- **NotificationSent:** Message delivered
- **NotificationFailed:** Delivery unsuccessful
- **NotificationRead:** User viewed notification

---

## Business Constraints

### User Management
- Email must be unique across all users
- Password must be at least 8 characters
- Sellers must have shop details
- Users can have only one active session

### Product Catalog
- Selling price must be ≤ actual price
- Product must have at least one image
- Out of stock products cannot be purchased
- SKU must be unique per seller

### Shopping Cart
- Maximum 50 items per cart
- Quantity must be positive
- Cart items must reference valid products
- Cart total must match sum of items

### Order Management
- Order must have at least one item
- Order total must match sum of items
- Cannot cancel shipped orders
- Cannot modify confirmed orders
- Shipping address is required

### Payment
- Payment amount must match order total
- Cannot refund more than paid amount
- Payment must be authorized before capture
- One payment per order

---

## Anti-Patterns to Avoid

**God Object:** Don't create objects that know/do too much

**Anemic Domain Model:** Don't create entities with only getters/setters

**Transaction Script:** Don't put all business logic in services

**Leaky Abstraction:** Don't expose internal implementation details

**Cross-Context Dependencies:** Don't directly reference entities across contexts

---

## Glossary Usage Guidelines

1. **Consistency:** Always use these exact terms in code, documentation, and communication
2. **Precision:** Use specific terms rather than generic ones
3. **Context:** Understand which bounded context a term belongs to
4. **Evolution:** Update glossary as domain understanding improves
5. **Collaboration:** Involve domain experts when adding new terms

---

**Last Updated:** 2026-01-04  
**Maintained By:** Development Team + Domain Experts  
**Review Frequency:** Quarterly or when domain changes
