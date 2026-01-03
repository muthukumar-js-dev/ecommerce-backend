import Joi from 'joi';
import { APP_CONSTANTS } from '@shared/constants';

/**
 * Add to cart validation schema
 */
export const addToCartSchema = {
  body: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number()
      .min(APP_CONSTANTS.MIN_CART_ITEM_QUANTITY)
      .max(APP_CONSTANTS.MAX_CART_ITEM_QUANTITY)
      .required()
      .messages({
        'number.min': `Quantity must be at least ${APP_CONSTANTS.MIN_CART_ITEM_QUANTITY}`,
        'number.max': `Quantity cannot exceed ${APP_CONSTANTS.MAX_CART_ITEM_QUANTITY}`,
      }),
  }),
};

/**
 * Update cart item quantity validation schema
 */
export const updateCartItemSchema = {
  body: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number()
      .min(APP_CONSTANTS.MIN_CART_ITEM_QUANTITY)
      .max(APP_CONSTANTS.MAX_CART_ITEM_QUANTITY)
      .required(),
  }),
};

/**
 * Remove from cart validation schema
 */
export const removeFromCartSchema = {
  params: Joi.object({
    productId: Joi.string().required(),
  }),
};
