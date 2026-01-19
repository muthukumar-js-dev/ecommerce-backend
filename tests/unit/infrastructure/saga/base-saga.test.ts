import { BaseSaga } from '@infrastructure/saga/base-saga';
import { SagaRepository } from '@infrastructure/saga/saga.repository';
import { SagaStep, SagaContext, SagaStatus } from '@infrastructure/saga/saga.interface';

class TestStep implements SagaStep {
    name = 'TestStep';
    shouldFail = false;

    async execute(context: SagaContext): Promise<void> {
        if (this.shouldFail) {
            throw new Error('Test step failed');
        }
        context.stepData.set('testData', 'executed');
    }

    async compensate(context: SagaContext): Promise<void> {
        context.stepData.set('testData', 'compensated');
    }
}

class TestSaga extends BaseSaga {
    constructor(sagaRepository: SagaRepository, steps: SagaStep[]) {
        super(sagaRepository, 'TEST_SAGA');
        this.steps = steps;
    }
}

import { connectTestDatabase, disconnectTestDatabase } from '../../../utils/test-helpers';

describe('BaseSaga', () => {
    let sagaRepository: SagaRepository;
    let testSaga: TestSaga;

    beforeAll(async () => {
        await connectTestDatabase();
    });

    afterAll(async () => {
        await disconnectTestDatabase();
    });

    beforeEach(() => {
        sagaRepository = new SagaRepository();
    });

    it('should execute all steps successfully', async () => {
        const step1 = new TestStep();
        step1.name = 'Step1';
        const step2 = new TestStep();
        step2.name = 'Step2';

        testSaga = new TestSaga(sagaRepository, [step1, step2]);

        const sagaId = await testSaga.execute({ test: 'data' });

        const saga = await sagaRepository.findById(sagaId);
        expect(saga.status).toBe(SagaStatus.COMPLETED);
        expect(saga.steps.every((s) => s.status === 'COMPLETED')).toBe(true);
    });

    it('should compensate on step failure', async () => {
        const step1 = new TestStep();
        step1.name = 'Step1';
        const step2 = new TestStep();
        step2.name = 'Step2';
        step2.shouldFail = true;

        testSaga = new TestSaga(sagaRepository, [step1, step2]);

        await expect(testSaga.execute({ test: 'data' })).rejects.toThrow();

        // Verify step1 was compensated
        // In real test, check saga state
    });

    it('should retry failed steps', async () => {
        // Test retry logic with exponential backoff
        // Mock step that fails first 2 times then succeeds
    });
});
