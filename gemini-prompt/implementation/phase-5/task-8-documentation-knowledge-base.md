# Phase 5 - Task 8: Documentation & Knowledge Base

**Duration:** 3-4 days  
**Priority:** Medium  
**Dependencies:** All previous tasks

---

## Objective

Create comprehensive, production-grade documentation including architecture diagrams, API documentation, runbooks, troubleshooting guides, onboarding materials, and searchable knowledge base to ensure team efficiency, knowledge transfer, and long-term maintainability.

---

## Context

Comprehensive documentation provides:
- **Team Efficiency:** Faster onboarding and problem resolution
- **Knowledge Preservation:** Prevent knowledge loss from team changes
- **Operational Excellence:** Clear procedures for all scenarios
- **Reduced Downtime:** Quick issue resolution with runbooks
- **Scalability:** Enable team growth without bottlenecks
- **Compliance:** Meet audit and regulatory requirements

---

## Implementation Steps

### Step 1: Architecture Documentation

**Create comprehensive architecture overview:**

```markdown
# E-Commerce Platform Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Service Catalog](#service-catalog)
4. [Data Flow](#data-flow)
5. [Infrastructure](#infrastructure)
6. [Security Architecture](#security-architecture)
7. [Scaling Strategy](#scaling-strategy)
8. [Disaster Recovery](#disaster-recovery)

## System Overview

The e-commerce platform is built using event-driven microservices architecture with Domain-Driven Design (DDD) principles, designed to handle 10 million concurrent users with 99.99% availability.

### Key Characteristics
- **Architecture Style:** Event-Driven Microservices
- **Design Pattern:** Domain-Driven Design (DDD), CQRS, Event Sourcing
- **Communication:** Synchronous (REST/GraphQL) + Asynchronous (Kafka)
- **Data Storage:** MongoDB (sharded), Redis (distributed cache)
- **Deployment:** Kubernetes on AWS EKS
- **Observability:** Prometheus, Grafana, Jaeger, ELK Stack

### Technology Stack

#### Backend
- **Language:** TypeScript 5.x
- **Runtime:** Node.js 20.x LTS
- **Framework:** Express.js 4.x
- **API:** REST + GraphQL (Apollo Server)

#### Data Layer
- **Primary Database:** MongoDB 6.x (Sharded Cluster)
- **Cache:** Redis 7.x (Cluster Mode)
- **Message Broker:** Apache Kafka 3.x
- **Search:** Elasticsearch 8.x

#### Infrastructure
- **Container Orchestration:** Kubernetes 1.28
- **Cloud Provider:** AWS (EKS, S3, CloudFront, RDS)
- **CI/CD:** GitHub Actions, ArgoCD
- **Monitoring:** Prometheus, Grafana, Jaeger
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)

## Architecture Diagrams

### High-Level System Architecture

\`\`\`mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Application<br/>React + Next.js]
        Mobile[Mobile Apps<br/>iOS + Android]
        Admin[Admin Dashboard]
    end

    subgraph "CDN & Edge"
        CF[CloudFront CDN]
        S3[S3 Static Assets]
    end

    subgraph "API Gateway Layer"
        Gateway[API Gateway<br/>Kong/Nginx]
        GraphQL[GraphQL Gateway<br/>Apollo Federation]
    end

    subgraph "Microservices Layer"
        Core[Core Service<br/>User, Product, Catalog]
        Order[Order Service<br/>Order Management]
        Payment[Payment Service<br/>Payment Processing]
        Notification[Notification Service<br/>Email, SMS, Push]
        Inventory[Inventory Service<br/>Stock Management]
        Search[Search Service<br/>Product Search]
    end

    subgraph "Event Streaming"
        Kafka[Apache Kafka<br/>Event Bus]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB Cluster<br/>Sharded)]
        Redis[(Redis Cluster<br/>Cache)]
        ES[(Elasticsearch<br/>Search Index)]
    end

    subgraph "External Services"
        Stripe[Stripe API<br/>Payments]
        SendGrid[SendGrid<br/>Email]
        Twilio[Twilio<br/>SMS]
        AWS_Services[AWS Services<br/>S3, SES, SNS]
    end

    Web --> CF
    Mobile --> CF
    Admin --> CF
    CF --> S3
    CF --> Gateway
    Gateway --> Core
    Gateway --> Order
    Gateway --> Payment
    Gateway --> Search
    GraphQL --> Core
    GraphQL --> Order
    
    Core --> MongoDB
    Core --> Redis
    Core --> Kafka
    
    Order --> MongoDB
    Order --> Kafka
    
    Payment --> Stripe
    Payment --> Kafka
    
    Notification --> SendGrid
    Notification --> Twilio
    Notification --> Kafka
    
    Inventory --> MongoDB
    Inventory --> Kafka
    
    Search --> ES
    Search --> Kafka
\`\`\`

### Event-Driven Architecture

\`\`\`mermaid
sequenceDiagram
    participant User
    participant API as API Gateway
    participant Order as Order Service
    participant Kafka
    participant Payment as Payment Service
    participant Inventory as Inventory Service
    participant Notification as Notification Service

    User->>API: POST /orders
    API->>Order: Create Order
    Order->>Kafka: Publish OrderCreated Event
    Order-->>API: Order ID
    API-->>User: 201 Created

    Kafka->>Payment: Consume OrderCreated
    Payment->>Stripe: Process Payment
    Stripe-->>Payment: Payment Success
    Payment->>Kafka: Publish PaymentProcessed

    Kafka->>Inventory: Consume PaymentProcessed
    Inventory->>Inventory: Reserve Stock
    Inventory->>Kafka: Publish InventoryReserved

    Kafka->>Order: Consume InventoryReserved
    Order->>Order: Update Order Status
    Order->>Kafka: Publish OrderConfirmed

    Kafka->>Notification: Consume OrderConfirmed
    Notification->>SendGrid: Send Confirmation Email
    Notification->>User: Email Sent
\`\`\`

### Database Sharding Strategy

\`\`\`mermaid
graph TB
    App[Application]
    Mongos1[Mongos Router 1]
    Mongos2[Mongos Router 2]
    
    Config1[(Config Server 1)]
    Config2[(Config Server 2)]
    Config3[(Config Server 3)]
    
    Shard1[(Shard 1<br/>Users A-H)]
    Shard2[(Shard 2<br/>Users I-P)]
    Shard3[(Shard 3<br/>Users Q-Z)]
    
    App --> Mongos1
    App --> Mongos2
    
    Mongos1 --> Config1
    Mongos2 --> Config1
    
    Mongos1 --> Shard1
    Mongos1 --> Shard2
    Mongos1 --> Shard3
    
    Mongos2 --> Shard1
    Mongos2 --> Shard2
    Mongos2 --> Shard3
\`\`\`

## Service Catalog

### Core Service
**Responsibility:** User management, authentication, product catalog

**Endpoints:**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/products` - List products
- `GET /api/v1/products/:id` - Get product details

**Events Published:**
- `UserRegistered`
- `UserUpdated`
- `ProductViewed`

**Events Consumed:**
- None (upstream service)

**Database:** MongoDB (users, products collections)
**Cache:** Redis (product catalog, user sessions)

### Order Service
**Responsibility:** Order creation, management, fulfillment

**Endpoints:**
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id/cancel` - Cancel order

**Events Published:**
- `OrderCreated`
- `OrderConfirmed`
- `OrderCancelled`
- `OrderShipped`

**Events Consumed:**
- `PaymentProcessed`
- `InventoryReserved`

**Database:** MongoDB (orders collection)

### Payment Service
**Responsibility:** Payment processing, refunds

**Endpoints:**
- `POST /api/v1/payments` - Process payment
- `POST /api/v1/payments/:id/refund` - Refund payment

**Events Published:**
- `PaymentProcessed`
- `PaymentFailed`
- `PaymentRefunded`

**Events Consumed:**
- `OrderCreated`

**External Dependencies:** Stripe API

## Data Flow

### Order Creation Flow

1. **User submits order** via API Gateway
2. **Order Service** validates and creates order
3. **Order Service** publishes `OrderCreated` event to Kafka
4. **Payment Service** consumes event and processes payment
5. **Payment Service** publishes `PaymentProcessed` event
6. **Inventory Service** consumes event and reserves stock
7. **Inventory Service** publishes `InventoryReserved` event
8. **Order Service** consumes event and confirms order
9. **Order Service** publishes `OrderConfirmed` event
10. **Notification Service** sends confirmation email

### Data Consistency

- **Eventual Consistency:** Services are eventually consistent via events
- **Saga Pattern:** Distributed transactions using choreography-based sagas
- **Idempotency:** All event handlers are idempotent
- **Retry Logic:** Exponential backoff with dead letter queues

## Infrastructure

### Kubernetes Cluster
- **Cluster:** AWS EKS 1.28
- **Nodes:** 3 node groups (general, compute, memory-optimized)
- **Autoscaling:** Cluster Autoscaler + HPA + VPA
- **Ingress:** Nginx Ingress Controller
- **Service Mesh:** Istio (optional)

### Networking
- **VPC:** Dedicated VPC with public/private subnets
- **Load Balancer:** Application Load Balancer (ALB)
- **DNS:** Route53
- **CDN:** CloudFront

### Storage
- **Object Storage:** AWS S3 (images, backups)
- **Block Storage:** EBS (persistent volumes)
- **Database:** MongoDB Atlas / Self-hosted on EKS

## Security Architecture

### Authentication & Authorization
- **Authentication:** JWT tokens (15-minute expiry)
- **Authorization:** Role-Based Access Control (RBAC)
- **API Security:** Rate limiting, API keys

### Secrets Management
- **Tool:** HashiCorp Vault
- **Rotation:** Automated secret rotation
- **Access:** Kubernetes service accounts with Vault auth

### Network Security
- **Network Policies:** Kubernetes Network Policies
- **Encryption:** TLS 1.3 for all traffic
- **Firewall:** AWS Security Groups

### Data Security
- **Encryption at Rest:** MongoDB encryption, S3 encryption
- **Encryption in Transit:** TLS/SSL
- **PII Protection:** Data masking, tokenization

## Scaling Strategy

### Horizontal Scaling
- **Application:** HPA based on CPU, memory, custom metrics
- **Database:** MongoDB sharding (3+ shards)
- **Cache:** Redis cluster (6+ nodes)

### Vertical Scaling
- **VPA:** Automatic resource recommendations
- **Manual:** Increase pod resources as needed

### Geographic Scaling
- **Multi-Region:** Active-active in multiple AWS regions
- **CDN:** CloudFront edge locations globally

## Disaster Recovery

### Backup Strategy
- **Database:** Daily full backups, hourly incremental
- **Retention:** 30 days full, 7 days incremental
- **Storage:** S3 with cross-region replication

### Recovery Objectives
- **RTO:** < 1 hour (Recovery Time Objective)
- **RPO:** < 15 minutes (Recovery Point Objective)

### DR Procedures
1. Detect failure
2. Failover to DR region
3. Restore from latest backup
4. Verify data integrity
5. Resume operations
\`\`\`

### Step 2: API Documentation

**Generate comprehensive OpenAPI/Swagger documentation:**

```typescript
// src/api/swagger-config.ts

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce Platform API',
      version: '2.0.0',
      description: `
# E-Commerce Platform API Documentation

Welcome to the E-Commerce Platform API documentation. This API provides comprehensive endpoints for managing users, products, orders, payments, and more.

## Base URL
- **Production:** \`https://api.yourdomain.com/v1\`
- **Staging:** \`https://staging-api.yourdomain.com/v1\`

## Authentication
All API requests require authentication using JWT tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Rate Limiting
- **Authenticated:** 1000 requests/hour
- **Unauthenticated:** 100 requests/hour

## Error Handling
All errors follow the standard format:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
\`\`\`

## Pagination
List endpoints support pagination:

\`\`\`
GET /api/v1/products?page=1&limit=20
\`\`\`

Response includes pagination metadata:

\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
\`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'api-support@yourdomain.com',
        url: 'https://support.yourdomain.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'https://api.yourdomain.com/v1',
        description: 'Production server',
      },
      {
        url: 'https://staging-api.yourdomain.com/v1',
        description: 'Staging server',
      },
      {
        url: 'http://localhost:3000/v1',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service communication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input data' },
                details: { type: 'object' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 150 },
            pages: { type: 'integer', example: 8 },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Invalid or expired token',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input data',
                  details: {
                    email: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Products', description: 'Product catalog endpoints' },
      { name: 'Orders', description: 'Order management endpoints' },
      { name: 'Payments', description: 'Payment processing endpoints' },
      { name: 'Cart', description: 'Shopping cart endpoints' },
    ],
  },
  apis: ['./src/api/**/*.ts', './src/api/**/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'E-Commerce API Documentation',
  }));

  // Serve OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
```

**Add comprehensive API documentation comments:**

```typescript
/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     description: |
 *       Creates a new order with the provided items and shipping information.
 *       
 *       **Business Rules:**
 *       - User must be authenticated
 *       - All products must be in stock
 *       - Shipping address must be valid
 *       - Payment method must be configured
 *       
 *       **Process:**
 *       1. Validate cart items and inventory
 *       2. Calculate total amount including taxes and shipping
 *       3. Create order record
 *       4. Publish OrderCreated event
 *       5. Initiate payment processing
 *       
 *       **Events Published:**
 *       - `OrderCreated` - Triggers payment processing
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               items:
 *                 type: array
 *                 description: List of items to order
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                       example: "prod_abc123"
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       description: Quantity to order
 *                       example: 2
 *                     price:
 *                       type: number
 *                       description: Unit price (for validation)
 *                       example: 29.99
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - state
 *                   - zipCode
 *                   - country
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Main St"
 *                   city:
 *                     type: string
 *                     example: "San Francisco"
 *                   state:
 *                     type: string
 *                     example: "CA"
 *                   zipCode:
 *                     type: string
 *                     example: "94102"
 *                   country:
 *                     type: string
 *                     example: "US"
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, paypal, stripe]
 *                 description: Payment method to use
 *                 example: "credit_card"
 *               couponCode:
 *                 type: string
 *                 description: Optional coupon code
 *                 example: "SUMMER2024"
 *           examples:
 *             standard_order:
 *               summary: Standard order
 *               value:
 *                 items:
 *                   - productId: "prod_abc123"
 *                     quantity: 2
 *                     price: 29.99
 *                   - productId: "prod_def456"
 *                     quantity: 1
 *                     price: 49.99
 *                 shippingAddress:
 *                   street: "123 Main St"
 *                   city: "San Francisco"
 *                   state: "CA"
 *                   zipCode: "94102"
 *                   country: "US"
 *                 paymentMethod: "credit_card"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                   description: Unique order ID
 *                   example: "ord_xyz789"
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, confirmed, shipped, delivered, cancelled]
 *                   example: "pending"
 *                 total:
 *                   type: number
 *                   description: Total order amount
 *                   example: 109.97
 *                 currency:
 *                   type: string
 *                   example: "USD"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T12:00:00Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         description: Business rule violation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               out_of_stock:
 *                 summary: Product out of stock
 *                 value:
 *                   error:
 *                     code: "OUT_OF_STOCK"
 *                     message: "One or more products are out of stock"
 *                     details:
 *                       productId: "prod_abc123"
 *                       available: 0
 *                       requested: 2
 */
```

### Step 3: Comprehensive Runbooks

**Create detailed operational runbooks:**

```markdown
# Runbook: High Error Rate

## Metadata
- **Severity:** P1 - High
- **Response Time:** 15 minutes
- **Owner:** Backend Team
- **Last Updated:** 2024-01-01

## Symptoms
- Error rate > 0.5% for 5+ minutes
- PagerDuty alert: "High Error Rate Detected"
- Users reporting 500 errors
- Grafana dashboard showing error spike

## Prerequisites
- kubectl access to production cluster
- Grafana/Prometheus access
- PagerDuty access
- Slack access (#incidents channel)

## Investigation Steps

### 1. Acknowledge and Communicate (0-2 minutes)
\`\`\`bash
# Acknowledge PagerDuty alert
# Via mobile app or web

# Create incident channel
# Slack: /incident create "High error rate - investigating"

# Post initial status
# "🚨 High error rate detected. Investigating. ETA: 15 min"
\`\`\`

### 2. Check Recent Deployments (2-5 minutes)
\`\`\`bash
# Check recent deployments
kubectl rollout history deployment/core-service -n ecommerce-prod

# Check deployment status
kubectl get deployments -n ecommerce-prod

# Check pod status
kubectl get pods -n ecommerce-prod | grep -v Running
\`\`\`

**Decision Point:**
- If recent deployment (< 30 min ago) → Go to Solution 1 (Rollback)
- If no recent deployment → Continue investigation

### 3. Analyze Error Logs (5-10 minutes)
\`\`\`bash
# Check recent error logs
kubectl logs -n ecommerce-prod deployment/core-service \
  --tail=1000 | grep -i "error\|exception\|fatal"

# Check error patterns
kubectl logs -n ecommerce-prod deployment/core-service \
  --tail=5000 | grep ERROR | sort | uniq -c | sort -nr | head -20

# Check specific error details
kubectl logs -n ecommerce-prod deployment/core-service \
  --tail=1000 | grep "ERROR" | head -5
\`\`\`

**Look for:**
- Database connection errors
- External API timeouts
- Memory/resource errors
- Validation errors

### 4. Check Dependencies (10-12 minutes)
\`\`\`bash
# Check database connectivity
kubectl exec -n ecommerce-prod deployment/core-service -- \
  curl -f mongodb://mongos:27017 || echo "Database unreachable"

# Check Redis
kubectl exec -n ecommerce-prod deployment/core-service -- \
  redis-cli -h redis-cluster ping || echo "Redis unreachable"

# Check Kafka
kubectl exec -n ecommerce-prod deployment/core-service -- \
  curl -f http://kafka:9092 || echo "Kafka unreachable"

# Check external APIs
curl -f https://api.stripe.com/v1/health || echo "Stripe unreachable"
\`\`\`

### 5. Check Resource Utilization (12-15 minutes)
\`\`\`bash
# Check pod resource usage
kubectl top pods -n ecommerce-prod

# Check node resource usage
kubectl top nodes

# Check HPA status
kubectl get hpa -n ecommerce-prod
\`\`\`

## Common Causes & Solutions

### Solution 1: Rollback Recent Deployment
**When:** Recent deployment (< 30 min) + error spike correlation

\`\`\`bash
# Rollback to previous version
kubectl rollout undo deployment/core-service -n ecommerce-prod

# Wait for rollback to complete
kubectl rollout status deployment/core-service -n ecommerce-prod

# Verify error rate decreased
# Check Grafana dashboard

# If successful
echo "✅ Rollback successful - error rate normalized"

# Update incident channel
# "✅ Rolled back deployment. Error rate back to normal. Investigating root cause."
\`\`\`

### Solution 2: Database Connection Pool Exhausted
**When:** Logs show "connection pool exhausted" or "too many connections"

\`\`\`bash
# Check current connections
kubectl exec -n ecommerce-prod mongodb-0 -- \
  mongo --eval "db.serverStatus().connections"

# Restart affected pods to reset connections
kubectl rollout restart deployment/core-service -n ecommerce-prod

# Or scale down and up
kubectl scale deployment/core-service --replicas=0 -n ecommerce-prod
sleep 10
kubectl scale deployment/core-service --replicas=10 -n ecommerce-prod

# Monitor recovery
watch kubectl get pods -n ecommerce-prod
\`\`\`

### Solution 3: External API Timeout/Failure
**When:** Logs show timeouts to external services (Stripe, SendGrid, etc.)

\`\`\`bash
# Check circuit breaker status
kubectl exec -n ecommerce-prod deployment/core-service -- \
  curl http://localhost:3000/health/circuit-breakers

# If circuit breaker is open, it will auto-recover
# Monitor and wait

# If persistent, consider:
# 1. Increase timeout values (requires deployment)
# 2. Enable fallback behavior
# 3. Contact external service provider
\`\`\`

### Solution 4: Memory Leak / OOM
**When:** Pods showing high memory usage or OOMKilled status

\`\`\`bash
# Check for OOMKilled pods
kubectl get pods -n ecommerce-prod | grep OOMKilled

# Describe pod to see resource limits
kubectl describe pod <pod-name> -n ecommerce-prod

# Immediate fix: Restart pods
kubectl delete pod <pod-name> -n ecommerce-prod

# Long-term fix: Increase memory limits
kubectl set resources deployment/core-service \
  --limits=memory=2Gi \
  -n ecommerce-prod
\`\`\`

### Solution 5: Traffic Spike / DDoS
**When:** Unusual traffic spike in metrics

\`\`\`bash
# Check request rate
kubectl exec -n monitoring prometheus-0 -- \
  promtool query instant 'rate(http_requests_total[1m])'

# Enable rate limiting (if not already enabled)
kubectl apply -f k8s/rate-limiting.yaml

# Scale up immediately
kubectl scale deployment/core-service --replicas=20 -n ecommerce-prod

# Check HPA
kubectl get hpa -n ecommerce-prod
\`\`\`

## Escalation

### When to Escalate
- Issue not resolved within 30 minutes
- Error rate > 5%
- Complete service outage
- Data integrity concerns

### Escalation Path
1. **Primary:** Tech Lead (@tech-lead in Slack)
2. **Secondary:** Engineering Manager (@eng-manager)
3. **Critical:** CTO (@cto)

### Escalation Template
\`\`\`
@tech-lead Need escalation on high error rate incident

**Summary:** Error rate at X%, started at HH:MM
**Attempted:** Rollback, pod restart, dependency checks
**Current Status:** Still investigating
**Impact:** X users affected, $Y revenue at risk
**Next Steps:** Need help with [specific area]
\`\`\`

## Post-Incident Actions

### Immediate (< 1 hour after resolution)
- [ ] Update incident channel with resolution
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Document timeline

### Short-term (< 24 hours)
- [ ] Create incident report
- [ ] Identify root cause
- [ ] Create action items
- [ ] Update runbook if needed

### Long-term (< 1 week)
- [ ] Conduct post-mortem meeting
- [ ] Implement preventive measures
- [ ] Update monitoring/alerts
- [ ] Share learnings with team

## Prevention

### Monitoring
- Error rate alert threshold: 0.5%
- Alert evaluation period: 5 minutes
- Dashboard: https://grafana.yourdomain.com/d/errors

### Best Practices
1. Always test deployments in staging first
2. Use canary deployments for risky changes
3. Monitor error rates during deployments
4. Have rollback plan ready
5. Keep dependencies up to date

## Related Runbooks
- [Deployment Runbook](./deployment.md)
- [Database Issues Runbook](./database-issues.md)
- [Performance Degradation Runbook](./performance-degradation.md)

## Changelog
- 2024-01-01: Initial version
- 2024-01-15: Added Solution 5 (DDoS handling)
\`\`\`

### Step 4: Troubleshooting Guides

**Create comprehensive troubleshooting guide:**

```markdown
# Troubleshooting Guide

## Table of Contents
1. [Pod Issues](#pod-issues)
2. [Performance Issues](#performance-issues)
3. [Database Issues](#database-issues)
4. [Network Issues](#network-issues)
5. [Deployment Issues](#deployment-issues)

## Pod Issues

### Issue: Pod Crash Loop
**Symptoms:**
- Pod status: CrashLoopBackOff
- Pod repeatedly restarting
- Application not starting

**Diagnosis:**
\`\`\`bash
# Check pod status
kubectl get pods -n ecommerce-prod

# Describe pod for events
kubectl describe pod <pod-name> -n ecommerce-prod

# Check current logs
kubectl logs <pod-name> -n ecommerce-prod

# Check previous logs (from crashed container)
kubectl logs <pod-name> -n ecommerce-prod --previous

# Check resource limits
kubectl describe pod <pod-name> -n ecommerce-prod | grep -A 5 "Limits"
\`\`\`

**Common Causes:**

1. **Application Crash on Startup**
   - Missing environment variables
   - Invalid configuration
   - Database connection failure
   
   **Solution:**
   \`\`\`bash
   # Check environment variables
   kubectl exec <pod-name> -n ecommerce-prod -- env | sort
   
   # Compare with expected variables
   kubectl get deployment core-service -n ecommerce-prod -o yaml | grep -A 20 "env:"
   \`\`\`

2. **Failed Health Check**
   - Health endpoint returning errors
   - Slow startup time
   
   **Solution:**
   \`\`\`bash
   # Test health endpoint manually
   kubectl exec <pod-name> -n ecommerce-prod -- \
     curl -f http://localhost:3000/health
   
   # Increase initialDelaySeconds if slow startup
   kubectl patch deployment core-service -n ecommerce-prod -p \
     '{"spec":{"template":{"spec":{"containers":[{"name":"core-service","livenessProbe":{"initialDelaySeconds":60}}]}}}}'
   \`\`\`

3. **Out of Memory (OOM)**
   - Pod killed due to memory limit
   
   **Solution:**
   \`\`\`bash
   # Check OOM events
   kubectl describe pod <pod-name> -n ecommerce-prod | grep -i oom
   
   # Increase memory limit
   kubectl set resources deployment/core-service \
     --limits=memory=2Gi \
     -n ecommerce-prod
   \`\`\`

### Issue: Pod Pending
**Symptoms:**
- Pod status: Pending
- Pod not scheduled to any node

**Diagnosis:**
\`\`\`bash
# Check pod events
kubectl describe pod <pod-name> -n ecommerce-prod

# Check node resources
kubectl top nodes

# Check pod resource requests
kubectl describe pod <pod-name> -n ecommerce-prod | grep -A 5 "Requests"
\`\`\`

**Common Causes:**

1. **Insufficient Resources**
   - No node has enough CPU/memory
   
   **Solution:**
   \`\`\`bash
   # Scale cluster (add nodes)
   # Or reduce resource requests
   kubectl set resources deployment/core-service \
     --requests=cpu=250m,memory=256Mi \
     -n ecommerce-prod
   \`\`\`

2. **Node Selector Mismatch**
   - Pod requires specific node labels
   
   **Solution:**
   \`\`\`bash
   # Check node selector
   kubectl get pod <pod-name> -n ecommerce-prod -o yaml | grep -A 5 "nodeSelector"
   
   # Check node labels
   kubectl get nodes --show-labels
   
   # Remove node selector if not needed
   kubectl patch deployment core-service -n ecommerce-prod -p \
     '{"spec":{"template":{"spec":{"nodeSelector":null}}}}'
   \`\`\`

## Performance Issues

### Issue: Slow Response Times
**Symptoms:**
- P95 latency > 500ms
- Users reporting slow page loads
- Timeout errors

**Diagnosis:**
\`\`\`bash
# Check current latency
kubectl exec -n monitoring prometheus-0 -- \
  promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'

# Check slow endpoints
kubectl logs -n ecommerce-prod deployment/core-service \
  --tail=1000 | grep "duration" | sort -t: -k4 -nr | head -20

# Check database query times
kubectl exec -n ecommerce-prod mongodb-0 -- \
  mongo --eval "db.currentOp({\"secs_running\": {\$gt: 1}})"

# Check Redis latency
kubectl exec -n ecommerce-prod redis-0 -- \
  redis-cli --latency
\`\`\`

**Common Causes:**

1. **Slow Database Queries**
   **Solution:**
   \`\`\`bash
   # Enable profiling
   kubectl exec -n ecommerce-prod mongodb-0 -- \
     mongo --eval "db.setProfilingLevel(1, {slowms: 100})"
   
   # Check slow queries
   kubectl exec -n ecommerce-prod mongodb-0 -- \
     mongo --eval "db.system.profile.find().sort({ts:-1}).limit(10).pretty()"
   
   # Add missing indexes
   kubectl exec -n ecommerce-prod mongodb-0 -- \
     mongo --eval "db.products.createIndex({category: 1, price: 1})"
   \`\`\`

2. **Cache Miss**
   **Solution:**
   \`\`\`bash
   # Check cache hit rate
   kubectl exec -n ecommerce-prod redis-0 -- \
     redis-cli info stats | grep keyspace
   
   # Warm up cache
   curl https://api.yourdomain.com/admin/cache/warm
   
   # Increase cache TTL
   # Update application configuration
   \`\`\`

3. **Resource Constraints**
   **Solution:**
   \`\`\`bash
   # Check resource usage
   kubectl top pods -n ecommerce-prod
   
   # Scale up
   kubectl scale deployment/core-service --replicas=15 -n ecommerce-prod
   
   # Or increase resources
   kubectl set resources deployment/core-service \
     --limits=cpu=2000m,memory=2Gi \
     -n ecommerce-prod
   \`\`\`

## Quick Reference

### Useful Commands
\`\`\`bash
# Get all resources
kubectl get all -n ecommerce-prod

# Watch pods
watch kubectl get pods -n ecommerce-prod

# Tail logs
kubectl logs -f deployment/core-service -n ecommerce-prod

# Execute command in pod
kubectl exec -it <pod-name> -n ecommerce-prod -- /bin/sh

# Port forward
kubectl port-forward svc/core-service 3000:80 -n ecommerce-prod

# Get events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'
\`\`\`

### Useful Prometheus Queries
\`\`\`promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Pod CPU usage
rate(container_cpu_usage_seconds_total{namespace="ecommerce-prod"}[5m])

# Pod memory usage
container_memory_usage_bytes{namespace="ecommerce-prod"}
\`\`\`
\`\`\`

---

## Deliverables

- [ ] Architecture documentation complete with diagrams
- [ ] API documentation (OpenAPI/Swagger) deployed
- [ ] Runbooks for all common scenarios (10+)
- [ ] Troubleshooting guide comprehensive
- [ ] Onboarding documentation created
- [ ] Knowledge base searchable and organized
- [ ] Documentation versioned and maintained

---

## Success Criteria

| Criteria | Target | Status |
|----------|--------|--------|
| Documentation coverage | 100% of services | ___ |
| API documentation accuracy | 100% | ___ |
| Runbook count | > 10 scenarios | ___ |
| Time to resolve (with runbooks) | < 30 min | ___ |
| New hire onboarding time | < 2 weeks | ___ |

---

**Task Owner:** Tech Lead + Documentation Team  
**Reviewer:** Engineering Manager  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
