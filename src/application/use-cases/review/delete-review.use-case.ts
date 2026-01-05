import { IReviewRepository } from '@domain/review/repositories/review.repository.interface';
import { AsyncResult, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

export class DeleteReviewUseCase {
  constructor(private readonly reviewRepository: IReviewRepository) {}

  async execute(userId: ID, reviewId: ID): AsyncResult<void> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      return failure(new NotFoundError('Review', reviewId));
    }

    const reviewProps = (review as any).props;

    // Verify review belongs to user
    if (reviewProps.userId !== userId) {
      return failure(new NotFoundError('Review', reviewId));
    }

    return this.reviewRepository.delete(reviewId);
  }
}
