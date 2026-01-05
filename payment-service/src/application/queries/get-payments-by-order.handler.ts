import { GetPaymentsByOrderQuery } from './get-payments-by-order.query';
import { IPaymentRepository } from '../../domain/repositories/payment.repository.interface';
import { PaymentDTO } from '../dtos/payment.dto';
import { AsyncResult, success, failure } from '@shared/types/result';

/**
 * Handler for GetPaymentsByOrderQuery
 */
export class GetPaymentsByOrderHandler {
    constructor(private paymentRepository: IPaymentRepository) { }

    async handle(query: GetPaymentsByOrderQuery): AsyncResult<PaymentDTO[]> {
        try {
            const payments = await this.paymentRepository.findByOrderId(query.orderId);
            return success(payments.map((p) => PaymentDTO.fromAggregate(p)));
        } catch (error: any) {
            return failure(error);
        }
    }
}
