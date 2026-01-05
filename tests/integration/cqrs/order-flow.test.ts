import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';
import { CQRSModule } from '@infrastructure/cqrs/cqrs-module';
import { PlaceOrderCommand } from '@application/commands/order/place-order.command';
import { GetOrderHistoryQuery } from '@application/queries/order/get-order-history.query';
import { isSuccess } from '@shared/types/result';

describe('CQRS Order Flow Integration', () => {
    let cqrsModule: CQRSModule;

    beforeAll(async () => {
        await setupIntegrationTests();
        cqrsModule = new CQRSModule();
    });

    afterAll(async () => {
        await teardownIntegrationTests();
    });

    afterEach(async () => {
        await clearDatabase();
    });

    it('should handle complete order placement flow', async () => {
        // 1. Place order (Command)
        const command = new PlaceOrderCommand(
            'user-123',
            [{ productId: 'prod-123', quantity: 2, price: 100 }],
            'address-123',
            'payment-123'
        );

        const commandResult = await cqrsModule.commandBus.execute(command);
        expect(commandResult.success).toBe(true);

        if (!commandResult.success) return;
        const orderId = commandResult.value.orderId;

        // 2. Wait for event processing (eventual consistency)
        await new Promise(resolve => setTimeout(resolve, 200));

        // 3. Query order history (Query - Read Model)
        const query = new GetOrderHistoryQuery('user-123');
        const queryResult = await cqrsModule.queryBus.execute(query);

        expect(queryResult.success).toBe(true);
        if (queryResult.success) {
            expect(queryResult.value.orders.length).toBeGreaterThan(0);
            const order = queryResult.value.orders.find((o: any) => o.orderId === orderId);
            expect(order).toBeDefined();
        }
    });

    it('should demonstrate read/write separation', async () => {
        // Write side: Place order
        const command = new PlaceOrderCommand(
            'user-456',
            [{ productId: 'prod-456', quantity: 1, price: 50 }],
            'address-456',
            'payment-456'
        );

        await cqrsModule.commandBus.execute(command);

        // Read side: Query from read model (different database/collection)
        const query = new GetOrderHistoryQuery('user-456');
        const result = await cqrsModule.queryBus.execute(query);

        expect(result.success).toBe(true);
        // Read model should be updated via event handlers
    });

    it('should handle command validation failures', async () => {
        const invalidCommand = new PlaceOrderCommand(
            '', // Invalid user ID
            [],
            'address-123',
            'payment-123'
        );

        const result = await cqrsModule.commandBus.execute(invalidCommand);

        expect(result.success).toBe(false);
    });
});
