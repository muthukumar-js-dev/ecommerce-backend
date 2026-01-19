import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';
import { CQRSModule } from '../../../src/infrastructure/cqrs/cqrs-module'; // Relative paths safer in tests sometimes
import { RegisterUserCommand } from '../../../src/application/commands/user/register-user.command';
import { GetUserProfileQuery } from '../../../src/application/queries/user/get-user-profile.query';
import { UserRole } from '../../../src/shared/types/common';

describe('CQRS Integration: Register User', () => {
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

    it('should register a user and immediately allow querying profile via Read Model', async () => {
        // 1. Command
        const command = new RegisterUserCommand(
            'CQRS User',
            'cqrs@example.com',
            'Password123!',
            UserRole.USER
        );

        const commandResult = await cqrsModule.commandBus.execute(command);

        if (!commandResult.success) {
            console.error('Register User Failed:', commandResult.error);
        }
        expect(commandResult.success).toBe(true);

        const { userId } = (commandResult as any).data as any;
        expect(userId).toBeDefined();

        // 2. Query (Read Model)
        // The EventBus implementation is synchronous (await Promise.all), so the Read Model 
        // should be updated before this line executes.
        // Wait for eventual consistency
        await new Promise(resolve => setTimeout(resolve, 1000));

        const query = new GetUserProfileQuery(userId);
        const queryResult = await cqrsModule.queryBus.execute(query);

        if (!queryResult.success) {
            console.error('Query Failed:', queryResult.error);
            throw new Error(queryResult.error.message);
        }
        expect(queryResult.success).toBe(true);

        const profile = queryResult.data as any;
        expect(profile).toEqual(expect.objectContaining({
            id: userId,
            name: 'CQRS User',
            email: 'cqrs@example.com',
            role: 'user',
            currentOrderCount: 0
        }));

        // Verify created/updated at are present
        expect(profile.memberSince).toBeDefined();
    });
});
