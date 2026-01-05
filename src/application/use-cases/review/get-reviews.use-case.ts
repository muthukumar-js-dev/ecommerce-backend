import { IReviewRepository } from '@domain/review/repositories/review.repository.interface';
import { Review } from '@domain/review/entities/review.entity';
import { ID } from '@shared/types/common';

/**
 * Get Reviews Use Case
 * Retrieves reviews for a product
 */
export class GetReviewsUseCase {
  constructor(private readonly reviewRepository: IReviewRepository) {}

  async execute(productId: ID): Promise<Review[]> {
    return this.reviewRepository.findByProductId(productId);
  }
}
