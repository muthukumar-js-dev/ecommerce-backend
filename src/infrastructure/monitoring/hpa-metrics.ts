import { register, Gauge } from 'prom-client';

export interface HPAMetricsData {
    currentReplicas: number;
    desiredReplicas: number;
    cpuUtilization: number;
    memoryUtilization: number;
}

export class HPAMetrics {
    private currentReplicas: Gauge;
    private desiredReplicas: Gauge;
    private cpuUtilization: Gauge;
    private memoryUtilization: Gauge;
    private scalingEvents: Gauge;

    // Internal tracking for metrics values
    private metricsCache: Map<string, HPAMetricsData> = new Map();

    constructor() {
        this.currentReplicas = new Gauge({
            name: 'hpa_current_replicas',
            help: 'Current number of replicas managed by HPA',
            labelNames: ['deployment', 'namespace'],
            registers: [register],
        });

        this.desiredReplicas = new Gauge({
            name: 'hpa_desired_replicas',
            help: 'Desired number of replicas calculated by HPA',
            labelNames: ['deployment', 'namespace'],
            registers: [register],
        });

        this.cpuUtilization = new Gauge({
            name: 'hpa_cpu_utilization_percent',
            help: 'Current CPU utilization percentage',
            labelNames: ['deployment', 'namespace'],
            registers: [register],
        });

        this.memoryUtilization = new Gauge({
            name: 'hpa_memory_utilization_percent',
            help: 'Current memory utilization percentage',
            labelNames: ['deployment', 'namespace'],
            registers: [register],
        });

        this.scalingEvents = new Gauge({
            name: 'hpa_scaling_events_total',
            help: 'Total number of scaling events',
            labelNames: ['deployment', 'namespace', 'direction'],
            registers: [register],
        });
    }

    /**
     * Update HPA metrics for a deployment
     */
    updateMetrics(
        deployment: string,
        namespace: string,
        metrics: HPAMetricsData
    ): void {
        const key = `${namespace}/${deployment}`;
        this.metricsCache.set(key, metrics);

        this.currentReplicas.set({ deployment, namespace }, metrics.currentReplicas);
        this.desiredReplicas.set({ deployment, namespace }, metrics.desiredReplicas);
        this.cpuUtilization.set({ deployment, namespace }, metrics.cpuUtilization);
        this.memoryUtilization.set({ deployment, namespace }, metrics.memoryUtilization);
    }

    /**
     * Record a scaling event
     */
    recordScalingEvent(
        deployment: string,
        namespace: string,
        direction: 'up' | 'down'
    ): void {
        this.scalingEvents.inc({ deployment, namespace, direction });
    }

    /**
     * Get current metrics for a deployment
     */
    getMetrics(deployment: string, namespace: string): {
        currentReplicas: number;
        desiredReplicas: number;
        cpuUtilization: number;
        memoryUtilization: number;
    } | null {
        try {
            const key = `${namespace}/${deployment}`;
            const cached = this.metricsCache.get(key);

            if (cached) {
                return {
                    currentReplicas: cached.currentReplicas,
                    desiredReplicas: cached.desiredReplicas,
                    cpuUtilization: cached.cpuUtilization,
                    memoryUtilization: cached.memoryUtilization,
                };
            }

            return null;
        } catch (error: unknown) {
            console.error('Failed to get HPA metrics:', error);
            return null;
        }
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.metricsCache.clear();
        this.currentReplicas.reset();
        this.desiredReplicas.reset();
        this.cpuUtilization.reset();
        this.memoryUtilization.reset();
        this.scalingEvents.reset();
    }
}

// Singleton instance
let hpaMetricsInstance: HPAMetrics | null = null;

export function getHPAMetrics(): HPAMetrics {
    if (!hpaMetricsInstance) {
        hpaMetricsInstance = new HPAMetrics();
    }
    return hpaMetricsInstance;
}
