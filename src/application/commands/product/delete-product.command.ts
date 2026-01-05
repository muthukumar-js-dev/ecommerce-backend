import { BaseCommand } from '@application/commands/command.interface';
import { ID } from '@shared/types/common';

export class DeleteProductCommand extends BaseCommand {
    constructor(
        public readonly productId: ID,
        public readonly sellerId: ID // Actor
    ) {
        super('DeleteProductCommand', sellerId);
    }
}
