import { AddToCartUseCase } from '../use-cases/cart/add-to-cart.use-case';
import { GetCartUseCase } from '../use-cases/cart/get-cart.use-case';
import { RemoveFromCartUseCase } from '../use-cases/cart/remove-from-cart.use-case';
import { UpdateCartItemQuantityUseCase } from '../use-cases/cart/update-cart-item-quantity.use-case';
import { ClearCartUseCase } from '../use-cases/cart/clear-cart.use-case';
import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
// import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Removed unused import
import { AddToCartRequestDTO, UpdateCartItemRequestDTO, CartResponseDTO } from '../dtos/cart/cart.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

/**
 * Application service for Cart domain
 * Aggregates all cart-related use cases
 */
export class CartService {
  private addToCartUseCase: AddToCartUseCase;
  private getCartUseCase: GetCartUseCase;
  private removeFromCartUseCase: RemoveFromCartUseCase;
  private updateCartItemQuantityUseCase: UpdateCartItemQuantityUseCase;
  private clearCartUseCase: ClearCartUseCase;

  constructor(
    cartRepository: ICartRepository,
    productRepository: any
  ) {
    this.addToCartUseCase = new AddToCartUseCase(cartRepository, productRepository);
    this.getCartUseCase = new GetCartUseCase(cartRepository);
    this.removeFromCartUseCase = new RemoveFromCartUseCase(cartRepository);
    this.updateCartItemQuantityUseCase = new UpdateCartItemQuantityUseCase(cartRepository);
    this.clearCartUseCase = new ClearCartUseCase(cartRepository);
  }

  /**
   * Add item to cart
   */
  async addToCart(userId: ID, dto: AddToCartRequestDTO): AsyncResult<CartResponseDTO> {
    return this.addToCartUseCase.execute(userId, dto);
  }

  /**
   * Get user's cart
   */
  async getCart(userId: ID): AsyncResult<CartResponseDTO> {
    return this.getCartUseCase.execute(userId);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: ID, productId: string): AsyncResult<void> {
    return this.removeFromCartUseCase.execute(userId, productId);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(userId: ID, dto: UpdateCartItemRequestDTO): AsyncResult<void> {
    return this.updateCartItemQuantityUseCase.execute(userId, dto);
  }

  /**
   * Clear cart
   */
  async clearCart(userId: ID): AsyncResult<void> {
    return this.clearCartUseCase.execute(userId);
  }
}
