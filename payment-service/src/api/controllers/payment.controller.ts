import { Request, Response } from 'express';
import { InitiatePaymentHandler } from '../../application/commands/initiate-payment.handler';
import { CapturePaymentHandler } from '../../application/commands/capture-payment.handler';
import { RefundPaymentHandler } from '../../application/commands/refund-payment.handler';
import { GetPaymentHandler } from '../../application/queries/get-payment.handler';
import { InitiatePaymentCommand } from '../../application/commands/initiate-payment.command';
import { CapturePaymentCommand } from '../../application/commands/capture-payment.command';
import { RefundPaymentCommand } from '../../application/commands/refund-payment.command';
import { GetPaymentQuery } from '../../application/queries/get-payment.query';
import { StripeAdapter } from '../../infrastructure/stripe/stripe.adapter';

/**
 * Payment Controller
 * Handles HTTP requests for payment operations
 */
export class PaymentController {
    constructor(
        private initiatePaymentHandler: InitiatePaymentHandler,
        private capturePaymentHandler: CapturePaymentHandler,
        private refundPaymentHandler: RefundPaymentHandler,
        private getPaymentHandler: GetPaymentHandler,
        private stripeAdapter: StripeAdapter
    ) { }

    /**
     * POST /api/payments/initiate
     * Initiate a new payment
     */
    async initiatePayment(req: Request, res: Response): Promise<void> {
        try {
            const { orderId, userId, amount, currency, stripeCustomerId } = req.body;

            const command = new InitiatePaymentCommand(
                orderId,
                userId,
                amount,
                currency,
                stripeCustomerId
            );

            const result = await this.initiatePaymentHandler.handle(command);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error.message,
                });
                return;
            }

            res.status(201).json({
                success: true,
                data: result.data,
            });
        } catch (error: any) {
            console.error('Error initiating payment:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    /**
     * POST /api/payments/:paymentId/capture
     * Capture an authorized payment
     */
    async capturePayment(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.params;

            const command = new CapturePaymentCommand(paymentId);
            const result = await this.capturePaymentHandler.handle(command);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error.message,
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Payment captured successfully',
            });
        } catch (error: any) {
            console.error('Error capturing payment:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    /**
     * POST /api/payments/:paymentId/refund
     * Refund a captured payment
     */
    async refundPayment(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.params;
            const { amount, reason } = req.body;

            const command = new RefundPaymentCommand(paymentId, amount, reason);
            const result = await this.refundPaymentHandler.handle(command);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error.message,
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: result.data,
            });
        } catch (error: any) {
            console.error('Error refunding payment:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    /**
     * GET /api/payments/:paymentId
     * Get payment details
     */
    async getPayment(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.params;

            const query = new GetPaymentQuery(paymentId);
            const result = await this.getPaymentHandler.handle(query);

            if (!result.success) {
                res.status(404).json({
                    success: false,
                    error: result.error.message,
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: result.data,
            });
        } catch (error: any) {
            console.error('Error getting payment:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    /**
     * POST /api/payments/webhook/stripe
     * Handle Stripe webhook events
     */
    async handleStripeWebhook(req: Request, res: Response): Promise<void> {
        try {
            const signature = req.headers['stripe-signature'] as string;
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

            // Verify webhook signature
            const event = this.stripeAdapter.verifyWebhookSignature(
                req.body,
                signature,
                webhookSecret
            );

            console.log(`Received Stripe webhook: ${event.type}`);

            // Handle different event types
            switch (event.type) {
                case 'payment_intent.succeeded':
                    // Payment succeeded - could auto-capture or just log
                    console.log('Payment intent succeeded:', event.data.object.id);
                    break;
                case 'payment_intent.payment_failed':
                    // Payment failed - update payment status
                    console.log('Payment intent failed:', event.data.object.id);
                    break;
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            res.status(200).json({ received: true });
        } catch (error: any) {
            console.error('Webhook error:', error.message);
            res.status(400).json({
                success: false,
                error: 'Webhook signature verification failed',
            });
        }
    }
}
