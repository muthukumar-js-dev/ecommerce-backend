import { CommandHandler } from '@application/commands/command-handler.interface';
import { DeleteProductCommand } from './delete-product.command';
import { AsyncResult } from '@shared/types/result';
import { DeleteProductUseCase } from '@application/use-cases/product/delete-product.use-case';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';

export class DeleteProductHandler implements CommandHandler<DeleteProductCommand, void> {
    private useCase: DeleteProductUseCase;

    constructor(
        productRepository: IProductRepository
    ) {
        this.useCase = new DeleteProductUseCase(productRepository);
    }

    async handle(command: DeleteProductCommand): AsyncResult<void> {
        return this.useCase.execute(command.productId, command.sellerId);
    }
}
