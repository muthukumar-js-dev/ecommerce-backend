import { SagaRepository } from './saga.repository';
import { OrderPlacementSaga, OrderPlacementData } from '@application/sagas/order-placement/order-placement.saga';
import { ID } from '@shared/types/common';
import { SagaState } from './saga.interface';

/**
 * Saga Orchestrator
 * Central coordinator for all saga executions
 */
export class SagaOrchestrator {
    constructor(
        private sagaRepository: SagaRepository,
        private orderPlacementSaga: OrderPlacementSaga
    ) { }

    /**
     * Execute order placement saga
     */
    async executeOrderPlacement(data: OrderPlacementData): Promise<ID> {
        return this.orderPlacementSaga.execute(data);
    }

    /**
     * Get saga status by ID
     */
    async getSagaStatus(sagaId: ID): Promise<SagaState> {
        return this.sagaRepository.findById(sagaId);
    }

    /**
     * Get all failed sagas
     */
    async getFailedSagas(limit: number = 100): Promise<SagaState[]> {
        return this.sagaRepository.findFailedSagas(limit);
    }

    /**
     * Retry a failed saga
     * Note: This is a simplified version
     * In production, you'd need to recreate the saga with original data
     */
    async retryFailedSaga(sagaId: ID): Promise<void> {
        const saga = await this.sagaRepository.findById(sagaId);

        console.log(`🔄 Retrying saga ${sagaId} of type ${saga.type}`);

        // In a real implementation, you would:
        // 1. Extract original data from saga.context
        // 2. Create new saga instance
        // 3. Execute with original data

        // For now, just log
        console.log('⚠️ Saga retry not fully implemented yet');
    }
}
