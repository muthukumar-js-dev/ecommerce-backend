import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../infrastructure/logging/logger';

const logger = createLogger('http');

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Add correlation ID if not present
    if (!req.headers['x-correlation-id']) {
        req.headers['x-correlation-id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Log incoming request (debug level)
    logger.debug('Incoming Request', {
        type: 'http_request_start',
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        correlationId: req.headers['x-correlation-id'],
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
        const duration = Date.now() - startTime;

        // Log completed request
        logger.info('HTTP Request', {
            type: 'http_request',
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            correlationId: req.headers['x-correlation-id'],
        });

        // Log slow requests as warnings
        if (duration > 1000) {
            logger.warn('Slow Request Detected', {
                type: 'slow_request',
                method: req.method,
                url: req.url,
                duration,
                threshold: 1000,
            });
        }

        return originalSend.call(this, data);
    };

    // Handle errors
    res.on('error', (error) => {
        logger.error('Response Error', {
            type: 'response_error',
            method: req.method,
            url: req.url,
            error: (error).message,
            stack: (error as any).stack,
        });
    });

    next();
}
