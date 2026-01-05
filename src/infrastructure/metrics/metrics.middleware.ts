import { Request, Response, NextFunction } from 'express';
import { PrometheusMetrics } from './prometheus-metrics';

/**
 * Metrics middleware for Express
 * Automatically records HTTP request metrics
 */
export function metricsMiddleware(metrics: PrometheusMetrics) {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            metrics.recordHttpRequest(
                req.method,
                req.route?.path || req.path,
                res.statusCode,
                duration
            );
        });

        next();
    };
}
