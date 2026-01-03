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
  app.use(requestLogger);

  // Setup Swagger
  setupSwagger(app);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

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
