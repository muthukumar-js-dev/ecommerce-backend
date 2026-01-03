import { UserRepository } from '@infrastructure/database/mongodb/repositories/user.repository';
import { ProductRepository } from '@infrastructure/database/mongodb/repositories/product.repository';
import { CartRepository } from '@infrastructure/database/mongodb/repositories/cart.repository';
import { OrderRepository } from '@infrastructure/database/mongodb/repositories/order.repository';
import { AddressRepository } from '@infrastructure/database/mongodb/repositories/address.repository';
import { WishlistRepository } from '@infrastructure/database/mongodb/repositories/wishlist.repository';
import { ReviewRepository } from '@infrastructure/database/mongodb/repositories/review.repository';
import { NotificationRepository } from '@infrastructure/database/mongodb/repositories/notification.repository';
import { UserService } from '@application/services/user.service';
import { ProductService } from '@application/services/product.service';
import { CartService } from '@application/services/cart.service';
import { OrderService } from '@application/services/order.service';
import { AddressService } from '@application/services/address.service';
import { WishlistService } from '@application/services/wishlist.service';
import { ReviewService } from '@application/services/review.service';
import { NotificationService } from '@application/services/notification.service';

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

  private constructor() {
    // Initialize repositories
    this.userRepository = new UserRepository();
    this.productRepository = new ProductRepository();
    this.cartRepository = new CartRepository();
    this.orderRepository = new OrderRepository();
    this.addressRepository = new AddressRepository();
    this.wishlistRepository = new WishlistRepository();
    this.reviewRepository = new ReviewRepository();
    this.notificationRepository = new NotificationRepository();

    // Initialize services
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.userService = new UserService(this.userRepository, jwtSecret);
    this.productService = new ProductService(this.productRepository);
    this.cartService = new CartService(this.cartRepository, this.productRepository);
    this.orderService = new OrderService(this.orderRepository, this.cartRepository);
    this.addressService = new AddressService(this.addressRepository);
    this.wishlistService = new WishlistService(this.wishlistRepository, this.productRepository);
    this.reviewService = new ReviewService(this.reviewRepository, this.productRepository);
    this.notificationService = new NotificationService(this.notificationRepository);
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
}

/**
 * Helper function to get container instance
 */
export const getContainer = (): Container => Container.getInstance();
