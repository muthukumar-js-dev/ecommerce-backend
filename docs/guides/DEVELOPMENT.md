# Development Guide

## Running the Application

### Development Mode

#### Run All Services Together (Recommended)
```bash
npm run dev:all
```
This starts all three services concurrently:
- **MAIN** (cyan) - Main ecommerce application
- **PAYMENT** (magenta) - Payment microservice
- **NOTIF** (green) - Notification microservice

Each service has color-coded output for easy log identification.

#### Run Individual Services

**Main Application Only:**
```bash
npm run dev
```

**Payment Service Only:**
```bash
npm run dev:payment
```

**Notification Service Only:**
```bash
npm run dev:notification
```

**Both Microservices (without main app):**
```bash
npm run dev:services
```

### Production Mode

```bash
# Build all services
npm run build

# Start main application
npm start

# Start in production mode
npm run start:prod
```

## Features

- **Hot Reload**: All services use `ts-node-dev` for automatic restart on file changes
- **Color-Coded Logs**: Easy to distinguish between services
- **Named Processes**: Clear labels (MAIN, PAYMENT, NOTIF) in console output
- **Single Command**: Start everything with `npm run dev:all`

## Environment Setup

Make sure you have:
1. `.env` file configured (copy from `.env.example`)
2. MongoDB running (or configured connection string)
3. Kafka running (if using event-driven features)

## Troubleshooting

**Port conflicts?** Check that ports are not already in use:
- Main app: 3000 (default)
- Payment service: 3001 (default)
- Notification service: 3002 (default)

**Services not starting?** Verify:
- All dependencies installed: `npm install`
- Environment variables set in `.env`
- Required infrastructure (MongoDB, Kafka) is running
