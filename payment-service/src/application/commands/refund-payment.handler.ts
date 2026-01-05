import { RefundPaymentCommand } from './refund-payment.command';
import { IPaymentRepository } from '../../domain/repositories/payment.repository.interface';
import { IPaymentGateway } from '@shared/application/ports/payment-gateway.port';
import { Money } from '@shared/domain/product/value-objects/money.vo';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';

/**
 * Handler for RefundPaymentCommand
 * Processes refund in Stripe and updates payment aggregate
 */
export class RefundPaymentHandler {
    constructor(
        private paymentRepository: IPaymentRepository,
        private paymentGateway: IPaymentGateway
    ) { }

    async handle(command: RefundPaymentCommand): AsyncResult<{ refundId: string }> {
        try {
            // Load payment from repository
            const payment = await this.paymentRepository.findById(command.paymentId);
            if (!payment) {
                return failure(new NotFoundError('Payment', command.paymentId));
            }

            // Validate payment has Stripe payment intent ID
            if (!payment.stripePaymentIntentId) {
                return failure(new Error('Payment does not have a Stripe payment intent ID'));
            }

            // Prepare refund amount (partial or full)
            let refundAmount: Money | undefined;
            if (command.amount) {
                refundAmount = Money.create(command.amount, payment.amount.currency);
            }

            // Process refund in Stripe
            const refundResult = await this.paymentGateway.refundPayment(
                payment.stripePaymentIntentId,
                refundAmount
            );

            if (!refundResult.success) {
                return failure(refundResult.error);
            }

            // Update payment aggregate
            payment.refund(refundResult.data.refundId);

            // Save updated payment
            const updateResult = await this.paymentRepository.update(payment);
            if (!updateResult.success) {
                return failure(updateResult.error);
            }

            return success({ refundId: refundResult.data.refundId });
        } catch (error: any) {
            return failure(error);
        }
    }
}
