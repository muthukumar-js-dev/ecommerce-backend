import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createKafkaClient, getKafkaConfig } from '@shared/infrastructure/messaging/kafka/kafka.config';
import { KafkaProducer } from '@shared/infrastructure/messaging/kafka/kafka-producer';
import { OutboxPublisher } from '@shared/infrastructure/messaging/outbox/outbox-publisher';
import { OutboxRepository } from '@shared/infrastructure/database/mongodb/repositories/outbox.repository';
import { PaymentRepository } from './infrastructure/database/repositories/payment.repository';
import { StripeAdapter } from './infrastructure/stripe/stripe.adapter';
import { InitiatePaymentHandler } from './application/commands/initiate-payment.handler';
import { CapturePaymentHandler } from './application/commands/capture-payment.handler';
import { RefundPaymentHandler } from './application/commands/refund-payment.handler';
import { GetPaymentHandler } from './application/queries/get-payment.handler';
import { PaymentController } from './api/controllers/payment.controller';
import { createPaymentRoutes } from './api/routes/payment.routes';
import { ConsumerGroups } from './infrastructure/messaging/consumer-groups';
import { OrderPlacedHandler } from './infrastructure/messaging/handlers/order-placed.handler';
import { ServiceRegistry } from '@shared/infrastructure/service-mesh/service-registry';
import { createTracer } from '@shared/infrastructure/tracing/jaeger-tracer';
import { tracingMiddleware } from '@shared/infrastructure/tracing/tracing.middleware';
import { PrometheusMetrics } from '@shared/infrastructure/metrics/prometheus-metrics';
import { metricsMiddleware } from '@shared/infrastructure/metrics/metrics.middleware';
import { createLogger, loggingMiddleware } from '@shared/infrastructure/logging/logger';

// Load environment variables
dotenv.config();

/**
 * Bootstrap Payment Service
 */
async function bootstrap() {
    try {
        console.log('🚀 Starting Payment Service...');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-service';
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // Register with Consul
        const serviceRegistry = new ServiceRegistry(
            process.env.CONSUL_HOST,
            process.env.CONSUL_PORT
        );
        const port = process.env.PORT || 3001;
        await serviceRegistry.register('payment-service', Number(port), '/health');
        console.log('✓ Registered with Consul');

        // Initialize monitoring
        const tracer = createTracer('payment-service');
        const metrics = new PrometheusMetrics('payment-service');
        const logger = createLogger('payment-service');
        console.log('✓ Monitoring initialized');

        // Initialize repositories
        const outboxRepository = new OutboxRepository();
        const paymentRepository = new PaymentRepository(outboxRepository);

        // Initialize Stripe adapter
        const stripeApiKey = process.env.STRIPE_SECRET_KEY || '';
        if (!stripeApiKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable is required');
        }
        const stripeAdapter = new StripeAdapter(stripeApiKey);
        console.log('✓ Stripe adapter initialized');

        // Initialize command handlers
        const initiatePaymentHandler = new InitiatePaymentHandler(
            paymentRepository,
            stripeAdapter
        );
        const capturePaymentHandler = new CapturePaymentHandler(
            paymentRepository,
            stripeAdapter
        );
        const refundPaymentHandler = new RefundPaymentHandler(
            paymentRepository,
            stripeAdapter
        );

        // Initialize query handlers
        const getPaymentHandler = new GetPaymentHandler(paymentRepository);

        // Setup Kafka
        const kafkaConfig = getKafkaConfig();
        const kafka = createKafkaClient(kafkaConfig);
        const kafkaProducer = new KafkaProducer(kafka);
        await kafkaProducer.connect();
        console.log('✓ Kafka producer connected');

        // Start outbox publisher
        const outboxPublisher = new OutboxPublisher(outboxRepository, kafkaProducer, {
            pollingIntervalMs: 1000,
            batchSize: 100,
            maxRetries: 5,
        });
        await outboxPublisher.start();

        // Start Kafka consumers
        const orderPlacedHandler = new OrderPlacedHandler(initiatePaymentHandler);
        const consumerGroups = new ConsumerGroups(kafka, orderPlacedHandler);
        await consumerGroups.startAll();

        // Setup Express app
        const app = express();

        // Middleware
        app.use(helmet());
        app.use(cors());
        app.use(morgan('combined'));
        app.use(express.json());

        // Monitoring middleware
        app.use(tracingMiddleware(tracer));
        app.use(metricsMiddleware(metrics));
        app.use(loggingMiddleware(logger));

        // Routes
        const paymentController = new PaymentController(
            initiatePaymentHandler,
            capturePaymentHandler,
            refundPaymentHandler,
            getPaymentHandler,
            stripeAdapter
        );
        app.use('/api/payments', createPaymentRoutes(paymentController));

        // Health check
        app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'payment-service',
                timestamp: new Date().toISOString(),
            });
        });

        // Metrics endpoint
        app.get('/metrics', async (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.send(await metrics.getMetrics());
        });

        // Start server
        app.listen(port, () => {
            console.log(`✓ Payment service listening on port ${port}`);
            console.log('🎉 Payment service started successfully!');
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('\n🛑 Shutting down gracefully...');
            await outboxPublisher.stop();
            await consumerGroups.stopAll();
            await kafkaProducer.disconnect();
            await mongoose.disconnect();
            console.log('✓ Shutdown complete');
            process.exit(0);
        };

        process.on('SIGTERM', () => { void shutdown(); });
        process.on('SIGINT', () => { void shutdown(); });
    } catch (error) {
        console.error('❌ Failed to start payment service:', error);
        process.exit(1);
    }
}

// Start the service
void bootstrap();
