import { ID } from '@shared/types/common';

/**
 * Query to get payment by ID
 */
export class GetPaymentQuery {
    constructor(public readonly paymentId: ID) { }
}
