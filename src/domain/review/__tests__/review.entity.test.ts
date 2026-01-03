import { Review } from '../entities/review.entity';

describe('Review Entity', () => {
  const validProps = {
    userId: 'user123',
    productId: 'prod123',
    rating: 4,
    reviewText: 'Great product, highly recommend!',
    status: 1,
  };

  describe('create', () => {
    it('should create a review with valid props', () => {
      const review = Review.create(validProps, 'review123');

      expect(review.id).toBe('review123');
      expect(review.rating).toBe(4);
      expect(review.reviewText).toBe('Great product, highly recommend!');
    });

    it('should throw error for invalid rating', () => {
      expect(() => Review.create({ ...validProps, rating: 0 }, 'review123')).toThrow(
        'Rating must be between 1 and 5'
      );

      expect(() => Review.create({ ...validProps, rating: 6 }, 'review123')).toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should set default status', () => {
      const props = { ...validProps, status: undefined };
      const review = Review.create(props as unknown as typeof validProps, 'review123');

      expect(review.status).toBe(1);
    });
  });

  describe('computed properties', () => {
    it('should determine isActive correctly', () => {
      const active = Review.create(validProps, 'review123');
      const inactive = Review.create({ ...validProps, status: 0 }, 'review456');

      expect(active.isActive).toBe(true);
      expect(inactive.isActive).toBe(false);
    });
  });

  describe('updateRating', () => {
    it('should update rating', () => {
      const review = Review.create(validProps, 'review123');

      review.updateRating(5);

      expect(review.rating).toBe(5);
    });

    it('should throw error for invalid rating', () => {
      const review = Review.create(validProps, 'review123');

      expect(() => review.updateRating(0)).toThrow('Rating must be between 1 and 5');
      expect(() => review.updateRating(6)).toThrow('Rating must be between 1 and 5');
    });
  });

  describe('updateReviewText', () => {
    it('should update review text', () => {
      const review = Review.create(validProps, 'review123');

      review.updateReviewText('Updated review text');

      expect(review.reviewText).toBe('Updated review text');
    });
  });
});
