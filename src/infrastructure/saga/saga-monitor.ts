import { SagaRepository } from './saga.repository';
import { SagaStatus } from './saga.interface';

export interface SagaMetrics {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    oldestInProgress: Date | null;
}

/**
 * Saga Monitor
 * Provides monitoring and alerting for saga executions
 */
export class SagaMonitor {
    constructor(private sagaRepository: SagaRepository) { }

    /**
     * Get saga execution metrics
     */
    async getMetrics(): Promise<SagaMetrics> {
        const sagas = await this.sagaRepository.findInProgressSagas();

        const metrics: SagaMetrics = {
            total: sagas.length,
            byStatus: {},
            byType: {},
            oldestInProgress: null,
        };

        for (const saga of sagas) {
            // Count by status
            metrics.byStatus[saga.status] = (metrics.byStatus[saga.status] || 0) + 1;

            // Count by type
            metrics.byType[saga.type] = (metrics.byType[saga.type] || 0) + 1;

            // Track oldest
            if (!metrics.oldestInProgress || saga.createdAt < metrics.oldestInProgress) {
                metrics.oldestInProgress = saga.createdAt;
            }
        }

        return metrics;
    }

    /**
     * Check for stuck sagas (running longer than threshold)
     */
    async checkStuckSagas(thresholdMinutes: number = 30): Promise<void> {
        const sagas = await this.sagaRepository.findInProgressSagas();
        const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

        const stuckSagas = sagas.filter((saga) => saga.createdAt < threshold);

        if (stuckSagas.length > 0) {
            console.warn(`⚠️ Found ${stuckSagas.length} stuck sagas (running > ${thresholdMinutes} minutes)`);

            for (const saga of stuckSagas) {
                console.warn(`  - Saga ${saga.sagaId} (${saga.type}): ${saga.status} since ${saga.createdAt}`);
            }

            // In production, send alert to monitoring system
            // e.g., Sentry, DataDog, CloudWatch, etc.
        } else {
            console.log(`✅ No stuck sagas found`);
        }
    }

    /**
     * Get detailed saga statistics
     */
    async getDetailedStats() {
        const [inProgress, failed] = await Promise.all([
            this.sagaRepository.findInProgressSagas(),
            this.sagaRepository.findFailedSagas(100),
        ]);

        return {
            inProgress: {
                count: inProgress.length,
                sagas: inProgress.map((s) => ({
                    id: s.sagaId,
                    type: s.type,
                    status: s.status,
                    age: Date.now() - s.createdAt.getTime(),
                })),
            },
            failed: {
                count: failed.length,
                sagas: failed.map((s) => ({
                    id: s.sagaId,
                    type: s.type,
                    error: s.error,
                    failedAt: s.updatedAt,
                })),
            },
        };
    }
}
