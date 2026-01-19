import { performance } from 'perf_hooks';
import { CQRSModule } from '@infrastructure/cqrs/cqrs-module';
import { GetUserProfileQuery } from '@application/queries/user/get-user-profile.query';
import { ListProductsQuery } from '@application/queries/product/list-products.query';
import { setupIntegrationTests, teardownIntegrationTests } from '../integration/setup';

describe('Query Performance Tests', () => {
    let cqrsModule: CQRSModule;

    beforeAll(async () => {
        await setupIntegrationTests();
        cqrsModule = new CQRSModule();
    });

    afterAll(async () => {
        await teardownIntegrationTests();
    });

    it('should execute user profile query in < 100ms (P95)', async () => {
        const durations: number[] = [];

        // Run 20 queries to get P95
        for (let i = 0; i < 20; i++) {
            const start = performance.now();

            const query = new GetUserProfileQuery('user-123');
            await cqrsModule.queryBus.execute(query);

            const duration = performance.now() - start;
            durations.push(duration);
        }

        // Calculate P95 (95th percentile)
        durations.sort((a, b) => a - b);
        const p95Index = Math.floor(durations.length * 0.95);
        const p95Duration = durations[p95Index];

        if (p95Duration === undefined) {
            throw new Error('Could not calculate P95 duration');
        }

        console.log(`User Profile Query P95: ${p95Duration.toFixed(2)}ms`);
        expect(p95Duration).toBeLessThan(100);
    });

    it('should handle 100 concurrent queries efficiently', async () => {
        const queries = Array.from({ length: 100 }, (_, i) =>
            cqrsModule.queryBus.execute(new GetUserProfileQuery(`user-${i % 10}`))
        );

        const start = performance.now();
        await Promise.all(queries);
        const duration = performance.now() - start;

        console.log(`100 concurrent queries completed in: ${duration.toFixed(2)}ms`);
        expect(duration).toBeLessThan(5000); // 5 seconds for 100 queries
    });

    it('should execute product list query in < 150ms (P95)', async () => {
        const durations: number[] = [];

        for (let i = 0; i < 20; i++) {
            const start = performance.now();

            const query = new ListProductsQuery(0, 20);
            await cqrsModule.queryBus.execute(query);

            const duration = performance.now() - start;
            durations.push(duration);
        }

        durations.sort((a, b) => a - b);
        const p95Index = Math.floor(durations.length * 0.95);
        const p95Duration = durations[p95Index];

        if (p95Duration === undefined) {
            throw new Error('Could not calculate P95 duration');
        }

        console.log(`Product List Query P95: ${p95Duration.toFixed(2)}ms`);
        expect(p95Duration).toBeLessThan(150);
    });
});
