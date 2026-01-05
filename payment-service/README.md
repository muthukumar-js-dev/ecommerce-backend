# Payment Service

Standalone microservice for handling payment processing in the e-commerce platform.

## Features

- **Payment Processing**: Initiate, authorize, capture, and refund payments
- **Stripe Integration**: Secure payment processing via Stripe API
- **Event-Driven**: Publishes payment events to Kafka for other services
- **Outbox Pattern**: Reliable event publishing with transactional outbox
- **Idempotency**: Prevents duplicate payment processing
- **Webhook Support**: Handles Stripe webhook events

## Architecture

### Domain Model
- **Payment Aggregate**: Manages payment lifecycle with state machine
- **Payment Events**: PaymentInitiated, PaymentSucceeded, PaymentFailed
- **Payment States**: PENDING → AUTHORIZED → CAPTURED/FAILED/REFUNDED

### Application Layer
- **Commands**: InitiatePayment, CapturePayment, RefundPayment
- **Queries**: GetPayment, GetPaymentsByOrder
- **Handlers**: Process commands and queries

### Infrastructure
- **Database**: MongoDB for payment persistence
- **Messaging**: Kafka for event publishing and consumption
- **External Service**: Stripe for payment processing

## API Endpoints

### Payment Operations
- `POST /api/payments/initiate` - Initiate a new payment
- `POST /api/payments/:paymentId/capture` - Capture authorized payment
- `POST /api/payments/:paymentId/refund` - Refund captured payment
- `GET /api/payments/:paymentId` - Get payment details

### Webhooks
- `POST /api/payments/webhook/stripe` - Stripe webhook handler

### Health Check
- `GET /health` - Service health status

## Environment Variables

See `.env.example` for required configuration:
- `MONGODB_URI` - MongoDB connection string
- `KAFKA_BROKERS` - Kafka broker addresses
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `PORT` - Service port (default: 3001)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f payment-service

# Stop services
docker-compose down
```

## Event Flow

### Incoming Events
- **OrderPlaced** (from Order Service): Triggers payment initiation

### Outgoing Events
- **PaymentInitiated**: Published when payment is created
- **PaymentSucceeded**: Published when payment is captured
- **PaymentFailed**: Published when payment fails

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm test -- tests/unit

# Run integration tests
npm test -- tests/integration

# Run with coverage
npm run test:coverage
```

## Monitoring

- Health check endpoint: `GET /health`
- Kafka consumer lag monitoring
- Outbox publisher statistics
- Payment success/failure rates

## Security

- Stripe webhook signature verification
- API authentication (when integrated with auth service)
- Secure environment variable management
- HTTPS in production

## Migration Strategy

1. Deploy payment service alongside monolith
2. Configure Kafka topics and consumers
3. Dual-write period for verification
4. Switch reads to payment service
5. Remove payment code from monolith

## Support

For issues or questions, contact the development team.
