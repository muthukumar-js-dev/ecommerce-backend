import { IReviewRepository } from '@domain/review/repositories/review.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

interface UpdateReviewDTO {
  rating?: number;
  comment?: string;
}

export class UpdateReviewUseCase {
  constructor(private readonly reviewRepository: IReviewRepository) {}

  async execute(userId: ID, reviewId: ID, dto: UpdateReviewDTO): AsyncResult<void> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      return failure(new NotFoundError('Review', reviewId));
    }

    const reviewProps = (review as any).props;

    // Verify review belongs to user
    if (reviewProps.userId !== userId) {
      return failure(new NotFoundError('Review', reviewId));
    }

    // Update properties
    if (dto.rating !== undefined) reviewProps.rating = dto.rating;
    if (dto.comment) reviewProps.comment = dto.comment;
    reviewProps.updatedAt = new Date();

    const updateResult = await this.reviewRepository.update(review);
    if (!updateResult.success) {
      return failure(updateResult.error);
    }

    return success(undefined);
  }
}
