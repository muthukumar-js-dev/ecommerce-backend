import Joi from 'joi';

export const createReviewSchema = {
  body: Joi.object({
    productId: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required(),
    reviewText: Joi.string().optional(),
  }),
};
