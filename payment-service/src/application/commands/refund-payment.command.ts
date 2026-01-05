import { ID } from '@shared/types/common';

/**
 * Command to refund a captured payment
 */
export class RefundPaymentCommand {
    constructor(
        public readonly paymentId: ID,
        public readonly amount?: number,
        public readonly reason?: string
    ) { }
}
