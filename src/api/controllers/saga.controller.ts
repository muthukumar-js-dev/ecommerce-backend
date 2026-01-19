import { Request, Response } from 'express';
import { SagaOrchestrator } from '@infrastructure/saga/saga-orchestrator';
import { SagaMonitor } from '@infrastructure/saga/saga-monitor';

/**
 * Saga Controller
 * HTTP endpoints for saga management and monitoring
 */
export class SagaController {
    constructor(
        private sagaOrchestrator: SagaOrchestrator,
        private sagaMonitor: SagaMonitor
    ) { }

    /**
     * GET /api/sagas/:id
     * Get saga status by ID
     */
    getSagaStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            // Original: const { id } = req.params;
            // Changed to use req.params.sagaId and added validation
            if (!req.params.sagaId) {throw new Error('Saga ID is required');}
            const saga = await this.sagaOrchestrator.getSagaStatus(req.params.sagaId);

            res.json({
                success: true,
                data: saga,
            });
        } catch (error: any) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
        }
    };

    /**
     * GET /api/sagas/failed
     * List all failed sagas
     */
    getFailedSagas = async (req: Request, res: Response): Promise<void> => {
        try {
            const limit = parseInt(req.query.limit as string) || 100;

            const sagas = await this.sagaOrchestrator.getFailedSagas(limit);

            res.json({
                success: true,
                data: sagas,
                count: sagas.length,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    };

    /**
     * POST /api/sagas/:id/retry
     * Retry a failed saga
     */
    retrySaga = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            if (!id) {throw new Error('Saga ID is required');}
            await this.sagaOrchestrator.retryFailedSaga(id);

            res.json({
                success: true,
                message: `Saga ${id} retry initiated`,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    };

    /**
     * GET /api/sagas/metrics
     * Get saga execution metrics
     */
    getMetrics = async (_req: Request, res: Response): Promise<void> => {
        try {
            const metrics = await this.sagaMonitor.getMetrics();

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    };

    /**
     * GET /api/sagas/stats
     * Get detailed saga statistics
     */
    getDetailedStats = async (_req: Request, res: Response): Promise<void> => {
        try {
            const stats = await this.sagaMonitor.getDetailedStats();

            res.json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    };
}
