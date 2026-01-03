import { IReviewRepository } from '@domain/review/repositories/review.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { Review } from '@domain/review/entities/review.entity';
import { CreateReviewRequestDTO, ReviewResponseDTO } from '@application/dtos/review/review.dto';
import { AsyncResult, success, failure, Result } from '@shared/types/result';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { randomUUID } from 'crypto';

export class CreateReviewUseCase {
  constructor(
    private readonly reviewRepository: IReviewRepository,
    private readonly productRepository: IProductRepository
  ) {}

  async execute(userId: ID, dto: CreateReviewRequestDTO): AsyncResult<ReviewResponseDTO> {
    const validationResult = this.validate(dto);
    if (!validationResult.success) {
      return validationResult as any;
    }

    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      return failure(new NotFoundError('Product', dto.productId));
    }

    const review = Review.create(
      {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        reviewText: dto.comment || '',
        status: 1,
      },
      randomUUID()
    );

    const saveResult = await this.reviewRepository.save(review);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success(this.toDTO(saveResult.data));
  }

  private validate(dto: CreateReviewRequestDTO): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!dto.productId) {
      errors.push({ field: 'productId', message: 'Product ID is required' });
    }

    if (!dto.rating || dto.rating < 1 || dto.rating > 5) {
      errors.push({ field: 'rating', message: 'Rating must be between 1 and 5' });
    }

    if (errors.length > 0) {
      return failure(new ValidationError('Validation failed', errors));
    }

    return success(undefined);
  }

  private toDTO(review: Review): ReviewResponseDTO {
    const props = (review as any).props;
    return {
      id: review.id,
      userId: props.userId,
      productId: props.productId,
      rating: props.rating,
      comment: props.comment,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}
