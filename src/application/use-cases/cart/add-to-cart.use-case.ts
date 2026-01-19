import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
// import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Removed unused import
import { Cart } from '@domain/cart/entities/cart.entity';
import { AddToCartRequestDTO, CartResponseDTO } from '@application/dtos/cart/cart.dto';
import { AsyncResult, success, failure, Result } from '@shared/types/result';
import { NotFoundError, ValidationError, OutOfStockError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { APP_CONSTANTS } from '@shared/constants';
import { randomUUID } from 'crypto';

/**
 * Use case for adding item to cart
 */
export class AddToCartUseCase {
  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly productRepository: any
  ) {}

  /**
   * Execute the add to cart use case
   */
  async execute(userId: ID, dto: AddToCartRequestDTO): AsyncResult<CartResponseDTO> {
    // Validate input
    const validationResult = this.validate(dto);
    if (!validationResult.success) {
      return validationResult as any;
    }

    // Check if product exists
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      return failure(new NotFoundError('Product', dto.productId));
    }

    // Check if product is in stock
    const productProps = (product).props;
    if (productProps.outOfStock) {
      return failure(new OutOfStockError(productProps.title));
    }

    // Get or create cart
    let cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      cart = Cart.create(
        {
          userId,
          items: [],
          totalAmount: 0,
          totalActualAmount: 0,
          totalDiscount: 0,
          currency: APP_CONSTANTS.DEFAULT_CURRENCY,
        },
        randomUUID()
      );
    }

    // Add item to cart
    cart.addItem(dto.productId, dto.quantity);

    // Save cart
    const saveResult = await this.cartRepository.save(cart);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    // Return response
    return success(this.toDTO(saveResult.data));
  }

  /**
   * Validate add to cart input
   */
  private validate(dto: AddToCartRequestDTO): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!dto.productId || dto.productId.trim().length === 0) {
      errors.push({ field: 'productId', message: 'Product ID is required' });
    }

    if (!dto.quantity || dto.quantity < APP_CONSTANTS.MIN_CART_ITEM_QUANTITY) {
      errors.push({
        field: 'quantity',
        message: `Quantity must be at least ${APP_CONSTANTS.MIN_CART_ITEM_QUANTITY}`,
      });
    }

    if (dto.quantity > APP_CONSTANTS.MAX_CART_ITEM_QUANTITY) {
      errors.push({
        field: 'quantity',
        message: `Quantity cannot exceed ${APP_CONSTANTS.MAX_CART_ITEM_QUANTITY}`,
      });
    }

    if (errors.length > 0) {
      return failure(new ValidationError('Validation failed', errors));
    }

    return success(undefined);
  }

  /**
   * Map Cart entity to DTO
   */
  private toDTO(cart: Cart): CartResponseDTO {
    const props = (cart as any).props;
    return {
      id: cart.id,
      userId: props.userId,
      items: props.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        later: item.later,
      })),
      totalAmount: props.totalAmount,
      totalActualAmount: props.totalActualAmount,
      totalDiscount: props.totalDiscount,
      currency: props.currency,
      itemCount: cart.itemCount,
    };
  }
}
