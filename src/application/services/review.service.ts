import { CreateReviewUseCase } from '../use-cases/review/create-review.use-case';
import { IReviewRepository } from '@domain/review/repositories/review.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { CreateReviewRequestDTO, ReviewResponseDTO } from '../dtos/review/review.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

export class ReviewService {
  private createReviewUseCase: CreateReviewUseCase;

  constructor(reviewRepository: IReviewRepository, productRepository: IProductRepository) {
    this.createReviewUseCase = new CreateReviewUseCase(reviewRepository, productRepository);
  }

  async createReview(userId: ID, dto: CreateReviewRequestDTO): AsyncResult<ReviewResponseDTO> {
    return this.createReviewUseCase.execute(userId, dto);
  }
}
