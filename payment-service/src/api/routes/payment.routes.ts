import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import {
    validateInitiatePayment,
    validateCapturePayment,
    validateRefundPayment,
} from '../middleware/validation.middleware';

/**
 * Create payment routes
 */
export function createPaymentRoutes(controller: PaymentController): Router {
    const router = Router();

    // Initiate payment
    router.post('/initiate', validateInitiatePayment, (req, res) =>
        controller.initiatePayment(req, res)
    );

    // Capture payment
    router.post('/:paymentId/capture', validateCapturePayment, (req, res) =>
        controller.capturePayment(req, res)
    );

    // Refund payment
    router.post('/:paymentId/refund', validateRefundPayment, (req, res) =>
        controller.refundPayment(req, res)
    );

    // Get payment details
    router.get('/:paymentId', (req, res) => controller.getPayment(req, res));

    // Stripe webhook (no auth required, signature verification in controller)
    router.post('/webhook/stripe', (req, res) => controller.handleStripeWebhook(req, res));

    return router;
}
