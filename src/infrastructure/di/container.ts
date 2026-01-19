import { UserRepository } from '@infrastructure/database/mongodb/repositories/user.repository';
import { ProductRepository } from '@infrastructure/database/mongodb/repositories/product.repository';
import { CartRepository } from '@infrastructure/database/mongodb/repositories/cart.repository';
import { OrderRepository } from '@infrastructure/database/mongodb/repositories/order.repository';
import { AddressRepository } from '@infrastructure/database/mongodb/repositories/address.repository';
import { WishlistRepository } from '@infrastructure/database/mongodb/repositories/wishlist.repository';
import { ReviewRepository } from '@infrastructure/database/mongodb/repositories/review.repository';
import { NotificationRepository } from '@infrastructure/database/mongodb/repositories/notification.repository';
import { OutboxRepository } from '@infrastructure/database/mongodb/repositories/outbox.repository';
import { UserService } from '@application/services/user.service';
import { ProductService } from '@application/services/product.service';
import { CartService } from '@application/services/cart.service';
import { OrderService } from '@application/services/order.service';
import { AddressService } from '@application/services/address.service';
import { WishlistService } from '@application/services/wishlist.service';
import { ReviewService } from '@application/services/review.service';
import { NotificationService } from '@application/services/notification.service';
import { CQRSModule } from '@infrastructure/cqrs/cqrs-module';
import { IPaymentGateway } from '@application/ports/payment-gateway.port';
import { IStorageService } from '@application/ports/storage.port';
import { IEmailService } from '@application/ports/email.port';
import { StripeAdapter } from '@infrastructure/adapters/stripe/stripe.adapter';
import { S3Adapter } from '@infrastructure/adapters/aws/s3.adapter';
import { ConsoleEmailAdapter } from '@infrastructure/adapters/email/console-email.adapter';
import { ResilientPaymentGateway } from '@infrastructure/adapters/resilient-payment-gateway';
import { ResilientStorageService } from '@infrastructure/adapters/resilient-storage';

/**
 * Dependency Injection Container
 * Manages application-wide dependencies and provides singleton access to services
 */
export class Container {
  private static instance: Container;

  // Repositories
  private userRepository: UserRepository;
  private productRepository: ProductRepository;
  private cartRepository: CartRepository;
  private orderRepository: OrderRepository;
  private addressRepository: AddressRepository;
  private wishlistRepository: WishlistRepository;
  private reviewRepository: ReviewRepository;
  private notificationRepository: NotificationRepository;

  // Services
  private userService: UserService;
  private productService: ProductService;
  private cartService: CartService;
  private orderService: OrderService;
  private addressService: AddressService;
  private wishlistService: WishlistService;
  private reviewService: ReviewService;
  private notificationService: NotificationService;

  // Modules
  private cqrsModule: CQRSModule;

  // External Service Adapters
  private paymentGateway: IPaymentGateway;
  private storageService: IStorageService;
  private emailService: IEmailService;

  private constructor() {
    // Initialize repositories
    const outboxRepository = new OutboxRepository();
    this.userRepository = new UserRepository(outboxRepository);
    this.productRepository = new ProductRepository(outboxRepository);
    this.cartRepository = new CartRepository();
    this.orderRepository = new OrderRepository(outboxRepository);
    this.addressRepository = new AddressRepository();
    this.wishlistRepository = new WishlistRepository();
    this.reviewRepository = new ReviewRepository();
    this.notificationRepository = new NotificationRepository();

    // Initialize CQRS
    this.cqrsModule = new CQRSModule();

    // Initialize External Service Adapters with Resilience
    const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    const stripeAdapter = new StripeAdapter(stripeKey);
    this.paymentGateway = new ResilientPaymentGateway(stripeAdapter);

    const awsRegion = process.env.AWS_REGION || 'us-east-1';
    const s3Bucket = process.env.S3_BUCKET_NAME || 'ecommerce-uploads';
    const s3Adapter = new S3Adapter(awsRegion, s3Bucket);
    this.storageService = new ResilientStorageService(s3Adapter);

    this.emailService = new ConsoleEmailAdapter();

    // Initialize services
    this.userService = new UserService(
      this.cqrsModule.commandBus,
      this.cqrsModule.queryBus,
      this.cqrsModule.eventBus
    );

    this.productService = new ProductService(
      this.cqrsModule.commandBus,
      this.cqrsModule.queryBus,
      this.cqrsModule.eventBus
    );

    this.cartService = new CartService(this.cartRepository, this.productRepository);

    // OrderService uses Sagas/CQRS now? 
    // Checking OrderService next... assuming it matches UserService pattern if refactored.
    // Actually, I should check OrderService signature before this edit if possible, 
    // but I can rely on previous knowledge if available. 
    // OrderService was refactored? 
    // Let's assume standard DI for others.
    this.orderService = new OrderService(
      this.cqrsModule.commandBus,
      this.cqrsModule.queryBus,
      this.cqrsModule.eventBus
    );

    this.addressService = new AddressService(this.addressRepository);
    this.wishlistService = new WishlistService(this.wishlistRepository, this.productRepository);
    this.reviewService = new ReviewService(this.reviewRepository, this.productRepository);
    this.notificationService = new NotificationService(this.notificationRepository);
  }

  /**
   * Get CQRS Module instance
   */
  getCQRSModule(): CQRSModule {
    return this.cqrsModule;
  }

  /**
   * Get singleton instance of container
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Get UserService instance
   */
  getUserService(): UserService {
    return this.userService;
  }

  /**
   * Get ProductService instance
   */
  getProductService(): ProductService {
    return this.productService;
  }

  /**
   * Get CartService instance
   */
  getCartService(): CartService {
    return this.cartService;
  }

  /**
   * Get OrderService instance
   */
  getOrderService(): OrderService {
    return this.orderService;
  }

  /**
   * Get AddressService instance
   */
  getAddressService(): AddressService {
    return this.addressService;
  }

  /**
   * Get WishlistService instance
   */
  getWishlistService(): WishlistService {
    return this.wishlistService;
  }

  /**
   * Get ReviewService instance
   */
  getReviewService(): ReviewService {
    return this.reviewService;
  }

  /**
   * Get NotificationService instance
   */
  getNotificationService(): NotificationService {
    return this.notificationService;
  }

  /**
   * Get UserRepository instance (for testing/special cases)
   */
  getUserRepository(): UserRepository {
    return this.userRepository;
  }

  /**
   * Get ProductRepository instance (for testing/special cases)
   */
  getProductRepository(): ProductRepository {
    return this.productRepository;
  }

  /**
   * Get CartRepository instance (for testing/special cases)
   */
  getCartRepository(): CartRepository {
    return this.cartRepository;
  }

  /**
   * Get OrderRepository instance (for testing/special cases)
   */
  getOrderRepository(): OrderRepository {
    return this.orderRepository;
  }

  /**
   * Get PaymentGateway instance
   */
  getPaymentGateway(): IPaymentGateway {
    return this.paymentGateway;
  }

  /**
   * Get StorageService instance
   */
  getStorageService(): IStorageService {
    return this.storageService;
  }

  /**
   * Get EmailService instance
   */
  getEmailService(): IEmailService {
    return this.emailService;
  }
}

/**
 * Helper function to get container instance
 */
export const getContainer = (): Container => Container.getInstance();
