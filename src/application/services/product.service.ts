import { BaseApplicationService } from './base-application.service';
import { CommandBus } from '../commands/command-bus';
import { QueryBus } from '../queries/query-bus';
import { EventBus } from '@infrastructure/events/event-bus';
import { CreateProductCommand } from '../commands/product/create-product.command';
import { UpdateProductCommand } from '../commands/product/update-product.command';
import { DeleteProductCommand } from '../commands/product/delete-product.command';
import { GetProductQuery } from '../queries/product/get-product.query';
import { ListProductsQuery } from '../queries/product/list-products.query';
import {
  CreateProductRequestDTO,
  UpdateProductRequestDTO,
  ProductResponseDTO,
  ListProductsResponseDTO,
} from '../dtos/product/product.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';
import { LogExecution } from '../decorators/logging.decorator';

export class ProductService extends BaseApplicationService {
  constructor(
    commandBus: CommandBus,
    queryBus: QueryBus,
    eventBus: EventBus
  ) {
    super(commandBus, queryBus, eventBus);
  }

  @LogExecution()
  async createProduct(dto: CreateProductRequestDTO): AsyncResult<ProductResponseDTO> {
    const command = new CreateProductCommand(
      dto.pid, // Mapping pid to SKU
      dto.title,
      dto.description,
      dto.category,
      dto.brand,
      dto.sellingPrice,
      dto.actualPrice,
      0, // Default inventory to 0 as DTO doesn't provide it
      dto.images,
      dto.productDetails,
      dto.sellerId
    );
    return this.executeCommand<AsyncResult<ProductResponseDTO>>(command);
  }

  @LogExecution()
  async updateProduct(productId: ID, dto: UpdateProductRequestDTO): AsyncResult<void> {
    const command = new UpdateProductCommand(productId, dto);
    return this.executeCommand<AsyncResult<void>>(command);
  }

  @LogExecution()
  async deleteProduct(productId: ID, sellerId: ID): AsyncResult<void> {
    const command = new DeleteProductCommand(productId, sellerId);
    return this.executeCommand<AsyncResult<void>>(command);
  }

  @LogExecution()
  async getProduct(productId: ID): AsyncResult<ProductResponseDTO> {
    const query = new GetProductQuery(productId);
    return this.executeQuery<AsyncResult<ProductResponseDTO>>(query);
  }

  @LogExecution()
  async listProducts(page: number = 1, limit: number = 10, category?: string): AsyncResult<ListProductsResponseDTO> {
    const query = new ListProductsQuery(page, limit, category);
    return this.executeQuery<AsyncResult<ListProductsResponseDTO>>(query);
  }
}
