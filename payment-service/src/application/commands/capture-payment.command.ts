import { ID } from '../../../../src/shared/types/common';

/**
 * Command to capture an authorized payment
 */
export class CapturePaymentCommand {
    constructor(public readonly paymentId: ID) { }
}
