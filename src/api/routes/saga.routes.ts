import { Router } from 'express';
import { SagaController } from '../controllers/saga.controller';

export function createSagaRoutes(controller: SagaController): Router {
    const router = Router();

    // Get saga status
    router.get('/:id', controller.getSagaStatus);

    // List failed sagas
    router.get('/failed/list', controller.getFailedSagas);

    // Retry failed saga
    router.post('/:id/retry', controller.retrySaga);

    // Get metrics
    router.get('/metrics/summary', controller.getMetrics);

    // Get detailed stats
    router.get('/stats/detailed', controller.getDetailedStats);

    return router;
}
