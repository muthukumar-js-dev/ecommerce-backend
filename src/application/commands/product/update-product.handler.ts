import { CommandHandler } from '@application/commands/command-handler.interface';
import { UpdateProductCommand } from './update-product.command';
import { AsyncResult } from '@shared/types/result';
import { UpdateProductUseCase } from '@application/use-cases/product/update-product.use-case';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';

export class UpdateProductHandler implements CommandHandler<UpdateProductCommand, void> {
    private useCase: UpdateProductUseCase;

    constructor(
        productRepository: IProductRepository
    ) {
        this.useCase = new UpdateProductUseCase(productRepository);
    }

    async handle(command: UpdateProductCommand): AsyncResult<void> {
        return this.useCase.execute(command.productId, command.dto);
    }
}
