import { SagaStep, SagaContext, SagaStatus } from './saga.interface';
import { SagaRepository } from './saga.repository';
import { ID } from '@shared/types/common';

/**
 * Base Saga Class
 * Abstract base class for all saga implementations
 */
export abstract class BaseSaga {
    protected steps: SagaStep[] = [];
    protected context!: SagaContext;

    constructor(
        protected sagaRepository: SagaRepository,
        protected sagaType: string
    ) { }

    /**
     * Execute saga with all steps
     */
    async execute(data: Record<string, any>): Promise<ID> {
        const sagaId = this.generateId();

        this.context = {
            sagaId,
            data,
            stepData: {},
        };

        // Initialize saga state
        await this.sagaRepository.create({
            sagaId,
            type: this.sagaType,
            status: SagaStatus.STARTED,
            currentStep: 0,
            steps: this.steps.map((step) => ({
                stepName: step.name,
                status: 'PENDING',
                retryCount: 0,
            })),
            context: this.context,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        try {
            await this.sagaRepository.updateStatus(sagaId, SagaStatus.IN_PROGRESS);

            // Execute steps sequentially
            for (let i = 0; i < this.steps.length; i++) {
                await this.executeStep(i);
            }

            // Mark saga as completed
            await this.sagaRepository.complete(sagaId);
            console.log(`✅ Saga ${sagaId} completed successfully`);

            return sagaId;
        } catch (error: any) {
            console.error(`❌ Saga ${sagaId} failed:`, error.message);

            // Compensate in reverse order
            await this.compensate();

            // Mark saga as failed
            await this.sagaRepository.fail(sagaId, error.message);

            throw error;
        }
    }

    /**
     * Execute a single step with retry logic
     */
    private async executeStep(stepIndex: number): Promise<void> {
        const step = this.steps[stepIndex];
        if (!step) {
            throw new Error(`Step at index ${stepIndex} not found`);
        }
        const maxRetries = 3;
        let retryCount = 0;

        await this.sagaRepository.updateStepStatus(
            this.context.sagaId,
            step.name,
            'EXECUTING'
        );

        while (retryCount < maxRetries) {
            try {
                console.log(`🔄 Executing step ${step.name} (attempt ${retryCount + 1}/${maxRetries})`);

                await step.execute(this.context);

                await this.sagaRepository.updateStepStatus(
                    this.context.sagaId,
                    step.name,
                    'COMPLETED',
                    { executedAt: new Date() }
                );

                console.log(`✅ Step ${step.name} completed successfully`);
                return;
            } catch (error: any) {
                retryCount++;

                await this.sagaRepository.incrementStepRetry(
                    this.context.sagaId,
                    step.name
                );

                if (retryCount >= maxRetries) {
                    await this.sagaRepository.updateStepStatus(
                        this.context.sagaId,
                        step.name,
                        'FAILED',
                        { error: error.message }
                    );
                    throw error;
                }

                // Exponential backoff
                const delay = Math.pow(2, retryCount) * 1000;
                console.log(`⚠️ Step ${step.name} failed, retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
    }

    /**
     * Compensate completed steps in reverse order
     */
    private async compensate(): Promise<void> {
        const sagaId = this.context.sagaId;

        await this.sagaRepository.updateStatus(sagaId, SagaStatus.COMPENSATING);

        // Get completed steps in reverse order
        const saga = await this.sagaRepository.findById(sagaId);
        const completedSteps = saga.steps
            .filter((s) => s.status === 'COMPLETED')
            .reverse();

        console.log(`🔙 Compensating ${completedSteps.length} completed steps`);

        for (const stepState of completedSteps) {
            const step = this.steps.find((s) => s.name === stepState.stepName);
            if (!step) { continue; }

            try {
                console.log(`🔙 Compensating step ${step.name}`);

                await this.sagaRepository.updateStepStatus(
                    sagaId,
                    step.name,
                    'COMPENSATING'
                );

                await step.compensate(this.context);

                await this.sagaRepository.updateStepStatus(
                    sagaId,
                    step.name,
                    'COMPENSATED',
                    { compensatedAt: new Date() }
                );

                console.log(`✅ Step ${step.name} compensated successfully`);
            } catch (error: any) {
                console.error(`❌ Compensation failed for step ${step.name}:`, error.message);
                // Continue with other compensations even if one fails
            }
        }

        await this.sagaRepository.updateStatus(sagaId, SagaStatus.COMPENSATED);
    }

    protected generateId(): ID {
        return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    protected sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
