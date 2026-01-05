import { ID } from '@shared/types/common';

/**
 * Query to get all payments for an order
 */
export class GetPaymentsByOrderQuery {
    constructor(public readonly orderId: ID) { }
}
