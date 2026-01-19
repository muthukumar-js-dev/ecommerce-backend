import { initTracer, JaegerTracer, TracingConfig, TracingOptions } from 'jaeger-client';
import { Span } from 'opentracing';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include span
interface RequestWithSpan extends Request {
    span?: Span;
    user?: { id: string;[key: string]: unknown };
}

export function initializeTracing(serviceName: string): JaegerTracer {
    const config: TracingConfig = {
        serviceName,
        sampler: {
            type: 'probabilistic',
            param: parseFloat(process.env.JAEGER_SAMPLE_RATE ?? '0.1'), // Sample 10% of requests
        },
        reporter: {
            logSpans: process.env.NODE_ENV !== 'production',
            agentHost: process.env.JAEGER_AGENT_HOST ?? 'jaeger-agent',
            agentPort: parseInt(process.env.JAEGER_AGENT_PORT ?? '6832'),
            flushIntervalMs: 1000,
        },
    };

    const options: TracingOptions = {
        logger: {
            info: (msg: string) => console.log('[Jaeger INFO]', msg),
            error: (msg: string) => console.error('[Jaeger ERROR]', msg),
        },
        tags: {
            'service.version': process.env.SERVICE_VERSION ?? 'unknown',
            'deployment.environment': process.env.NODE_ENV ?? 'development',
        },
    };

    const tracer = initTracer(config, options);
    console.log(`✓ Jaeger tracing initialized for ${serviceName}`);

    return tracer;
}

/**
 * Express middleware for distributed tracing
 */
export function tracingMiddleware(tracer: JaegerTracer) {
    return (req: Request, res: Response, next: NextFunction) => {
        const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`);

        // Add standard tags
        span.setTag('http.method', req.method);
        span.setTag('http.url', req.url);
        span.setTag('http.path', req.path);
        span.setTag('http.host', req.hostname);
        span.setTag('span.kind', 'server');

        // Add custom tags
        if (req.headers['user-agent']) {
            span.setTag('http.user_agent', req.headers['user-agent']);
        }

        if ((req as RequestWithSpan).user) {
            span.setTag('user.id', (req as RequestWithSpan).user!.id);
        }

        // Store span in request for child spans
        (req as RequestWithSpan).span = span;

        // Log when response finishes
        res.on('finish', () => {
            span.setTag('http.status_code', res.statusCode);

            // Mark as error if status code >= 500
            if (res.statusCode >= 500) {
                span.setTag('error', true);
                span.log({
                    event: 'error',
                    'error.kind': 'ServerError',
                    message: `HTTP ${res.statusCode}`,
                });
            }

            span.finish();
        });

        next();
    };
}

/**
 * Create a child span for database operations
 */
export function createDatabaseSpan(parentSpan: Span | null, operation: string, collection: string): Span | null {
    if (!parentSpan) {return null;}

    const span = parentSpan.tracer().startSpan(`db.${operation}`, {
        childOf: parentSpan,
    });

    span.setTag('span.kind', 'client');
    span.setTag('db.type', 'mongodb');
    span.setTag('db.operation', operation);
    span.setTag('db.collection', collection);

    return span;
}

/**
 * Create a child span for cache operations
 */
export function createCacheSpan(parentSpan: Span | null, operation: string, key: string): Span | null {
    if (!parentSpan) {return null;}

    const span = parentSpan.tracer().startSpan(`cache.${operation}`, {
        childOf: parentSpan,
    });

    span.setTag('span.kind', 'client');
    span.setTag('cache.type', 'redis');
    span.setTag('cache.operation', operation);
    span.setTag('cache.key', key);

    return span;
}

/**
 * Create a child span for external API calls
 */
export function createExternalSpan(parentSpan: Span | null, service: string, operation: string): Span | null {
    if (!parentSpan) {return null;}

    const span = parentSpan.tracer().startSpan(`external.${service}.${operation}`, {
        childOf: parentSpan,
    });

    span.setTag('span.kind', 'client');
    span.setTag('peer.service', service);
    span.setTag('operation', operation);

    return span;
}

/**
 * Log an error to a span
 */
export function logSpanError(span: Span | null, error: Error): void {
    if (!span) {return;}

    span.setTag('error', true);
    span.log({
        event: 'error',
        'error.object': error,
        'error.kind': (error as any).name,
        message: (error).message,
        stack: (error as any).stack,
    });
}
