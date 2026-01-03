import Joi from 'joi';
import { APP_CONSTANTS } from '@shared/constants';

/**
 * User registration validation schema
 */
export const registerUserSchema = {
  body: Joi.object({
    name: Joi.string()
      .min(APP_CONSTANTS.MIN_NAME_LENGTH)
      .max(APP_CONSTANTS.MAX_NAME_LENGTH)
      .required()
      .messages({
        'string.min': `Name must be at least ${APP_CONSTANTS.MIN_NAME_LENGTH} characters`,
        'string.max': `Name cannot exceed ${APP_CONSTANTS.MAX_NAME_LENGTH} characters`,
      }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
    }),
    password: Joi.string()
      .min(APP_CONSTANTS.MIN_PASSWORD_LENGTH)
      .max(APP_CONSTANTS.MAX_PASSWORD_LENGTH)
      .required()
      .messages({
        'string.min': `Password must be at least ${APP_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
        'string.max': `Password cannot exceed ${APP_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
      }),
    userRole: Joi.string().valid('user', 'seller', 'admin').optional(),
  }),
};

/**
 * User login validation schema
 */
export const loginUserSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

/**
 * Get user profile validation schema
 */
export const getUserProfileSchema = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
};

/**
 * Update user role validation schema
 */
export const updateUserRoleSchema = {
  params: Joi.object({
    userId: Joi.string().required(),
  }),
  body: Joi.object({
    role: Joi.string().valid('user', 'seller', 'admin').required(),
  }),
};
