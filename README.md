# E-Commerce Backend Platform

> A production-ready, enterprise-grade e-commerce backend built with modern software architecture patterns

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

---

## 📋 Table of Contents

- [What This Application Does](#-what-this-application-does)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [Application Flow](#-application-flow)
- [Coding Guidelines](#-coding-guidelines)
- [Common Tasks](#-common-tasks)
- [Common Errors & Fixes](#-common-errors--fixes)
- [Contribution Workflow](#-contribution-workflow)
- [Notes for New Developers](#-notes-for-new-developers)
- [Additional Resources](#-additional-resources)

---

## 🎯 What This Application Does

### Overview

This is a **complete e-commerce backend system** that powers online shopping platforms. Think of it as the "brain" behind websites like Amazon or Shopify - it handles everything from user accounts to product listings, shopping carts, orders, and payments.

### Real-World Problem It Solves

When you shop online, you need:
- A way to browse products
- A shopping cart to collect items
- A secure checkout process
- Order tracking
- Email notifications

This backend provides all these features and more, ready to be connected to any frontend (web, mobile app, etc.).

### Key Features

✅ **User Management**
- User registration and login (with JWT authentication)
- Profile management
- Role-based access (User, Admin, Seller)
- Wishlist functionality

✅ **Product Catalog**
- Product creation and management
- Product reviews and ratings
- Inventory tracking
- Search and filtering

✅ **Shopping Experience**
- Shopping cart management
- Multiple shipping addresses
- Order placement and tracking
- Order history

✅ **Payment Processing**
- Stripe payment integration
- Secure payment handling
- Payment service (microservice)

✅ **Notifications**
- Email notifications for orders
- Notification service (microservice)
- Event-driven messaging

✅ **Advanced Features**
- Event-driven architecture (Kafka)
- CQRS pattern for scalability
- Domain-Driven Design (DDD)
- Microservices architecture
- API documentation (Swagger)
- Comprehensive testing suite

---

## 🛠 Tech Stack

### Backend Framework & Runtime

| Technology | Version | Why We Use It |
|------------|---------|---------------|
| **Node.js** | 18+ | JavaScript runtime that lets us run JavaScript on the server. Fast, efficient, and has a huge ecosystem of packages. |
| **TypeScript** | 5.0+ | Adds types to JavaScript, catching errors before runtime. Makes code more reliable and easier to maintain. |
| **Express.js** | 4.18+ | Lightweight web framework for building REST APIs. Simple, flexible, and widely used. |

### Database

| Technology | Version | Why We Use It |
|------------|---------|---------------|
| **MongoDB** | 6.0+ | NoSQL database that stores data in flexible JSON-like documents. Great for complex data structures and scalability. |
| **Mongoose** | 8.0+ | ODM (Object Data Modeling) library for MongoDB. Makes it easier to work with MongoDB in Node.js. |

### Payment & Storage

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **Stripe** | Payment Processing | Industry-standard payment gateway. Secure, reliable, and easy to integrate. |
| **AWS S3** | File Storage | Cloud storage for product images and other files. Scalable and cost-effective. |

### Messaging & Events

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **Kafka** | Event Streaming | Handles real-time event streaming between services. Ensures reliable message delivery. |
| **Schema Registry** | Event Schema Management | Validates event data structure. Prevents breaking changes in event contracts. |

### Authentication & Security

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **JWT** | Authentication | Stateless authentication using JSON Web Tokens. Secure and scalable. |
| **bcrypt** | Password Hashing | Securely hashes passwords. Industry-standard for password security. |
| **Helmet** | Security Headers | Adds security headers to HTTP responses. Protects against common web vulnerabilities. |
| **CORS** | Cross-Origin Requests | Allows controlled access from different domains. Essential for API security. |

### Testing

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **Jest** | Unit & Integration Testing | Popular testing framework. Fast, feature-rich, and easy to use. |
| **Supertest** | API Testing | Tests HTTP endpoints. Makes it easy to test Express routes. |
| **Playwright** | E2E Testing | End-to-end testing for complete user flows. |
| **Artillery** | Load Testing | Performance testing to ensure the app can handle traffic. |
| **MongoDB Memory Server** | Test Database | In-memory MongoDB for fast, isolated tests. |

### Code Quality

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **ESLint** | Code Linting | Finds and fixes code quality issues. Enforces consistent code style. |
| **Prettier** | Code Formatting | Automatically formats code. Ensures consistent formatting across the team. |
| **TypeScript Compiler** | Type Checking | Catches type errors before runtime. Improves code reliability. |

### Development Tools

| Technology | Purpose | Why We Use It |
|------------|---------|---------------|
| **ts-node-dev** | Development Server | Hot-reloads TypeScript code during development. Speeds up development. |
| **Swagger** | API Documentation | Auto-generates interactive API documentation. Makes it easy to test endpoints. |
| **Docker** | Containerization | Packages the app with all dependencies. Ensures consistency across environments. |
| **Concurrently** | Multi-Process Runner | Runs multiple services simultaneously. Essential for microservices development. |

### Architectural Patterns

- **Domain-Driven Design (DDD)**: Organizes code around business domains
- **CQRS**: Separates read and write operations for better performance
- **Event-Driven Architecture**: Services communicate through events
- **Clean Architecture**: Separates business logic from infrastructure
- **Microservices**: Payment and Notification services are separate

---

## 📁 Project Structure

```
ecommerce-backend/
│
├── src/                           # Main application source code
│   ├── main.ts                    # 🚀 Application entry point (starts here!)
│   │
│   ├── domain/                    # 💼 Business logic (the "what")
│   │   ├── user/                  # User-related business rules
│   │   │   ├── aggregates/        # User aggregate (main entity)
│   │   │   ├── value-objects/     # Email, Password, etc.
│   │   │   ├── events/            # UserRegistered, UserUpdated events
│   │   │   └── specifications/    # Business rules (can user place order?)
│   │   ├── product/               # Product domain
│   │   ├── order/                 # Order domain
│   │   ├── cart/                  # Shopping cart domain
│   │   ├── address/               # Address domain
│   │   ├── review/                # Product review domain
│   │   ├── wishlist/              # Wishlist domain
│   │   └── notification/          # Notification domain
│   │
│   ├── application/               # 🎯 Use cases (the "how")
│   │   ├── commands/              # Write operations (create, update, delete)
│   │   │   ├── user/              # RegisterUser, UpdateProfile, etc.
│   │   │   ├── product/           # CreateProduct, UpdateProduct, etc.
│   │   │   └── order/             # PlaceOrder, CancelOrder, etc.
│   │   ├── queries/               # Read operations (get, list, search)
│   │   │   ├── user/              # GetUserById, ListUsers, etc.
│   │   │   ├── product/           # GetProduct, SearchProducts, etc.
│   │   │   └── order/             # GetOrder, ListOrders, etc.
│   │   ├── use-cases/             # Complex business workflows
│   │   ├── sagas/                 # Long-running transactions (PlaceOrderSaga)
│   │   ├── services/              # Application services
│   │   └── dtos/                  # Data Transfer Objects (API contracts)
│   │
│   ├── infrastructure/            # 🔧 Technical implementation
│   │   ├── http/                  # REST API layer
│   │   │   ├── controllers/       # Handle HTTP requests
│   │   │   ├── routes/            # Define API endpoints
│   │   │   ├── middleware/        # Auth, validation, error handling
│   │   │   └── validation/        # Request validation schemas
│   │   ├── database/              # Database layer
│   │   │   ├── mongodb/           # MongoDB implementation
│   │   │   │   ├── schemas/       # Mongoose schemas
│   │   │   │   ├── repositories/  # Data access layer
│   │   │   │   └── connection.ts  # Database connection
│   │   │   └── read-models/       # CQRS read models
│   │   ├── messaging/             # Event messaging (Kafka)
│   │   │   ├── kafka/             # Kafka producers/consumers
│   │   │   └── consumer-groups/   # Event handlers
│   │   ├── adapters/              # External service integrations
│   │   │   ├── stripe/            # Stripe payment adapter
│   │   │   ├── s3/                # AWS S3 adapter
│   │   │   └── email/             # Email service adapter
│   │   ├── cqrs/                  # CQRS infrastructure
│   │   ├── events/                # Event bus and event store
│   │   ├── saga/                  # Saga orchestration
│   │   ├── cache/                 # Caching layer
│   │   ├── monitoring/            # Metrics and monitoring
│   │   └── tracing/               # Distributed tracing
│   │
│   └── shared/                    # 🔄 Common utilities
│       ├── types/                 # Shared TypeScript types
│       ├── errors/                # Custom error classes
│       ├── utils/                 # Helper functions
│       └── constants/             # Application constants
│
├── payment-service/               # 💳 Payment microservice
│   ├── src/
│   │   ├── domain/                # Payment domain logic
│   │   ├── infrastructure/        # Payment infrastructure
│   │   └── main.ts                # Payment service entry point
│   └── package.json               # Payment service dependencies
│
├── notification-service/          # 📧 Notification microservice
│   ├── src/
│   │   ├── domain/                # Notification domain logic
│   │   ├── infrastructure/        # Notification infrastructure
│   │   └── main.ts                # Notification service entry point
│   └── package.json               # Notification service dependencies
│
├── tests/                         # 🧪 Test files
│   ├── unit/                      # Unit tests (test individual functions)
│   ├── integration/               # Integration tests (test with database)
│   ├── e2e/                       # End-to-end tests (test full workflows)
│   ├── contract/                  # Contract tests (service contracts)
│   └── setup.ts                   # Test configuration
│
├── docs/                          # 📚 Documentation
│   ├── architecture/              # Architecture documentation
│   ├── guides/                    # Developer guides
│   ├── api/                       # API documentation
│   └── deployment/                # Deployment guides
│
├── scripts/                       # 🛠 Utility scripts
│   ├── seed/                      # Database seeding scripts
│   ├── migration/                 # Database migration scripts
│   └── deploy/                    # Deployment scripts
│
├── k8s/                           # ☸️ Kubernetes configuration
├── helm/                          # Helm charts for deployment
├── infrastructure/                # Infrastructure as Code (Terraform)
├── monitoring/                    # Monitoring configuration (Prometheus, Grafana)
├── docker-compose.yml             # Local development with Docker
├── Dockerfile                     # Docker image configuration
│
├── .env.example                   # Example environment variables
├── package.json                   # Main project dependencies
├── tsconfig.json                  # TypeScript configuration
├── jest.config.js                 # Jest testing configuration
├── .eslintrc.js                   # ESLint configuration
└── .prettierrc                    # Prettier configuration
```

### 🔑 Key Directories Explained

#### `src/domain/` - The Business Logic
This is where the **core business rules** live. It doesn't know about databases, HTTP, or any external services. It only knows about business concepts like "User", "Product", "Order".

**Example**: The rule "A user must have a valid email" lives here.

#### `src/application/` - The Use Cases
This layer **orchestrates** the domain logic. It defines what the application can do (use cases).

**Example**: "Register a new user" use case coordinates: validate input → check if email exists → create user → send welcome email.

#### `src/infrastructure/` - The Technical Details
This layer handles **technical concerns**: HTTP requests, database queries, external APIs, etc.

**Example**: The code that actually saves a user to MongoDB lives here.

#### `src/shared/` - Common Code
Utilities and types used across all layers.

**Example**: Result type for error handling, common validation functions.

---

## ✅ Prerequisites

Before you start, make sure you have these installed on your computer:

### Required Software

| Software | Minimum Version | How to Check | Download Link |
|----------|----------------|--------------|---------------|
| **Node.js** | 18.0.0 or higher | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0.0 or higher | `npm --version` | Comes with Node.js |
| **MongoDB** | 6.0.0 or higher | `mongod --version` | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Git** | Any recent version | `git --version` | [git-scm.com](https://git-scm.com/) |

### Optional (for advanced features)

| Software | Purpose | Download Link |
|----------|---------|---------------|
| **Docker** | Run services in containers | [docker.com](https://www.docker.com/) |
| **Kafka** | Event streaming (can use Docker) | [kafka.apache.org](https://kafka.apache.org/) |

### External Accounts (for full functionality)

- **Stripe Account** (for payment processing) - [stripe.com](https://stripe.com/)
- **AWS Account** (for S3 file storage) - [aws.amazon.com](https://aws.amazon.com/)
- **SendGrid Account** (for email notifications) - [sendgrid.com](https://sendgrid.com/)

> **Note for Beginners**: You can start development without Stripe, AWS, or Kafka. The app will work with limited functionality for learning purposes.

---

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
# Clone the project
git clone https://github.com/muthukumar-js-dev/ecommerce-backend.git

# Navigate into the project folder
cd ecommerce-backend
```

### Step 2: Install Dependencies

This project uses **npm workspaces** to manage multiple services (main app + microservices).

```bash
# Install all dependencies (main app + microservices)
npm install
```

This single command installs dependencies for:
- Main application
- Payment service
- Notification service

### Step 3: Set Up Environment Variables

Environment variables store sensitive configuration (database URLs, API keys, etc.).

```bash
# Copy the example environment file
cp .env.example .env
```

Now edit the `.env` file with your configuration:

```env
# Application Settings
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/ecommerce
MONGODB_MAX_POOL_SIZE=50
MONGODB_MIN_POOL_SIZE=10

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# Stripe (Optional - for payment features)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS S3 (Optional - for file uploads)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-ecommerce-bucket

# Email (Optional - for notifications)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_API_KEY=your_email_api_key

# Kafka (Optional - for event streaming)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ecommerce-backend-dev

# Schema Registry (Optional - for Kafka)
SCHEMA_REGISTRY_URL=http://localhost:8081

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS (allowed origins)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Step 4: Start MongoDB

Make sure MongoDB is running on your machine.

**Option A: Local MongoDB**
```bash
# Start MongoDB (if installed locally)
mongod
```

**Option B: Docker**
```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:6
```

### Step 5: Verify Installation

```bash
# Check if TypeScript compiles without errors
npm run type-check

# Run linting
npm run lint
```

If both commands complete without errors, you're ready to go! 🎉

---

## ▶️ Running the Application

### Development Mode (Recommended for Development)

#### Run All Services Concurrently

This starts the main app, payment service, and notification service all at once:

```bash
npm run dev:all
```

You should see output like:
```
[MAIN] 🚀 Starting E-Commerce Backend...
[MAIN] ✓ Connected to MongoDB
[MAIN] ✓ Server running on http://localhost:3000
[PAYMENT] 💳 Payment Service started on port 3001
[NOTIF] 📧 Notification Service started on port 3002
```

#### Run Services Individually

```bash
# Main application only
npm run dev

# Payment service only
npm run dev:payment

# Notification service only
npm run dev:notification

# Payment + Notification (without main app)
npm run dev:services
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Verify the Application is Running

1. **Health Check**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok"}`

2. **API Documentation**
   Open your browser and go to: `http://localhost:3000/api-docs`
   
   You'll see interactive API documentation where you can test endpoints!

3. **Test an Endpoint**
   ```bash
   # Get all products (should return empty array initially)
   curl http://localhost:3000/api/v1/products
   ```

---

## 🧪 Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only (fast, no database)
npm run test:unit

# Integration tests (with database)
npm run test:integration

# E2E tests (full user flows)
npm run test:e2e

# Watch mode (re-runs tests on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Run Tests for Specific Domains

```bash
# Test domain logic
npm run test:domain

# Test CQRS implementation
npm run test:cqrs

# Test Kafka messaging
npm run test:kafka

# Test contract between services
npm run test:contract
```

### Performance Testing

```bash
# Load testing
npm run test:load

# Generate load test report
npm run test:load:report
```

---

## 🔄 Application Flow

### High-Level Architecture

```
┌─────────────┐
│   Client    │ (Web/Mobile App)
│  (Frontend) │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────────────────────┐
│         API Gateway / Router        │
│     (Express.js Controllers)        │
└──────┬──────────────────────────────┘
       │
       ├──── Write Operations ────┐
       │                          │
       ▼                          ▼
┌─────────────┐          ┌─────────────┐
│  Commands   │          │   Queries   │
│    (CQRS)   │          │   (CQRS)    │
└──────┬──────┘          └──────┬──────┘
       │                        │
       ▼                        ▼
┌─────────────┐          ┌─────────────┐
│   Domain    │          │ Read Models │
│ Aggregates  │          │(Denormalized)│
└──────┬──────┘          └─────────────┘
       │
       ▼
┌─────────────┐
│ Event Bus   │
│   (Kafka)   │
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│  Payment   │ │Notification│ │ Read Model │
│  Service   │ │  Service   │ │  Updater   │
└────────────┘ └────────────┘ └────────────┘
```

### Request Flow Example: Placing an Order

Let's follow what happens when a user places an order:

#### 1. **Client Sends Request**
```http
POST /api/v1/orders
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "items": [
    { "productId": "123", "quantity": 2 }
  ],
  "shippingAddressId": "addr_456",
  "paymentMethodId": "pm_789"
}
```

#### 2. **Controller Receives Request**
- Location: `src/infrastructure/http/controllers/order.controller.ts`
- Validates the JWT token (authentication)
- Checks user permissions (authorization)
- Validates request body (using Joi schemas)

#### 3. **Command is Created**
- Location: `src/application/commands/order/place-order.command.ts`
- Creates a `PlaceOrderCommand` with validated data

#### 4. **Command Handler Processes**
- Location: `src/application/commands/order/place-order.handler.ts`
- Steps:
  1. Check if user exists
  2. Verify products are available
  3. Calculate total price
  4. Create Order aggregate (domain logic)
  5. Save order to database
  6. Publish `OrderPlaced` event

#### 5. **Event is Published**
- Location: `src/infrastructure/events/event-bus.ts`
- Event is sent to Kafka
- Event is stored in Event Store (for audit trail)

#### 6. **Event Handlers React**
Multiple services listen for the `OrderPlaced` event:

**Payment Service**:
- Processes payment via Stripe
- Publishes `PaymentProcessed` event

**Notification Service**:
- Sends order confirmation email to customer
- Sends notification to seller

**Read Model Updater**:
- Updates denormalized order view for fast queries

#### 7. **Response Sent to Client**
```json
{
  "success": true,
  "data": {
    "orderId": "order_abc123",
    "status": "pending",
    "total": 99.99,
    "createdAt": "2024-01-19T15:30:00Z"
  }
}
```

### Data Flow Patterns

#### Write Flow (Commands)
```
Request → Controller → Command → Handler → Domain → Repository → Database
                                              ↓
                                         Event Bus → Event Handlers
```

#### Read Flow (Queries)
```
Request → Controller → Query → Handler → Read Model Repository → Database
```

This separation (CQRS) allows:
- **Writes**: Strong consistency, business rules enforced
- **Reads**: Fast queries, optimized for display

---

## 📝 Coding Guidelines

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | `kebab-case.ts` | `user-repository.ts` |
| Classes | `PascalCase` | `UserRepository` |
| Interfaces | `IPascalCase` | `IUserRepository` |
| Functions | `camelCase` | `getUserById` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS` |
| Enums | `PascalCase` | `UserRole` |

### TypeScript Best Practices

#### ✅ DO: Always Use Explicit Types

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): User {
  // ...
}

// ❌ Bad
function getUser(id) {
  // ...
}
```

#### ✅ DO: Avoid `any` Type

```typescript
// ✅ Good
interface ApiResponse {
  data: Product[];
  total: number;
}

function fetchProducts(): Promise<ApiResponse> {
  // ...
}

// ❌ Bad
function fetchProducts(): Promise<any> {
  // ...
}
```

#### ✅ DO: Use Interfaces for Object Shapes

```typescript
// ✅ Good
interface CreateProductDTO {
  name: string;
  price: number;
  description: string;
  sellerId: string;
}

// ❌ Bad - using inline types
function createProduct(data: { name: string; price: number; description: string }) {
  // ...
}
```

#### ✅ DO: Use Enums for Fixed Values

```typescript
// ✅ Good
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

// ❌ Bad - using string literals everywhere
const status = 'pending'; // Easy to make typos!
```

### Error Handling

Always use the **Result pattern** for business logic:

```typescript
// ✅ Good - Using Result pattern
async function createProduct(dto: CreateProductDTO): AsyncResult<Product> {
  // Validation
  if (!dto.price || dto.price <= 0) {
    return failure(new ValidationError('Price must be positive'));
  }

  // Business logic
  const product = Product.create(dto);
  
  // Return success
  return success(product);
}

// Usage
const result = await createProduct(data);
if (result.success) {
  console.log('Product created:', result.data);
} else {
  console.error('Error:', result.error);
}

// ❌ Bad - Throwing errors in business logic
async function createProduct(dto: CreateProductDTO): Promise<Product> {
  if (!dto.price || dto.price <= 0) {
    throw new Error('Price must be positive'); // Don't do this!
  }
  return Product.create(dto);
}
```

### Code Organization

#### Domain Entity Example

```typescript
// src/domain/product/aggregates/product.aggregate.ts
import { AggregateRoot } from '@shared/types/aggregate-root';
import { Money } from '@shared/value-objects/money';
import { ProductCreated } from '../events/product-created.event';

interface ProductProps {
  name: string;
  price: Money;
  description: string;
  sellerId: string;
  stock: number;
}

export class Product extends AggregateRoot<ProductProps> {
  private constructor(props: ProductProps, id?: string) {
    super(props, id);
  }

  // Factory method
  static create(props: ProductProps, id?: string): Product {
    const product = new Product(props, id);
    
    // Raise domain event
    if (!id) {
      product.addDomainEvent(new ProductCreated(product));
    }
    
    return product;
  }

  // Getters
  get name(): string {
    return this.props.name;
  }

  get price(): Money {
    return this.props.price;
  }

  // Business logic
  updatePrice(newPrice: Money): void {
    if (newPrice.amount <= 0) {
      throw new Error('Price must be positive');
    }
    this.props.price = newPrice;
  }

  decreaseStock(quantity: number): void {
    if (this.props.stock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.props.stock -= quantity;
  }
}
```

### Folder Structure Rules

#### When Creating New Features

1. **Domain Layer** (`src/domain/[feature]/`)
   - `aggregates/` - Main entities
   - `value-objects/` - Immutable values
   - `events/` - Domain events
   - `specifications/` - Business rules

2. **Application Layer** (`src/application/`)
   - `commands/[feature]/` - Write operations
   - `queries/[feature]/` - Read operations
   - `use-cases/[feature]/` - Complex workflows

3. **Infrastructure Layer** (`src/infrastructure/`)
   - `http/controllers/[feature].controller.ts` - HTTP handlers
   - `http/routes/[feature].routes.ts` - Route definitions
   - `database/mongodb/schemas/[feature].schema.ts` - Database schema
   - `database/mongodb/repositories/[feature].repository.ts` - Data access

### Do's and Don'ts

#### ✅ DO's

- **DO** write tests for new features
- **DO** use meaningful variable names
- **DO** add comments for complex logic
- **DO** follow the existing folder structure
- **DO** use TypeScript strict mode
- **DO** validate all user inputs
- **DO** handle errors gracefully
- **DO** use async/await (not callbacks)
- **DO** keep functions small and focused
- **DO** use dependency injection

#### ❌ DON'Ts

- **DON'T** use `any` type
- **DON'T** commit `.env` file
- **DON'T** hardcode sensitive data
- **DON'T** modify domain entities from infrastructure
- **DON'T** put business logic in controllers
- **DON'T** make HTTP calls from domain layer
- **DON'T** skip writing tests
- **DON'T** commit commented-out code
- **DON'T** use `console.log` (use logger instead)
- **DON'T** ignore TypeScript errors

---

## 🛠 Common Tasks

### Task 1: Add a New API Endpoint

**Example**: Add an endpoint to get user's order history

#### Step 1: Create Query

```typescript
// src/application/queries/order/get-user-orders.query.ts
export class GetUserOrdersQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10
  ) {}
}
```

#### Step 2: Create Query Handler

```typescript
// src/application/queries/order/get-user-orders.handler.ts
import { IQueryHandler } from '@application/ports/query-handler.interface';
import { GetUserOrdersQuery } from './get-user-orders.query';
import { IOrderReadRepository } from '@infrastructure/database/read-models/order-read.repository.interface';

export class GetUserOrdersHandler implements IQueryHandler<GetUserOrdersQuery> {
  constructor(private readonly orderReadRepo: IOrderReadRepository) {}

  async handle(query: GetUserOrdersQuery): Promise<OrderDTO[]> {
    const orders = await this.orderReadRepo.findByUserId(
      query.userId,
      query.page,
      query.limit
    );
    
    return orders.map(order => this.toDTO(order));
  }

  private toDTO(order: any): OrderDTO {
    return {
      id: order.id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt
    };
  }
}
```

#### Step 3: Add Controller Method

```typescript
// src/infrastructure/http/controllers/order.controller.ts
async getUserOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user.id; // From auth middleware
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const query = new GetUserOrdersQuery(userId, page, limit);
    const orders = await this.queryBus.execute(query);

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
}
```

#### Step 4: Add Route

```typescript
// src/infrastructure/http/routes/order.routes.ts
router.get(
  '/my-orders',
  authMiddleware, // Require authentication
  (req, res, next) => orderController.getUserOrders(req, res, next)
);
```

#### Step 5: Test the Endpoint

```bash
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3000/api/v1/orders/my-orders?page=1&limit=10
```

### Task 2: Add a New Domain Entity

**Example**: Add a "Category" entity for products

#### Step 1: Create Domain Entity

```typescript
// src/domain/category/aggregates/category.aggregate.ts
import { AggregateRoot } from '@shared/types/aggregate-root';

interface CategoryProps {
  name: string;
  description: string;
  parentId?: string;
}

export class Category extends AggregateRoot<CategoryProps> {
  private constructor(props: CategoryProps, id?: string) {
    super(props, id);
  }

  static create(props: CategoryProps, id?: string): Category {
    return new Category(props, id);
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }
}
```

#### Step 2: Create MongoDB Schema

```typescript
// src/infrastructure/database/mongodb/schemas/category.schema.ts
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

#### Step 3: Create Repository

```typescript
// src/infrastructure/database/mongodb/repositories/category.repository.ts
import { ICategoryRepository } from '@domain/category/repositories/category.repository.interface';
import { Category } from '@domain/category/aggregates/category.aggregate';
import { CategoryModel } from '../schemas/category.schema';

export class MongoCategoryRepository implements ICategoryRepository {
  async save(category: Category): Promise<void> {
    await CategoryModel.create({
      _id: category.id,
      name: category.name,
      description: category.description
    });
  }

  async findById(id: string): Promise<Category | null> {
    const doc = await CategoryModel.findById(id);
    if (!doc) return null;

    return Category.create({
      name: doc.name,
      description: doc.description
    }, doc._id.toString());
  }
}
```

#### Step 4: Create Command & Handler

```typescript
// src/application/commands/category/create-category.command.ts
export class CreateCategoryCommand {
  constructor(
    public readonly name: string,
    public readonly description: string
  ) {}
}

// src/application/commands/category/create-category.handler.ts
export class CreateCategoryHandler implements ICommandHandler<CreateCategoryCommand> {
  constructor(private readonly categoryRepo: ICategoryRepository) {}

  async handle(command: CreateCategoryCommand): AsyncResult<Category> {
    const category = Category.create({
      name: command.name,
      description: command.description
    });

    await this.categoryRepo.save(category);
    return success(category);
  }
}
```

### Task 3: Debug Common Issues

#### Issue: "Cannot find module '@domain/...'"

**Solution**: Path aliases not resolved

```bash
# Make sure tsconfig-paths is registered
npm install --save-dev tsconfig-paths

# When running with ts-node
ts-node -r tsconfig-paths/register src/main.ts
```

#### Issue: "MongooseError: Operation buffering timed out"

**Solution**: MongoDB not running or wrong connection string

```bash
# Check if MongoDB is running
mongod --version

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/ecommerce
```

#### Issue: "JWT malformed" or "Invalid token"

**Solution**: Token format issue

```bash
# Make sure token is sent correctly
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Not like this:
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🐛 Common Errors & Fixes

### Error 1: Port Already in Use

**Error Message**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause**: Another process is using port 3000

**Fix**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Error 2: MongoDB Connection Failed

**Error Message**:
```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Cause**: MongoDB is not running

**Fix**:
```bash
# Start MongoDB
mongod

# Or use Docker
docker run -d -p 27017:27017 mongo:6
```

### Error 3: Environment Variables Not Loaded

**Error Message**:
```
Error: JWT_SECRET is not defined
```

**Cause**: `.env` file not loaded or missing

**Fix**:
```bash
# Make sure .env file exists
cp .env.example .env

# Edit .env with your values
# Make sure dotenv is loaded in main.ts
import dotenv from 'dotenv';
dotenv.config();
```

### Error 4: TypeScript Compilation Errors

**Error Message**:
```
error TS2307: Cannot find module '@domain/user'
```

**Cause**: Path aliases not configured

**Fix**:
```bash
# Install tsc-alias
npm install --save-dev tsc-alias

# Build with alias resolution
npm run build
```

### Error 5: Test Failures

**Error Message**:
```
Cannot find module 'mongodb-memory-server'
```

**Cause**: Dev dependencies not installed

**Fix**:
```bash
# Install all dependencies including dev
npm install

# Run tests
npm test
```

### Error 6: Kafka Connection Error

**Error Message**:
```
KafkaJSConnectionError: Failed to connect to broker
```

**Cause**: Kafka not running (optional service)

**Fix**:
```bash
# Option 1: Start Kafka with Docker
docker-compose up -d kafka

# Option 2: Disable Kafka for development
# Comment out Kafka initialization in src/main.ts
```

### Error 7: Stripe API Error

**Error Message**:
```
StripeAuthenticationError: Invalid API Key
```

**Cause**: Invalid or missing Stripe key

**Fix**:
```bash
# Get test key from Stripe Dashboard
# Add to .env
STRIPE_SECRET_KEY=sk_test_your_key_here
```

---

## 🤝 Contribution Workflow

### Branch Naming Convention

| Type | Format | Example |
|------|--------|---------|
| New Feature | `feature/description` | `feature/add-product-categories` |
| Bug Fix | `bugfix/description` | `bugfix/fix-order-total-calculation` |
| Hotfix | `hotfix/description` | `hotfix/security-patch` |
| Refactor | `refactor/description` | `refactor/improve-error-handling` |
| Documentation | `docs/description` | `docs/update-readme` |

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```bash
# Feature
git commit -m "feat(product): add category filtering"

# Bug fix
git commit -m "fix(order): correct total price calculation"

# Documentation
git commit -m "docs(readme): add setup instructions"

# Refactor
git commit -m "refactor(user): improve validation logic"
```

### Pull Request Process

#### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

#### 2. Make Changes

```bash
# Make your code changes
# Add tests
# Update documentation
```

#### 3. Run Quality Checks

```bash
# Type check
npm run type-check

# Linting
npm run lint

# Tests
npm test

# Format code
npm run format
```

#### 4. Commit Changes

```bash
git add .
git commit -m "feat(scope): description"
```

#### 5. Push to Remote

```bash
git push origin feature/your-feature-name
```

#### 6. Create Pull Request

- Go to GitHub repository
- Click "New Pull Request"
- Select your branch
- Fill in PR template:
  - **Description**: What does this PR do?
  - **Related Issue**: Link to issue (if any)
  - **Testing**: How was this tested?
  - **Screenshots**: (if UI changes)

#### 7. Code Review

- Address reviewer comments
- Make requested changes
- Push updates to the same branch

#### 8. Merge

- Once approved, PR will be merged
- Delete your feature branch

---

## 📚 Notes for New Developers

### Important Things to Understand First

#### 1. **Architecture Patterns**

This project uses advanced patterns. Don't worry if you don't understand everything at first!

- **DDD (Domain-Driven Design)**: Business logic is organized by domain (User, Product, Order)
- **CQRS**: Separate models for reading and writing data
- **Event-Driven**: Services communicate through events
- **Clean Architecture**: Layers are separated (domain, application, infrastructure)

**Learning Path**:
1. Start with simple CRUD operations
2. Understand the domain layer
3. Learn about commands and queries
4. Explore event-driven patterns

#### 2. **TypeScript Path Aliases**

We use path aliases to avoid long relative imports:

```typescript
// ✅ Good - using alias
import { User } from '@domain/user/aggregates/user.aggregate';

// ❌ Bad - relative path
import { User } from '../../../domain/user/aggregates/user.aggregate';
```

Aliases are defined in `tsconfig.json`:
- `@domain/*` → `src/domain/*`
- `@application/*` → `src/application/*`
- `@infrastructure/*` → `src/infrastructure/*`
- `@shared/*` → `src/shared/*`

#### 3. **Monorepo Structure**

This is a **monorepo** with multiple services:
- Main application (port 3000)
- Payment service (port 3001)
- Notification service (port 3002)

All managed with npm workspaces.

### Parts You Should NOT Change Initially

As a new developer, **avoid modifying** these until you're more familiar:

❌ **Core Infrastructure**:
- `src/infrastructure/cqrs/` - CQRS implementation
- `src/infrastructure/events/` - Event bus
- `src/infrastructure/saga/` - Saga orchestration
- `src/shared/types/` - Core type definitions

❌ **Database Connection**:
- `src/infrastructure/database/mongodb/connection.ts`

❌ **Authentication Middleware**:
- `src/infrastructure/http/middleware/auth.middleware.ts`

❌ **Configuration Files**:
- `tsconfig.json`
- `jest.config.js`
- `.eslintrc.js`

### Safe Areas to Start

✅ **Good places to start learning**:

1. **Add Simple Endpoints**:
   - Start with read-only queries
   - Example: Get user profile, list products

2. **Modify DTOs**:
   - Add fields to request/response objects
   - Located in `src/application/dtos/`

3. **Add Validation Rules**:
   - Modify validation schemas
   - Located in `src/infrastructure/http/validation/`

4. **Write Tests**:
   - Add test cases for existing features
   - Located in `tests/`

5. **Update Documentation**:
   - Improve comments
   - Update API docs

### Learning Resources

#### Understanding the Codebase

1. **Start Here**:
   - Read `docs/architecture/overview.md`
   - Read `docs/DEVELOPER_GUIDE.md`
   - Explore `docs/guides/`

2. **Understand Patterns**:
   - [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
   - [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
   - [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

3. **TypeScript**:
   - [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
   - [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

4. **Node.js**:
   - [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

#### Recommended Learning Path

**Week 1**: Setup & Basics
- Set up development environment
- Run the application locally
- Explore the API with Swagger
- Read architecture documentation

**Week 2**: Simple Changes
- Add a new field to an existing entity
- Create a simple query endpoint
- Write tests for your changes

**Week 3**: Understand Patterns
- Study CQRS implementation
- Understand event flow
- Explore domain entities

**Week 4**: Build a Feature
- Add a complete feature (with guidance)
- Follow the "Common Tasks" section
- Get code review from senior developers

### Getting Help

#### Before Asking for Help

1. **Check Documentation**:
   - README (this file)
   - `docs/` folder
   - Code comments

2. **Search for Similar Issues**:
   - GitHub issues
   - Error messages in Google

3. **Debug**:
   - Use VS Code debugger
   - Add logging
   - Check logs in `logs/` folder

#### When Asking for Help

Provide:
- What you're trying to do
- What you've tried
- Error messages (full stack trace)
- Relevant code snippets
- Environment details (OS, Node version)

**Good Question**:
```
I'm trying to add a new endpoint to get user orders.
I created the query handler but getting this error:

Error: Cannot find module '@application/queries/order/get-user-orders.handler'

I've checked:
- File exists at src/application/queries/order/get-user-orders.handler.ts
- Path alias is correct in tsconfig.json
- Ran npm run build

Node version: 18.17.0
OS: Windows 11
```

**Bad Question**:
```
It's not working. Help!
```

---

## 📖 Additional Resources

### Documentation

- **Architecture**: `docs/architecture/`
  - [Overview](docs/architecture/overview.md)
  - [CQRS Implementation](docs/architecture/cqrs.md)
  - [Event-Driven Architecture](docs/architecture/events.md)
  - [Bounded Contexts](docs/architecture/bounded-contexts.md)

- **Guides**: `docs/guides/`
  - [Developer Guide](docs/DEVELOPER_GUIDE.md)
  - [Testing Guide](docs/guides/testing-guide.md)
  - [Deployment Guide](docs/guides/deployment-guide.md)

- **API Documentation**:
  - Swagger UI: `http://localhost:3000/api-docs`
  - API Guide: `docs/api/README.md`

### Useful Commands Reference

```bash
# Development
npm run dev                    # Start main app
npm run dev:all                # Start all services
npm run dev:payment            # Start payment service
npm run dev:notification       # Start notification service

# Building
npm run build                  # Build for production
npm run build:watch            # Build in watch mode
npm run clean                  # Clean dist folder

# Testing
npm test                       # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Generate coverage report
npm run test:unit              # Run unit tests
npm run test:integration       # Run integration tests
npm run test:e2e               # Run E2E tests

# Code Quality
npm run lint                   # Check linting
npm run lint:fix               # Fix linting errors
npm run format                 # Format code
npm run format:check           # Check formatting
npm run type-check             # TypeScript type checking
npm run validate               # Run all checks

# Production
npm start                      # Start production server
npm run start:prod             # Start with NODE_ENV=production
```

### Environment Variables Reference

See `.env.example` for all available environment variables.

**Required**:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing

**Optional** (for full functionality):
- `STRIPE_SECRET_KEY` - Stripe API key
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `KAFKA_BROKERS` - Kafka broker addresses

### Project Links

- **Repository**: [github.com/muthukumar-js-dev/ecommerce-backend](https://github.com/muthukumar-js-dev/ecommerce-backend)
- **Issues**: [GitHub Issues](https://github.com/muthukumar-js-dev/ecommerce-backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/muthukumar-js-dev/ecommerce-backend/discussions)

---

## 🎓 Summary

Congratulations! You now have a comprehensive understanding of this e-commerce backend project.

**Key Takeaways**:

1. **Architecture**: DDD + CQRS + Event-Driven + Clean Architecture
2. **Tech Stack**: Node.js + TypeScript + MongoDB + Express + Kafka
3. **Structure**: Domain → Application → Infrastructure layers
4. **Development**: Use `npm run dev:all` to start all services
5. **Testing**: Write tests for all new features
6. **Code Quality**: Follow TypeScript best practices and coding guidelines

**Next Steps**:

1. Set up your development environment
2. Run the application locally
3. Explore the API with Swagger
4. Read the architecture documentation
5. Try adding a simple feature
6. Ask questions when stuck!

**Remember**: This is a complex, production-grade application. Don't expect to understand everything immediately. Take it step by step, and don't hesitate to ask for help!

---

## 📞 Support

If you have questions or need help:

1. Check this README first
2. Read the documentation in `docs/`
3. Search existing GitHub issues
4. Create a new issue with details
5. Ask in team chat/discussions

**Happy Coding! 🚀**
