# API Documentation

## Overview

The E-Commerce Backend API follows REST principles and implements CQRS pattern for optimal performance.

## Base URL

```
Production: https://api.yourdomain.com/v1
Development: http://localhost:3000/v1
```

## Authentication

### JWT Bearer Token

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

**POST** `/auth/login`

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "value": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "value": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BUSINESS_RULE_ERROR` | 400 | Business rule violation |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service failure |
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |

## Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per window
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "value": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

## Endpoints

### User Management

#### Register User

**POST** `/users/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "value": {
    "userId": "user-123",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

#### Get User Profile

**GET** `/users/profile`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "value": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "currentOrderCount": 5,
    "memberSince": "2024-01-01T00:00:00Z"
  }
}
```

#### Update User Profile

**PUT** `/users/profile`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "John Updated",
  "phoneNumber": "+1234567890"
}
```

**Response:** `200 OK`

### Product Catalog

#### List Products

**GET** `/products?page=1&limit=10&category=electronics`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `category`: Filter by category
- `search`: Search term
- `minPrice`: Minimum price
- `maxPrice`: Maximum price

**Response:** `200 OK`
```json
{
  "success": true,
  "value": {
    "products": [
      {
        "id": "prod-123",
        "sku": "SKU-001",
        "title": "Product Name",
        "description": "Product description",
        "price": 99.99,
        "discountPercentage": 10,
        "sellingPrice": 89.99,
        "category": "electronics",
        "brand": "Brand Name",
        "images": ["url1", "url2"],
        "availableQuantity": 50,
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

#### Get Product Details

**GET** `/products/:productId`

**Response:** `200 OK`
```json
{
  "success": true,
  "value": {
    "id": "prod-123",
    "sku": "SKU-001",
    "title": "Product Name",
    "description": "Detailed description",
    "price": 99.99,
    "sellingPrice": 89.99,
    "category": "electronics",
    "brand": "Brand Name",
    "images": ["url1", "url2"],
    "availableQuantity": 50,
    "averageRating": 4.5,
    "reviewCount": 120
  }
}
```

#### Create Product (Seller Only)

**POST** `/products`

**Headers:** `Authorization: Bearer <seller_token>`

**Request:**
```json
{
  "sku": "SKU-001",
  "title": "New Product",
  "description": "Product description",
  "price": 99.99,
  "category": "electronics",
  "brand": "Brand Name",
  "images": ["url1", "url2"],
  "quantity": 100
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "value": {
    "productId": "prod-123",
    "sku": "SKU-001"
  }
}
```

### Order Management

#### Place Order

**POST** `/orders`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "items": [
    {
      "productId": "prod-123",
      "quantity": 2
    }
  ],
  "shippingAddressId": "addr-123",
  "paymentMethodId": "pay-123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "value": {
    "orderId": "order-123",
    "orderNumber": "ORD-2024-001",
    "total": 199.98,
    "status": "PENDING"
  }
}
```

#### Get Order History

**GET** `/orders?page=1&limit=10`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "value": {
    "orders": [
      {
        "id": "order-123",
        "orderNumber": "ORD-2024-001",
        "items": [
          {
            "productId": "prod-123",
            "productName": "Product Name",
            "quantity": 2,
            "price": 99.99
          }
        ],
        "total": 199.98,
        "status": "DELIVERED",
        "placedAt": "2024-01-01T10:00:00Z",
        "deliveredAt": "2024-01-05T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### Get Order Details

**GET** `/orders/:orderId`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "value": {
    "id": "order-123",
    "orderNumber": "ORD-2024-001",
    "items": [...],
    "subtotal": 199.98,
    "shippingCost": 10.00,
    "tax": 20.00,
    "total": 229.98,
    "status": "DELIVERED",
    "shippingAddress": {
      "name": "John Doe",
      "firstLine": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001"
    },
    "placedAt": "2024-01-01T10:00:00Z",
    "deliveredAt": "2024-01-05T14:30:00Z"
  }
}
```

#### Cancel Order

**POST** `/orders/:orderId/cancel`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "value": {
    "orderId": "order-123",
    "status": "CANCELLED"
  }
}
```

### Reviews

#### Create Review

**POST** `/products/:productId/reviews`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "rating": 5,
  "comment": "Great product!"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "value": {
    "reviewId": "review-123"
  }
}
```

#### Get Product Reviews

**GET** `/products/:productId/reviews?page=1&limit=10`

**Response:** `200 OK`
```json
{
  "success": true,
  "value": {
    "reviews": [
      {
        "id": "review-123",
        "rating": 5,
        "comment": "Great product!",
        "userName": "John Doe",
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

## Webhooks

### Stripe Payment Webhook

**POST** `/webhooks/stripe`

**Headers:**
- `Stripe-Signature`: Webhook signature

**Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

## Testing

### Postman Collection

Import the Postman collection from `/docs/api/postman-collection.json`

### cURL Examples

```bash
# Register user
curl -X POST https://api.yourdomain.com/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Password123!"}'

# Login
curl -X POST https://api.yourdomain.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password123!"}'

# Get profile
curl -X GET https://api.yourdomain.com/v1/users/profile \
  -H "Authorization: Bearer <token>"

# Place order
curl -X POST https://api.yourdomain.com/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"prod-123","quantity":2}],"shippingAddressId":"addr-123","paymentMethodId":"pay-123"}'
```

## Versioning

API versioning is done via URL path:
- Current version: `/v1`
- Future versions: `/v2`, `/v3`, etc.

## CORS

Allowed origins are configured via `CORS_ORIGIN` environment variable.

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [CQRS Implementation](../architecture/cqrs.md)
- [Developer Guide](../guides/developer-guide.md)
- [Deployment Guide](../guides/deployment-guide.md)
