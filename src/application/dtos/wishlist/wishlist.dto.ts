/**
 * Request DTO for adding product to wishlist
 */
export interface AddToWishlistRequestDTO {
  productId: string;
}

/**
 * Wishlist item DTO
 */
export interface WishlistItemDTO {
  productId: string;
  addedAt: string;
}

/**
 * Response DTO for wishlist
 */
export interface WishlistResponseDTO {
  id: string;
  userId: string;
  products: WishlistItemDTO[];
  itemCount: number;
}
