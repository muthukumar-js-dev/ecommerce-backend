import Joi from 'joi';

export const createNotificationSchema = {
  body: Joi.object({
    userId: Joi.string().required(),
    message: Joi.string().required(),
    type: Joi.string().valid('INFO', 'WARNING', 'ERROR').default('INFO'),
  }),
};
