# Notification Service

A stateless microservice for sending email and SMS notifications in response to events from the e-commerce platform.

## Features

- 📧 **Email Notifications** via SendGrid
- 🎨 **Template Management** with Handlebars
- 🔄 **Event-Driven** architecture with Kafka
- 📊 **Delivery Tracking** with MongoDB
- 🔁 **Automatic Retry** for failed notifications
- 🐳 **Docker** deployment ready

## Architecture

The notification service follows Clean Architecture principles:

```
src/
├── domain/              # Business entities and rules
├── application/         # Use cases and templates
├── infrastructure/      # External services (SendGrid, Kafka, MongoDB)
└── api/                # REST endpoints
```

## Email Templates

The service includes 6 pre-built email templates:

1. **Welcome Email** - Sent when users register
2. **Order Confirmation** - Sent when orders are placed
3. **Order Shipped** - Sent when orders ship
4. **Order Delivered** - Sent when orders are delivered
5. **Payment Receipt** - Sent when payments succeed
6. **Password Reset** - Sent for password reset requests

All templates use Handlebars with custom helpers for currency and date formatting.

## Setup

### Prerequisites

- Node.js 20+
- MongoDB
- Kafka
- SendGrid API Key

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and add your SendGrid API key
```

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/notification-service
PORT=3002
KAFKA_BROKERS=localhost:9092
SENDGRID_API_KEY=SG.your_api_key_here
FROM_EMAIL=noreply@example.com
FRONTEND_URL=http://localhost:3000
```

## Running the Service

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker-compose up
```

## API Endpoints

### Health Check

```http
GET /health
```

### Manual Email Trigger

```http
POST /api/notifications/send
Content-Type: application/json

{
  "type": "WELCOME_EMAIL",
  "recipient": "user@example.com",
  "data": {
    "name": "John Doe",
    "email": "user@example.com",
    "platformName": "E-Commerce Platform",
    "loginUrl": "http://localhost:3000/login"
  }
}
```

## Kafka Events

The service consumes the following events:

| Event | Topic | Template |
|-------|-------|----------|
| UserRegistered | `user.registered` | Welcome Email |
| OrderPlaced | `order.placed` | Order Confirmation |
| OrderShipped | `order.shipped` | Order Shipped |
| PaymentSucceeded | `payment.succeeded` | Payment Receipt |

## Template Customization

Templates are located in `templates/` directory. To customize:

1. Edit the HTML file
2. Use Handlebars syntax: `{{variableName}}`
3. Available helpers:
   - `{{formatCurrency amount}}` - Formats as ₹1,234.56
   - `{{formatDate date}}` - Formats as "January 5, 2026"
   - `{{formatTime date}}` - Formats as "11:30 AM"

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t notification-service .

# Run container
docker run -p 3002:3002 \
  -e SENDGRID_API_KEY=your_key \
  -e MONGODB_URI=mongodb://mongo:27017/notifications \
  notification-service
```

### Environment-Specific Configuration

- **Development**: Uses local MongoDB and Kafka
- **Production**: Uses managed services (MongoDB Atlas, Confluent Cloud)

## Monitoring

The service provides:

- Health check endpoint at `/health`
- Structured logging with timestamps
- Kafka consumer group monitoring
- Email delivery status tracking

## Error Handling

- **Failed emails** are automatically retried up to 3 times
- **Retry logic** with exponential backoff
- **Dead letter queue** for permanently failed notifications
- **Detailed error logging** for debugging

## Performance

- **Stateless design** allows horizontal scaling
- **Kafka consumer groups** for parallel processing
- **Bulk email sending** for high throughput
- **Template caching** for faster rendering

## Security

- API key authentication for SendGrid
- Environment variable configuration
- No sensitive data in logs
- CORS and Helmet middleware

## License

ISC

## Support

For issues or questions, contact the development team.
