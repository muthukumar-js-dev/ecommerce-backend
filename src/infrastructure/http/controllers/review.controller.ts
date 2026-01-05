import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '@application/services/review.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Review Controller
 * Handles review-related HTTP requests
 */
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * Create a product review
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.reviewService.createReview(userId, req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a review
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { reviewId } = req.params;

      if (!reviewId) {
        return next(new Error('Review ID is required'));
      }

      const result = await this.reviewService.updateReview(userId, reviewId, req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Review updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a review
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { reviewId } = req.params;

      if (!reviewId) {
        return next(new Error('Review ID is required'));
      }

      const result = await this.reviewService.deleteReview(userId, reviewId);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
