import { initTracer, JaegerTracer, TracingConfig, TracingOptions } from 'jaeger-client';
import { FORMAT_HTTP_HEADERS, Span, SpanContext } from 'opentracing';

/**
 * Create Jaeger tracer
 */
export function createTracer(serviceName: string): JaegerTracer {
    const config: TracingConfig = {
        serviceName,
        sampler: {
            type: 'const',
            param: 1, // Sample all requests (1 = 100%)
        },
        reporter: {
            logSpans: true,
            agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
            agentPort: Number(process.env.JAEGER_AGENT_PORT) || 6831,
            flushIntervalMs: 1000,
        },
    };

    const options: TracingOptions = {
        logger: {
            info: (msg: string) => console.log('Jaeger INFO:', msg),
            error: (msg: string) => console.error('Jaeger ERROR:', msg),
        },
    };

    return initTracer(config, options);
}

/**
 * Tracing Service
 * Manages distributed tracing spans
 */
export class TracingService {
    constructor(private tracer: JaegerTracer) { }

    /**
     * Start a new span
     */
    startSpan(operationName: string, parentSpan?: Span): Span {
        if (parentSpan) {
            return this.tracer.startSpan(operationName, {
                childOf: parentSpan,
            });
        }
        return this.tracer.startSpan(operationName);
    }

    /**
     * Inject span context into headers for propagation
     */
    injectContext(span: Span, headers: Record<string, string>): void {
        this.tracer.inject(span.context(), FORMAT_HTTP_HEADERS, headers);
    }

    /**
     * Extract parent span context from headers
     */
    extractContext(headers: Record<string, string>): SpanContext | null {
        return this.tracer.extract(FORMAT_HTTP_HEADERS, headers);
    }

    /**
     * Finish span with optional error
     */
    finishSpan(span: Span, error?: Error): void {
        if (error) {
            span.setTag('error', true);
            span.log({
                event: 'error',
                message: error.message,
                stack: error.stack,
            });
        }
        span.finish();
    }
}
