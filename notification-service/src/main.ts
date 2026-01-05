import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import { TemplateService } from './application/templates/template.service';
import { SendGridAdapter } from './infrastructure/email/sendgrid.adapter';
import { SendEmailUseCase } from './application/use-cases/send-email.use-case';
import { NotificationRepository } from './infrastructure/database/repositories/notification.repository';
import { ConsumerGroups } from './infrastructure/messaging/consumer-groups';
import { NotificationController } from './api/controllers/notification.controller';
import { createNotificationRoutes } from './api/routes/notification.routes';
import { ServiceRegistry } from '@shared/infrastructure/service-mesh/service-registry';
import { createTracer } from '@shared/infrastructure/tracing/jaeger-tracer';
import { tracingMiddleware } from '@shared/infrastructure/tracing/tracing.middleware';
import { PrometheusMetrics } from '@shared/infrastructure/metrics/prometheus-metrics';
import { metricsMiddleware } from '@shared/infrastructure/metrics/metrics.middleware';
import { createLogger, loggingMiddleware } from '@shared/infrastructure/logging/logger';

// Load environment variables
dotenv.config();

/**
 * Bootstrap Notification Service
 */
async function bootstrap() {
    try {
        console.log('🚀 Starting Notification Service...');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notification-service';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Register with Consul
        const serviceRegistry = new ServiceRegistry(
            process.env.CONSUL_HOST,
            process.env.CONSUL_PORT
        );
        const port = process.env.PORT || 3002;
        await serviceRegistry.register('notification-service', Number(port), '/health');
        console.log('✅ Registered with Consul');

        // Initialize monitoring
        const tracer = createTracer('notification-service');
        const metrics = new PrometheusMetrics('notification-service');
        const logger = createLogger('notification-service');
        console.log('✅ Monitoring initialized');

        // Initialize template service
        const templateService = new TemplateService('./templates');
        await templateService.initialize();

        // Setup email service
        const sendGridApiKey = process.env.SENDGRID_API_KEY;
        if (!sendGridApiKey) {
            throw new Error('SENDGRID_API_KEY environment variable is required');
        }
        const emailService = new SendGridAdapter(
            sendGridApiKey,
            process.env.FROM_EMAIL || 'noreply@example.com'
        );
        console.log('✅ Email service initialized');

        // Setup repositories
        const notificationRepo = new NotificationRepository();

        // Setup use cases
        const sendEmailUseCase = new SendEmailUseCase(
            templateService,
            emailService,
            notificationRepo
        );

        // Setup Kafka
        const kafka = new Kafka({
            clientId: 'notification-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        });

        // Start Kafka consumers
        const consumerGroups = new ConsumerGroups(kafka, sendEmailUseCase);
        await consumerGroups.startAll();

        // Setup Express
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
        const notificationController = new NotificationController(sendEmailUseCase);
        app.use('/api/notifications', createNotificationRoutes(notificationController));

        // Global health check
        app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'notification-service',
                timestamp: new Date().toISOString(),
            });
        });

        // Metrics endpoint
        app.get('/metrics', async (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.send(await metrics.getMetrics());
        });

        // Error handling
        app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('Unhandled error:', err);
            res.status(500).json({
                error: 'Internal server error',
                message: err.message,
            });
        });

        // Start server
        app.listen(port, () => {
            console.log(`✅ Notification service listening on port ${port}`);
            console.log(`📧 Ready to send notifications!`);
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('\n🛑 Shutting down gracefully...');
            await consumerGroups.stopAll();
            await mongoose.disconnect();
            console.log('✅ Shutdown complete');
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('❌ Failed to start notification service:', error);
        process.exit(1);
    }
}

// Start the service
bootstrap();
