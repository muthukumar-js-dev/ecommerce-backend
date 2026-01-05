import { CreateReviewUseCase } from '../use-cases/review/create-review.use-case';
import { UpdateReviewUseCase } from '../use-cases/review/update-review.use-case';
import { DeleteReviewUseCase } from '../use-cases/review/delete-review.use-case';
import { IReviewRepository } from '@domain/review/repositories/review.repository.interface';
// import { IProductRepository } from '@domain/product/repositories/product.repository.interface'; // Removed unused import
import { CreateReviewRequestDTO, ReviewResponseDTO } from '../dtos/review/review.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

export class ReviewService {
  private createReviewUseCase: CreateReviewUseCase;
  private updateReviewUseCase: UpdateReviewUseCase;
  private deleteReviewUseCase: DeleteReviewUseCase;

  constructor(reviewRepository: IReviewRepository, productRepository: any) {
    this.createReviewUseCase = new CreateReviewUseCase(reviewRepository, productRepository);
    this.updateReviewUseCase = new UpdateReviewUseCase(reviewRepository);
    this.deleteReviewUseCase = new DeleteReviewUseCase(reviewRepository);
  }

  async createReview(userId: ID, dto: CreateReviewRequestDTO): AsyncResult<ReviewResponseDTO> {
    return this.createReviewUseCase.execute(userId, dto);
  }

  async updateReview(userId: ID, reviewId: ID, dto: Partial<CreateReviewRequestDTO>): AsyncResult<void> {
    return this.updateReviewUseCase.execute(userId, reviewId, dto);
  }

  async deleteReview(userId: ID, reviewId: ID): AsyncResult<void> {
    return this.deleteReviewUseCase.execute(userId, reviewId);
  }
}
