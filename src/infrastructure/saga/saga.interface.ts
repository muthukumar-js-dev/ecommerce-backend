import { ID } from '@shared/types/common';

/**
 * Saga Step Interface
 * Each step must implement execute and compensate logic
 */
export interface SagaStep {
    name: string;
    execute(context: SagaContext): Promise<void>;
    compensate(context: SagaContext): Promise<void>;
}

/**
 * Saga Context
 * Shared context passed between steps
 */
export interface SagaContext {
    sagaId: ID;
    data: Record<string, any>;
    stepData: Map<string, any>;
}

/**
 * Saga Status Enum
 */
export enum SagaStatus {
    STARTED = 'STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPENSATING = 'COMPENSATING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    COMPENSATED = 'COMPENSATED',
}

/**
 * Saga State
 * Persisted state of saga execution
 */
export interface SagaState {
    sagaId: ID;
    type: string;
    status: SagaStatus;
    currentStep: number;
    steps: SagaStepState[];
    context: SagaContext;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    error?: string;
}

/**
 * Saga Step State
 * State of individual step execution
 */
export interface SagaStepState {
    stepName: string;
    status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'COMPENSATING' | 'COMPENSATED' | 'FAILED';
    executedAt?: Date;
    compensatedAt?: Date;
    error?: string;
    retryCount: number;
}
