import express, { Application } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import { Container } from '@infrastructure/di/container';
import { UserController } from './controllers/user.controller';
import { ProductController } from './controllers/product.controller';
import { CartController } from './controllers/cart.controller';
import { OrderController } from './controllers/order.controller';
import { createUserRoutes } from './routes/user.routes';
import { createProductRoutes } from './routes/product.routes';
import { createCartRoutes } from './routes/cart.routes';
import { createOrderRoutes } from './routes/order.routes';
import { AddressController } from './controllers/address.controller';
import { WishlistController } from './controllers/wishlist.controller';
import { ReviewController } from './controllers/review.controller';
import { NotificationController } from './controllers/notification.controller';
import { createAddressRoutes } from './routes/address.routes';
import { createWishlistRoutes } from './routes/wishlist.routes';
import { createReviewRoutes } from './routes/review.routes';
import { createNotificationRoutes } from './routes/notification.routes';
import { eventDispatcherMiddleware } from '@infrastructure/events/event-dispatcher.middleware';
import { createTracer } from '@infrastructure/tracing/jaeger-tracer';
import { tracingMiddleware } from '@infrastructure/tracing/tracing.middleware';
import { PrometheusMetrics } from '@infrastructure/metrics/prometheus-metrics';
import { metricsMiddleware } from '@infrastructure/metrics/metrics.middleware';
import { createLogger, loggingMiddleware } from '@infrastructure/logging/logger';
import { createHealthRoute } from '@infrastructure/health/health-check';

import { setupSwagger } from './swagger';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();
  const container = Container.getInstance();

  // Middleware
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Monitoring middleware
  const tracer = createTracer('core-service');
  const metrics = new PrometheusMetrics('core-service');
  const logger = createLogger('core-service');
  app.use(tracingMiddleware(tracer));
  app.use(metricsMiddleware(metrics));
  app.use(loggingMiddleware(logger));

  // Event Dispatcher Middleware
  // Note: We need to access the CQRS module's event bus from the container. 
  // Assuming container exposes it, or we rely on the implementation detail.
  // For now, checking if Container has getEventBus().
  // If not, we might need to expose it or instantiate here (which is less ideal).
  // Checking Container implementation first is safer.


  // Event Dispatcher Middleware
  const cqrsModule = container.getCQRSModule();
  app.use(eventDispatcherMiddleware(cqrsModule.eventBus));

  // Setup Swagger
  setupSwagger(app);

  // Health check endpoints
  app.use(createHealthRoute());

  // Initialize controllers
  const userController = new UserController(container.getUserService());
  const productController = new ProductController(container.getProductService());
  const cartController = new CartController(container.getCartService());
  const orderController = new OrderController(container.getOrderService());
  const addressController = new AddressController(container.getAddressService());
  const wishlistController = new WishlistController(container.getWishlistService());
  const reviewController = new ReviewController(container.getReviewService());
  const notificationController = new NotificationController(container.getNotificationService());

  // API routes
  app.use('/api/users', createUserRoutes(userController));
  app.use('/api/products', createProductRoutes(productController));
  app.use('/api/cart', createCartRoutes(cartController));
  app.use('/api/orders', createOrderRoutes(orderController));
  app.use('/api/addresses', createAddressRoutes(addressController));
  app.use('/api/wishlist', createWishlistRoutes(wishlistController));
  app.use('/api/reviews', createReviewRoutes(reviewController));
  app.use('/api/notifications', createNotificationRoutes(notificationController));

  // Metrics endpoint
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(await metrics.getMetrics());
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
