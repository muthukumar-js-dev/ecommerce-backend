import { BaseCommand } from '../command.interface';

export class CreateProductCommand extends BaseCommand {
    constructor(
        public readonly sku: string,
        public readonly title: string,
        public readonly description: string,
        public readonly category: string,
        public readonly brand: string,
        public readonly sellingPrice: number,
        public readonly actualPrice: number,
        public readonly inventory: number,
        public readonly images: string[],
        public readonly productDetails: Array<{ key: string; value: string }>,
        public readonly sellerId: string,
        correlationId?: string
    ) {
        super('CreateProductCommand', correlationId);
    }
}
