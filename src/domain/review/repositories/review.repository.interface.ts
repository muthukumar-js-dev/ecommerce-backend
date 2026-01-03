import { Review } from '../entities/review.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

export interface IReviewRepository {
  findById(id: ID): Promise<Review | null>;
  findByProductId(productId: ID, skip?: number, limit?: number): Promise<Review[]>;
  findByUserId(userId: ID): Promise<Review[]>;
  save(review: Review): Promise<Result<Review>>;
  update(review: Review): Promise<Result<Review>>;
  delete(id: ID): Promise<Result<void>>;
  getAverageRating(productId: ID): Promise<number>;
}
