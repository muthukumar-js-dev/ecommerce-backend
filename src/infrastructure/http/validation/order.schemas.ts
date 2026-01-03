import Joi from 'joi';

/**
 * Place order validation schema
 */
export const placeOrderSchema = {
  body: Joi.object({
    paymentMethod: Joi.string()
      .valid('card', 'cashondelivery', 'upi', 'netbanking')
      .required(),
    shippingAddressId: Joi.string().optional(),
  }),
};

/**
 * Get order validation schema
 */
export const getOrderSchema = {
  params: Joi.object({
    orderId: Joi.string().required(),
  }),
};

/**
 * List orders validation schema
 */
export const listOrdersSchema = {
  query: Joi.object({
    skip: Joi.number().min(0).optional(),
    limit: Joi.number().min(1).max(100).optional(),
  }),
};

/**
 * Cancel order item validation schema
 */
export const cancelOrderItemSchema = {
  params: Joi.object({
    orderId: Joi.string().required(),
  }),
  body: Joi.object({
    productId: Joi.string().required(),
    reason: Joi.string().max(500).optional(),
  }),
};

/**
 * Update order status validation schema
 */
export const updateOrderStatusSchema = {
  params: Joi.object({
    orderId: Joi.string().required(),
  }),
  body: Joi.object({
    productId: Joi.string().required(),
    status: Joi.string()
      .valid('ordered', 'shipped', 'delivered', 'cancelled', 'returned')
      .required(),
  }),
};
