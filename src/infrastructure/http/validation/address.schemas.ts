import Joi from 'joi';

export const createAddressSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    mobileNumber: Joi.string().length(10).required(),
    pincode: Joi.string().length(6).required(),
    address: Joi.string().min(10).required(),
    locality: Joi.string().optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    landmark: Joi.string().optional(),
    alternatePhone: Joi.string().optional(),
    addressType: Joi.string().optional(),
  }),
};
