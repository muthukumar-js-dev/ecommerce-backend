import { InitiatePaymentCommand } from './initiate-payment.command';
import { IPaymentRepository } from '../../domain/repositories/payment.repository.interface';
import { Payment } from '../../domain/payment.aggregate';
import { Money } from '@shared/domain/product/value-objects/money.vo';
import { IPaymentGateway } from '@shared/application/ports/payment-gateway.port';
import { AsyncResult, success, failure } from '@shared/types/result';
import { PaymentDTO } from '../dtos/payment.dto';
import { randomUUID } from 'crypto';

export interface InitiatePaymentResult {
    paymentId: string;
    clientSecret?: string;
}

/**
 * Handler for InitiatePaymentCommand
 * Creates payment aggregate and initiates Stripe payment intent
 */
export class InitiatePaymentHandler {
    constructor(
        private paymentRepository: IPaymentRepository,
        private paymentGateway: IPaymentGateway
    ) { }

    async handle(command: InitiatePaymentCommand): AsyncResult<InitiatePaymentResult> {
        try {
            // Generate payment ID
            const paymentId = this.generatePaymentId();

            // Create money value object
            const amount = Money.create(command.amount, command.currency as any);

            // Create payment aggregate
            const payment = Payment.initiate(
                command.orderId,
                command.userId,
                amount,
                command.stripeCustomerId,
                paymentId
            );

            // Create Stripe payment intent
            const intentResult = await this.paymentGateway.createPaymentIntent(
                amount,
                command.stripeCustomerId,
                {
                    orderId: command.orderId,
                    paymentId,
                }
            );

            if (!intentResult.success) {
                // Mark payment as failed
                payment.fail(intentResult.error.message);
                await this.paymentRepository.save(payment);
                return failure(intentResult.error);
            }

            // Authorize payment with Stripe payment intent ID
            payment.authorize(intentResult.data.id);

            // Save payment (domain events will be published via outbox)
            const saveResult = await this.paymentRepository.save(payment);
            if (!saveResult.success) {
                return failure(saveResult.error);
            }

            return success({
                paymentId,
                clientSecret: intentResult.data.clientSecret,
            });
        } catch (error: any) {
            return failure(error);
        }
    }

    private generatePaymentId(): string {
        return `pay_${randomUUID().replace(/-/g, '')}`;
    }
}
