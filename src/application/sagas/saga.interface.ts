export interface Saga {
    execute(): Promise<void>;
    compensate(): Promise<void>;
}

export interface SagaStep {
    name: string;
    execute(): Promise<void>;
    compensate(): Promise<void>;
}

export abstract class BaseSaga implements Saga {
    protected steps: SagaStep[] = [];
    protected executedSteps: SagaStep[] = [];

    abstract execute(): Promise<void>;

    async compensate(): Promise<void> {
        console.log('[Saga] Starting compensation...');
        // Execute compensation in reverse order
        // leveraging strict array copy to avoid mutation issues during iteration if any
        const stepsToCompensate = [...this.executedSteps].reverse();

        for (const step of stepsToCompensate) {
            try {
                console.log(`[Saga] Compensating step: ${step.name}`);
                await step.compensate();
            } catch (error) {
                console.error(`[Saga] Compensation failed for step ${step.name}:`, error);
                // Continue with other compensations - "Best effort"
            }
        }
    }

    protected async executeStep(step: SagaStep): Promise<void> {
        try {
            console.log(`[Saga] Executing step: ${step.name}`);
            await step.execute();
            this.executedSteps.push(step);
        } catch (error) {
            console.error(`[Saga] Step ${step.name} failed:`, error);
            throw error; // Propagate to trigger saga compensation
        }
    }
}
