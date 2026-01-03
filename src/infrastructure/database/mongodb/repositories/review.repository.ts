import mongoose from 'mongoose';
import { IReviewRepository } from '@domain/review/repositories/review.repository.interface';
import { Review, ReviewProps } from '@domain/review/entities/review.entity';
import { ReviewModel, IReviewDocument } from '../schemas/review.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

export class ReviewRepository implements IReviewRepository {
  async findById(id: ID): Promise<Review | null> {
    try {
      const doc = await ReviewModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError('Failed to find review by ID', 'REVIEW_FIND_BY_ID_ERROR', error as Error);
    }
  }

  async findByProductId(productId: ID, skip = 0, limit = 50): Promise<Review[]> {
    try {
      const docs = await ReviewModel.find({ productId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find reviews by product ID',
        'REVIEW_FIND_BY_PRODUCT_ERROR',
        error as Error
      );
    }
  }

  async findByUserId(userId: ID): Promise<Review[]> {
    try {
      const docs = await ReviewModel.find({ userId }).sort({ createdAt: -1 }).exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find reviews by user ID',
        'REVIEW_FIND_BY_USER_ERROR',
        error as Error
      );
    }
  }

  async save(review: Review): Promise<Result<Review>> {
    try {
      const doc = new ReviewModel(this.toPersistence(review));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 11000) {
        return failure(
          new DatabaseError(
            'User has already reviewed this product',
            'REVIEW_DUPLICATE',
            error as Error
          )
        );
      }
      return failure(new DatabaseError('Failed to save review', 'REVIEW_SAVE_ERROR', error as Error));
    }
  }

  async update(review: Review): Promise<Result<Review>> {
    try {
      const doc = await ReviewModel.findByIdAndUpdate(review.id, this.toPersistence(review), {
        new: true,
        runValidators: true,
      }).exec();

      if (doc === null) {
        return failure(new NotFoundError('Review', review.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(
        new DatabaseError('Failed to update review', 'REVIEW_UPDATE_ERROR', error as Error)
      );
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await ReviewModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('Review', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(
        new DatabaseError('Failed to delete review', 'REVIEW_DELETE_ERROR', error as Error)
      );
    }
  }

  async getAverageRating(productId: ID): Promise<number> {
    try {
      const result = await ReviewModel.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId), status: 1 } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]).exec();

      if (result.length === 0) {
        return 0;
      }

      return Math.round((result[0].avgRating as number) * 10) / 10;
    } catch (error) {
      throw new DatabaseError(
        'Failed to calculate average rating',
        'REVIEW_AVG_RATING_ERROR',
        error as Error
      );
    }
  }

  private toDomain(doc: IReviewDocument): Review {
    return Review.create(
      {
        userId: doc.userId.toString(),
        productId: doc.productId.toString(),
        rating: doc.rating,
        reviewText: doc.reviewText,
        status: doc.status,
      },
      doc._id.toString()
    );
  }

  private toPersistence(review: Review): Partial<IReviewDocument> {
    const props = (review as unknown as { props: ReviewProps }).props;
    return {
      _id: review.id as unknown as mongoose.Types.ObjectId,
      userId: props.userId as unknown as mongoose.Types.ObjectId,
      productId: props.productId as unknown as mongoose.Types.ObjectId,
      rating: props.rating,
      reviewText: props.reviewText,
      status: props.status,
    };
  }
}
