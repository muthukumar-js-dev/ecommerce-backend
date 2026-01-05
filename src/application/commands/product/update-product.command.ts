import { BaseCommand } from '@application/commands/command.interface';
import { ID } from '@shared/types/common';
import { UpdateProductRequestDTO } from '@application/dtos/product/product.dto';

export class UpdateProductCommand extends BaseCommand {
    constructor(
        public readonly productId: ID,
        public readonly dto: UpdateProductRequestDTO
    ) {
        super('UpdateProductCommand');
    }
}
