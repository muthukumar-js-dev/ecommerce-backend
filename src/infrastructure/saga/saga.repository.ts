import { SagaModel } from './models/saga.model';
import { SagaState, SagaStatus } from './saga.interface';
import { ID } from '@shared/types/common';

/**
 * Saga Repository
 * Handles persistence of saga state
 */
export class SagaRepository {
    async create(saga: SagaState): Promise<void> {
        await SagaModel.create(saga);
    }

    async findById(sagaId: ID): Promise<SagaState> {
        const saga = await SagaModel.findOne({ sagaId }).lean();
        if (!saga) {
            throw new Error(`Saga not found: ${sagaId}`);
        }
        return saga as SagaState;
    }

    async updateStatus(sagaId: ID, status: SagaStatus): Promise<void> {
        await SagaModel.updateOne(
            { sagaId },
            {
                $set: {
                    status,
                    updatedAt: new Date(),
                },
            }
        );
    }

    async updateStepStatus(
        sagaId: ID,
        stepName: string,
        status: string,
        additionalData?: Record<string, any>
    ): Promise<void> {
        const updateData: any = {
            'steps.$.status': status,
            updatedAt: new Date(),
        };

        if (additionalData) {
            Object.keys(additionalData).forEach((key) => {
                updateData[`steps.$.${key}`] = additionalData[key];
            });
        }

        await SagaModel.updateOne(
            { sagaId, 'steps.stepName': stepName },
            { $set: updateData }
        );
    }

    async incrementStepRetry(sagaId: ID, stepName: string): Promise<void> {
        await SagaModel.updateOne(
            { sagaId, 'steps.stepName': stepName },
            {
                $inc: { 'steps.$.retryCount': 1 },
                $set: { updatedAt: new Date() },
            }
        );
    }

    async complete(sagaId: ID): Promise<void> {
        await SagaModel.updateOne(
            { sagaId },
            {
                $set: {
                    status: SagaStatus.COMPLETED,
                    completedAt: new Date(),
                    updatedAt: new Date(),
                },
            }
        );
    }

    async fail(sagaId: ID, error: string): Promise<void> {
        await SagaModel.updateOne(
            { sagaId },
            {
                $set: {
                    status: SagaStatus.FAILED,
                    error,
                    updatedAt: new Date(),
                },
            }
        );
    }

    async findFailedSagas(limit: number = 100): Promise<SagaState[]> {
        return SagaModel.find({ status: SagaStatus.FAILED })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean() as Promise<SagaState[]>;
    }

    async findInProgressSagas(): Promise<SagaState[]> {
        return SagaModel.find({
            status: { $in: [SagaStatus.IN_PROGRESS, SagaStatus.COMPENSATING] },
        })
            .sort({ createdAt: 1 })
            .lean() as Promise<SagaState[]>;
    }
}
