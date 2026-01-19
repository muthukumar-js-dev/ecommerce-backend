# API Documentation Runbook

## Updating API Documentation

### Adding New Endpoint Documentation

**1. Add Swagger JSDoc Comments:**

```typescript
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of all products with optional filtering
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/products', productController.getAllProducts);
```

**2. Define Schemas:**

Add to `src/api/swagger-config.ts`:

```typescript
Product: {
  type: 'object',
  required: ['name', 'price'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    price: { type: 'number' },
    // ... other properties
  },
}
```

**3. Regenerate Documentation:**

```bash
npm run docs:generate
```

**4. Verify:**

- Visit `http://localhost:3000/api-docs`
- Test endpoint via Swagger UI
- Check request/response examples

### Common Swagger Annotations

**Authentication Required:**
```typescript
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     security:
 *       - bearerAuth: []
 */
```

**Request Body:**
```typescript
/**
 * @swagger
 * /api/products:
 *   post:
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 */
```

**Multiple Response Codes:**
```typescript
/**
 * @swagger
 * responses:
 *   200:
 *     description: Success
 *   400:
 *     description: Bad Request
 *   401:
 *     description: Unauthorized
 *   404:
 *     description: Not Found
 *   500:
 *     description: Server Error
 */
```

## Generating API Client

### TypeScript Client

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:3000/api-docs.json \
  -g typescript-axios \
  -o ./generated/api-client
```

### Postman Collection

```bash
# Export OpenAPI spec
curl http://localhost:3000/api-docs.json > openapi.json

# Import to Postman
# File > Import > openapi.json
```

## API Versioning

### Adding New API Version

**1. Create versioned routes:**

```typescript
// src/api/routes/v2/products.routes.ts
import { Router } from 'express';

const router = Router();

router.get('/products', productControllerV2.getAllProducts);

export default router;
```

**2. Mount versioned routes:**

```typescript
// src/api/routes/index.ts
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);
```

**3. Update Swagger config:**

```typescript
servers: [
  {
    url: 'http://localhost:3000/api/v1',
    description: 'API Version 1',
  },
  {
    url: 'http://localhost:3000/api/v2',
    description: 'API Version 2',
  },
]
```

## API Testing

### Test Endpoints via Swagger UI

1. Navigate to `/api-docs`
2. Click "Authorize" and enter JWT token
3. Select endpoint
4. Click "Try it out"
5. Fill in parameters
6. Click "Execute"
7. Verify response

### Automated API Testing

```bash
# Run API tests
npm run test:api

# Run contract tests
npm run test:contract
```

## API Monitoring

### Track API Usage

```bash
# View API metrics
curl http://prometheus:9090/api/v1/query?query='http_requests_total'

# View endpoint performance
npm run monitoring:analyze -- --endpoint=/api/products
```

### API Health Check

```bash
# Check API health
curl http://localhost:3000/health

# Check specific service
curl http://localhost:3000/health/database
curl http://localhost:3000/health/redis
curl http://localhost:3000/health/kafka
```

## Deprecating Endpoints

### Mark as Deprecated

```typescript
/**
 * @swagger
 * /api/old-endpoint:
 *   get:
 *     deprecated: true
 *     description: This endpoint is deprecated. Use /api/new-endpoint instead
 */
```

### Sunset Header

```typescript
res.setHeader('Sunset', 'Sat, 31 Dec 2026 23:59:59 GMT');
res.setHeader('Link', '</api/new-endpoint>; rel="alternate"');
```

## Best Practices

1. **Always document:**
   - Request parameters
   - Request body schema
   - Response schema
   - Error responses
   - Authentication requirements

2. **Provide examples:**
   - Include example requests
   - Include example responses
   - Show error scenarios

3. **Keep updated:**
   - Update docs with code changes
   - Version API properly
   - Deprecate old endpoints gracefully

4. **Test documentation:**
   - Verify all endpoints work
   - Check all examples
   - Test authentication flows
