import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';

export interface ReviewProps {
  userId: ID;
  productId: ID;
  rating: number;
  reviewText: string;
  status: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Review extends Entity<ReviewProps> {
  private constructor(props: ReviewProps, id: ID) {
    super(props, id);
  }

  static create(props: Omit<ReviewProps, 'createdAt' | 'updatedAt'>, id: ID): Review {
    const now = new Date();
    if (props.rating < 1 || props.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    return new Review(
      {
        ...props,
        status: props.status ?? 1,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  get userId(): ID {
    return this.props.userId;
  }

  get productId(): ID {
    return this.props.productId;
  }

  get rating(): number {
    return this.props.rating;
  }

  get reviewText(): string {
    return this.props.reviewText;
  }

  get status(): number {
    return this.props.status;
  }

  get isActive(): boolean {
    return this.props.status === 1;
  }

  updateRating(rating: number): void {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    (this.props as { rating: number }).rating = rating;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  updateReviewText(text: string): void {
    (this.props as { reviewText: string }).reviewText = text;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }
}
