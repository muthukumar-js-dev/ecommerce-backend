import axios from 'axios';

interface GrafanaPanel {
    id: number;
    title: string;
    type: string;
    targets: any[];
    gridPos?: { x: number; y: number; w: number; h: number };
}

interface GrafanaDashboard {
    dashboard: {
        title: string;
        tags: string[];
        panels: GrafanaPanel[];
        refresh?: string;
    };
}

export class GrafanaClient {
    private baseUrl: string;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async createDashboard(dashboard: GrafanaDashboard): Promise<void> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/dashboards/db`,
                dashboard,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log(`✓ Created dashboard: ${dashboard.dashboard.title}`);
        } catch (error: any) {
            console.error(`✗ Failed to create dashboard: ${error.message}`);
            throw error;
        }
    }
}

const services = ['core-service', 'payment-service', 'notification-service'];

async function createServiceDashboards() {
    const grafanaUrl = process.env.GRAFANA_URL || 'http://grafana:3000';
    const apiKey = process.env.GRAFANA_API_KEY;

    if (!apiKey) {
        console.error('GRAFANA_API_KEY environment variable is required');
        process.exit(1);
    }

    const grafana = new GrafanaClient(grafanaUrl, apiKey);

    for (const service of services) {
        const dashboard: GrafanaDashboard = {
            dashboard: {
                title: `${service} - Detailed Metrics`,
                tags: ['production', service, 'detailed'],
                refresh: '30s',
                panels: [
                    createRequestRatePanel(service, 1),
                    createErrorRatePanel(service, 2),
                    createLatencyPanel(service, 3),
                    createDependencyPanel(service, 4),
                    createResourcePanel(service, 5),
                ],
            },
        };

        await grafana.createDashboard(dashboard);
    }

    console.log('\n✅ All service dashboards created successfully');
}

function createRequestRatePanel(service: string, id: number): GrafanaPanel {
    return {
        id,
        title: 'Request Rate',
        type: 'graph',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
            {
                expr: `sum(rate(http_requests_total{service="${service}"}[5m])) by (method, path)`,
                legendFormat: '{{method}} {{path}}',
            },
        ],
    };
}

function createErrorRatePanel(service: string, id: number): GrafanaPanel {
    return {
        id,
        title: 'Error Rate by Endpoint',
        type: 'graph',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
            {
                expr: `sum(rate(http_request_errors_total{service="${service}"}[5m])) by (path) / sum(rate(http_requests_total{service="${service}"}[5m])) by (path) * 100`,
                legendFormat: '{{path}}',
            },
        ],
    };
}

function createLatencyPanel(service: string, id: number): GrafanaPanel {
    return {
        id,
        title: 'Latency Percentiles',
        type: 'graph',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
            {
                expr: `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{service="${service}"}[5m]))`,
                legendFormat: 'P50',
            },
            {
                expr: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="${service}"}[5m]))`,
                legendFormat: 'P95',
            },
            {
                expr: `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="${service}"}[5m]))`,
                legendFormat: 'P99',
            },
        ],
    };
}

function createDependencyPanel(service: string, id: number): GrafanaPanel {
    return {
        id,
        title: 'Dependency Performance',
        type: 'graph',
        gridPos: { x: 12, y: 8, w: 12, h: 8 },
        targets: [
            {
                expr: `histogram_quantile(0.95, rate(mongodb_query_duration_seconds_bucket{service="${service}"}[5m]))`,
                legendFormat: 'MongoDB P95',
            },
            {
                expr: `histogram_quantile(0.95, rate(redis_command_duration_seconds_bucket{service="${service}"}[5m]))`,
                legendFormat: 'Redis P95',
            },
        ],
    };
}

function createResourcePanel(service: string, id: number): GrafanaPanel {
    return {
        id,
        title: 'Resource Utilization',
        type: 'graph',
        gridPos: { x: 0, y: 16, w: 24, h: 8 },
        targets: [
            {
                expr: `sum(rate(container_cpu_usage_seconds_total{pod=~"${service}.*"}[5m])) by (pod)`,
                legendFormat: 'CPU - {{pod}}',
            },
            {
                expr: `sum(container_memory_usage_bytes{pod=~"${service}.*"}) by (pod)`,
                legendFormat: 'Memory - {{pod}}',
            },
        ],
    };
}

// Run if called directly
if (require.main === module) {
    createServiceDashboards()
        .then(() => {
            console.log('\n✓ Dashboard creation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n✗ Dashboard creation failed:', error.message);
            process.exit(1);
        });
}
