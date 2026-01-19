import Joi from 'joi';

/**
 * Create product validation schema
 */
export const createProductSchema = {
  body: Joi.object({
    pid: Joi.string().required(),
    title: Joi.string().min(3).max(200).required(),
    category: Joi.string().required(),
    subCategory: Joi.string().optional(),
    actualPrice: Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(0).required(),
    brand: Joi.string().required(),
    description: Joi.string().min(10).max(5000).required(),
    images: Joi.array().items(Joi.string()).min(1).max(10).required(),
    productDetails: Joi.array()
      .items(
        Joi.object({
          key: Joi.string().required(),
          value: Joi.string().required(),
        })
      )
      .optional(),
    sellerId: Joi.string().required(),
    inventory: Joi.number().min(0).optional().default(0),
  }),
};

/**
 * Update product validation schema
 */
export const updateProductSchema = {
  params: Joi.object({
    productId: Joi.string().required(),
  }),
  body: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(10).max(5000).optional(),
    actualPrice: Joi.number().min(0).optional(),
    sellingPrice: Joi.number().min(0).optional(),
    images: Joi.array().items(Joi.string()).min(1).max(10).optional(),
    outOfStock: Joi.boolean().optional(),
  }).min(1), // At least one field required
};

/**
 * Get product validation schema
 */
export const getProductSchema = {
  params: Joi.object({
    productId: Joi.string().required(),
  }),
};

/**
 * List products validation schema
 */
export const listProductsSchema = {
  query: Joi.object({
    skip: Joi.number().min(0).optional(),
    limit: Joi.number().min(1).max(100).optional(),
  }),
};
