import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation schemas for payment requests
 */
const initiatePaymentSchema = Joi.object({
    orderId: Joi.string().required(),
    userId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid('INR', 'USD', 'EUR').required(),
    stripeCustomerId: Joi.string().required(),
});

const capturePaymentSchema = Joi.object({
    paymentId: Joi.string().required(),
});

const refundPaymentSchema = Joi.object({
    paymentId: Joi.string().required(),
    amount: Joi.number().positive().optional(),
    reason: Joi.string().optional(),
});

/**
 * Validate request body against schema
 */
export function validateRequest(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors,
            });
            return;
        }

        next();
    };
}

/**
 * Validate initiate payment request
 */
export const validateInitiatePayment = validateRequest(initiatePaymentSchema);

/**
 * Validate capture payment request
 */
export const validateCapturePayment = (req: Request, res: Response, next: NextFunction) => {
    const { error } = capturePaymentSchema.validate({ paymentId: req.params.paymentId });

    if (error) {
        res.status(400).json({
            success: false,
            error: 'Invalid payment ID',
        });
        return;
    }

    next();
};

/**
 * Validate refund payment request
 */
export const validateRefundPayment = (req: Request, res: Response, next: NextFunction) => {
    const combined = {
        paymentId: req.params.paymentId,
        ...req.body,
    };

    const { error } = refundPaymentSchema.validate(combined);

    if (error) {
        const errors = error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
        }));

        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
        });
        return;
    }

    next();
};
