import { Request, Response, NextFunction } from 'express';
import { JaegerTracer } from 'jaeger-client';
import { FORMAT_HTTP_HEADERS, Span } from 'opentracing';

/**
 * Tracing middleware for Express
 * Automatically creates spans for HTTP requests
 */
export function tracingMiddleware(tracer: JaegerTracer) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Extract parent span context from headers
        const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, req.headers);

        // Start span
        const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`, {
            childOf: parentSpanContext || undefined,
        });

        // Add tags
        span.setTag('http.method', req.method);
        span.setTag('http.url', req.url);
        span.setTag('http.path', req.path);
        span.setTag('span.kind', 'server');

        // Add correlation ID
        const correlationId = (req.headers['x-correlation-id'] as string) || generateId();
        span.setTag('correlation.id', correlationId);

        // Attach span to request
        (req as any).span = span;
        (req as any).correlationId = correlationId;

        // Finish span on response
        res.on('finish', () => {
            span.setTag('http.status_code', res.statusCode);

            if (res.statusCode >= 400) {
                span.setTag('error', true);
            }

            span.finish();
        });

        next();
    };
}

/**
 * Generate unique correlation ID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
