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
}
