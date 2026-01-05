import { GetPaymentQuery } from './get-payment.query';
import { IPaymentRepository } from '../../domain/repositories/payment.repository.interface';
import { PaymentDTO } from '../dtos/payment.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';

/**
 * Handler for GetPaymentQuery
 */
export class GetPaymentHandler {
    constructor(private paymentRepository: IPaymentRepository) { }

    async handle(query: GetPaymentQuery): AsyncResult<PaymentDTO> {
        try {
            const payment = await this.paymentRepository.findById(query.paymentId);
            if (!payment) {
                return failure(new NotFoundError('Payment', query.paymentId));
            }

            return success(PaymentDTO.fromAggregate(payment));
        } catch (error: any) {
            return failure(error);
        }
    }
}
