import { ID } from '../../../../src/shared/types/common';

/**
 * Command to initiate a payment for an order
 */
export class InitiatePaymentCommand {
    constructor(
        public readonly orderId: ID,
        public readonly userId: ID,
        public readonly amount: number,
        public readonly currency: string,
        public readonly stripeCustomerId: string
    ) { }
}
