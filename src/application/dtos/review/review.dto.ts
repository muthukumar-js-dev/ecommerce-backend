/**
 * Request DTO for creating a review
 */
export interface CreateReviewRequestDTO {
  productId: string;
  rating: number;
  comment?: string;
}

/**
 * Response DTO for review
 */
export interface ReviewResponseDTO {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}
