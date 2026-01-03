/**
 * Request DTO for adding item to cart
 */
export interface AddToCartRequestDTO {
  productId: string;
  quantity: number;
}

/**
 * Request DTO for updating cart item quantity
 */
export interface UpdateCartItemRequestDTO {
  productId: string;
  quantity: number;
}

/**
 * Cart item DTO
 */
export interface CartItemDTO {
  productId: string;
  quantity: number;
  later: boolean;
}

/**
 * Response DTO for cart
 */
export interface CartResponseDTO {
  id: string;
  userId: string;
  items: CartItemDTO[];
  totalAmount: number;
  totalActualAmount: number;
  totalDiscount: number;
  currency: string;
  itemCount: number;
}
