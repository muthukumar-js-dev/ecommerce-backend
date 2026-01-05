import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { createReviewSchema } from '../validation/review.schemas';

export function createReviewRoutes(controller: ReviewController): Router {
  const router = Router();

  router.use(authMiddleware);

  router.post(
    '/',
    validateRequest(createReviewSchema),
    (req, res, next) => controller.create(req, res, next)
  );

  router.put(
    '/:reviewId',
    (req, res, next) => controller.update(req, res, next)
  );

  router.delete(
    '/:reviewId',
    (req, res, next) => controller.delete(req, res, next)
  );

  return router;
}
