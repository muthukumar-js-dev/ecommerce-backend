import { CommandBus } from '@application/commands/command-bus';
import { QueryBus } from '@application/queries/query-bus';
import { EventBus } from '@infrastructure/events/event-bus';
import { MongoDBEventStore } from '@infrastructure/events/mongodb-event-store';

// Command Handlers
import { RegisterUserHandler } from '@application/commands/user/register-user.handler';
import { PlaceOrderHandler } from '@application/commands/order/place-order.handler';
import { CreateProductHandler } from '@application/commands/product/create-product.handler';
import { LoginUserHandler } from '@application/commands/user/login-user.handler';
import { UpdateUserRoleHandler } from '@application/commands/user/update-user-role.handler';
import { UpdateProductHandler } from '@application/commands/product/update-product.handler';
import { DeleteProductHandler } from '@application/commands/product/delete-product.handler';

// Query Handlers
import { GetUserProfileHandler } from '@application/queries/user/get-user-profile.handler';
import { ListProductsHandler } from '@application/queries/product/list-products.handler';
import { GetProductHandler } from '@application/queries/product/get-product.handler';
import { GetOrderHistoryHandler } from '@application/queries/order/get-order-history.handler';

// Event Handlers
import { UserRegisteredHandler } from '@infrastructure/events/handlers/user-registered.handler';
import { ProductCreatedHandler } from '@infrastructure/events/handlers/product-created.handler';
import { OrderPlacedHandler } from '@infrastructure/events/handlers/order-placed.handler';
import { SendOrderConfirmationEmailHandler } from '@infrastructure/events/handlers/send-order-confirmation-email.handler';
import { UpdateUserOrderCountHandler } from '@infrastructure/events/handlers/update-user-order-count.handler';
import { ReserveInventoryHandler } from '@infrastructure/events/handlers/reserve-inventory.handler';

// Repositories
import { UserRepository } from '@infrastructure/database/mongodb/repositories/user.repository';
import { UserReadRepository } from '@infrastructure/database/mongodb/read-models/user-read.repository';
import { OrderRepository } from '@infrastructure/database/mongodb/repositories/order.repository';
import { OutboxRepository } from '@infrastructure/database/mongodb/repositories/outbox.repository';
import { OrderReadRepository } from '@infrastructure/database/mongodb/read-models/order-read.repository';
import { ProductRepository } from '@infrastructure/database/mongodb/repositories/product.repository';
import { ProductReadRepository } from '@infrastructure/database/mongodb/read-models/product-read.repository';
import { UserDomainService } from '@domain/user/services/user-domain.service';

export class CQRSModule {
    public readonly commandBus: CommandBus;
    public readonly queryBus: QueryBus;
    public readonly eventBus: EventBus;
    public readonly eventStore: MongoDBEventStore;

    constructor() {
        this.eventStore = new MongoDBEventStore();
        this.commandBus = new CommandBus();
        this.queryBus = new QueryBus();
        this.eventBus = new EventBus(this.eventStore);

        this.registerCommandHandlers();
        this.registerQueryHandlers();
        this.registerEventHandlers();
    }

    private registerCommandHandlers(): void {
        const outboxRepository = new OutboxRepository();
        const userRepository = new UserRepository(outboxRepository);
        const userDomainService = new UserDomainService(userRepository);

        this.commandBus.register(
            'RegisterUserCommand',
            new RegisterUserHandler(userRepository, userDomainService, this.eventBus)
        );

        // Order and Product Commands
        const orderRepository = new OrderRepository(outboxRepository);
        const productRepository = new ProductRepository(outboxRepository);

        this.commandBus.register(
            'PlaceOrderCommand',
            new PlaceOrderHandler(orderRepository, productRepository, this.eventBus, userRepository)
        );

        this.commandBus.register(
            'CreateProductCommand',
            new CreateProductHandler(productRepository, this.eventBus)
        );

        // TODO: Inject JWT Secret from config
        const jwtSecret = process.env.JWT_SECRET || 'secret';

        this.commandBus.register(
            'LoginUserCommand',
            new LoginUserHandler(userRepository, jwtSecret)
        );

        this.commandBus.register(
            'UpdateUserRoleCommand',
            new UpdateUserRoleHandler(userRepository)
        );

        this.commandBus.register(
            'UpdateProductCommand',
            new UpdateProductHandler(productRepository)
        );

        this.commandBus.register(
            'DeleteProductCommand',
            new DeleteProductHandler(productRepository)
        );
    }

    private registerQueryHandlers(): void {
        const userReadRepository = new UserReadRepository();
        const productReadRepository = new ProductReadRepository();
        const orderReadRepository = new OrderReadRepository();
        const productRepository = new ProductRepository(); // Needed for UseCase based queries if not ReadModel

        this.queryBus.register(
            'GetUserProfileQuery',
            new GetUserProfileHandler(userReadRepository)
        );

        this.queryBus.register(
            'ListProductsQuery',
            new ListProductsHandler(productReadRepository)
        );

        this.queryBus.register(
            'GetProductQuery',
            new GetProductHandler(productRepository)
        );

        this.queryBus.register(
            'GetOrderHistoryQuery',
            new GetOrderHistoryHandler(orderReadRepository)
        );
    }

    private registerEventHandlers(): void {
        // User Events
        this.eventBus.subscribe('UserRegistered', new UserRegisteredHandler());

        // Product Events
        this.eventBus.subscribe('ProductCreated', new ProductCreatedHandler());

        // Order Events
        const outboxRepository = new OutboxRepository();
        const userRepository = new UserRepository(outboxRepository);
        const productRepository = new ProductRepository();

        this.eventBus.subscribe('OrderPlaced', new OrderPlacedHandler());
        this.eventBus.subscribe('OrderPlaced', new SendOrderConfirmationEmailHandler());
        this.eventBus.subscribe('OrderPlaced', new UpdateUserOrderCountHandler(userRepository));
        this.eventBus.subscribe('OrderPlaced', new ReserveInventoryHandler(productRepository));
    }
}
