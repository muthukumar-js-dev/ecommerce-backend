import Joi from 'joi';

export const addToWishlistSchema = {
  body: Joi.object({
    productId: Joi.string().required(),
  }),
};
