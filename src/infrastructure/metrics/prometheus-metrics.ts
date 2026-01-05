import { Counter, Histogram, Gauge, Registry } from 'prom-client';

/**
 * Prometheus Metrics
 * Collects HTTP, business, and system metrics
 */
export class PrometheusMetrics {
    private registry: Registry;

    // HTTP Metrics
    public httpRequestDuration: Histogram;
    public httpRequestTotal: Counter;
    public httpRequestErrors: Counter;

    // Business Metrics
    public ordersTotal: Counter;
    public paymentsTotal: Counter;
    public notificationsSent: Counter;

    // System Metrics
    public activeConnections: Gauge;
    public kafkaLag: Gauge;

    constructor(serviceName: string) {
        this.registry = new Registry();
        this.registry.setDefaultLabels({ service: serviceName });

        // HTTP Metrics
        this.httpRequestDuration = new Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.1, 0.5, 1, 2, 5],
            registers: [this.registry],
        });

        this.httpRequestTotal = new Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code'],
            registers: [this.registry],
        });

        this.httpRequestErrors = new Counter({
            name: 'http_request_errors_total',
            help: 'Total number of HTTP request errors',
            labelNames: ['method', 'route', 'error_type'],
            registers: [this.registry],
        });

        // Business Metrics
        this.ordersTotal = new Counter({
            name: 'orders_total',
            help: 'Total number of orders',
            labelNames: ['status'],
            registers: [this.registry],
        });

        this.paymentsTotal = new Counter({
            name: 'payments_total',
            help: 'Total number of payments',
            labelNames: ['status'],
            registers: [this.registry],
        });

        this.notificationsSent = new Counter({
            name: 'notifications_sent_total',
            help: 'Total number of notifications sent',
            labelNames: ['type', 'channel'],
            registers: [this.registry],
        });

        // System Metrics
        this.activeConnections = new Gauge({
            name: 'active_connections',
            help: 'Number of active connections',
            registers: [this.registry],
        });

        this.kafkaLag = new Gauge({
            name: 'kafka_consumer_lag',
            help: 'Kafka consumer lag',
            labelNames: ['topic', 'partition'],
            registers: [this.registry],
        });
    }

    /**
     * Get metrics in Prometheus format
     */
    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    /**
     * Record HTTP request metrics
     */
    recordHttpRequest(
        method: string,
        route: string,
        statusCode: number,
        duration: number
    ): void {
        this.httpRequestDuration.observe(
            { method, route, status_code: statusCode.toString() },
            duration
        );

        this.httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });

        if (statusCode >= 400) {
            this.httpRequestErrors.inc({
                method,
                route,
                error_type: statusCode >= 500 ? 'server_error' : 'client_error',
            });
        }
    }
}
