import { CapturePaymentCommand } from './capture-payment.command';
import { IPaymentRepository } from '../../domain/repositories/payment.repository.interface';
import { IPaymentGateway } from '@shared/application/ports/payment-gateway.port';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';


/**
 * Handler for CapturePaymentCommand
 * Captures authorized payment in Stripe and updates payment aggregate
 */
export class CapturePaymentHandler {
    constructor(
        private paymentRepository: IPaymentRepository,
        private paymentGateway: IPaymentGateway
    ) { }

    async handle(command: CapturePaymentCommand): AsyncResult<void> {
        try {
            // Load payment from repository
            const payment = await this.paymentRepository.findById(command.paymentId);
            if (!payment) {
                return failure(new NotFoundError('Payment', command.paymentId));
            }

            // Capture payment in Stripe
            if (!payment.stripePaymentIntentId) {
                return failure(new Error('Payment does not have a Stripe payment intent ID'));
            }

            const captureResult = await this.paymentGateway.capturePayment(
                payment.stripePaymentIntentId
            );

            if (!captureResult.success) {
                // Mark payment as failed
                payment.fail(captureResult.error.message);
                await this.paymentRepository.update(payment);
                return failure(captureResult.error);
            }

            // Update payment aggregate (emits PaymentSucceeded event)
            payment.capture();

            // Save updated payment
            const updateResult = await this.paymentRepository.update(payment);
            if (!updateResult.success) {
                return failure(updateResult.error);
            }

            return success(undefined);
        } catch (error: any) {
            return failure(error);
        }
    }
}
