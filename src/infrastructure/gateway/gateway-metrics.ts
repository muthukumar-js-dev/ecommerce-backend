import { KongClient } from './kong-client';

export interface ServiceHealth {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    retries: number;
    connect_timeout: number;
}

export interface RouteMetrics {
    name: string;
    paths: string[];
    methods: string[];
    service: string;
}

export interface GatewayStats {
    totalServices: number;
    totalRoutes: number;
    kongStatus: any;
}

/**
 * Gateway Metrics
 * Monitoring and health checks for Kong Gateway
 */
export class GatewayMetrics {
    constructor(private kongClient: KongClient) { }

    /**
     * Get health status of all services
     */
    async getServiceHealth(): Promise<Record<string, ServiceHealth>> {
        const services = await this.kongClient.listServices();

        const health: Record<string, ServiceHealth> = {};

        for (const service of services) {
            health[service.name] = {
                id: service.id,
                name: service.name,
                url: service.url,
                enabled: service.enabled !== false,
                retries: service.retries || 0,
                connect_timeout: service.connect_timeout || 60000,
            };
        }

        return health;
    }

    /**
     * Get metrics for all routes
     */
    async getRouteMetrics(): Promise<RouteMetrics[]> {
        const routes = await this.kongClient.listRoutes();

        return routes.map((route) => ({
            name: route.name,
            paths: route.paths || [],
            methods: route.methods || [],
            service: route.service?.id || 'unknown',
        }));
    }

    /**
     * Get overall gateway statistics
     */
    async getGatewayStats(): Promise<GatewayStats> {
        const [services, routes, status] = await Promise.all([
            this.kongClient.listServices(),
            this.kongClient.listRoutes(),
            this.kongClient.getStatus(),
        ]);

        return {
            totalServices: services.length,
            totalRoutes: routes.length,
            kongStatus: status,
        };
    }

    /**
     * Check if a specific service is healthy
     */
    async isServiceHealthy(serviceName: string): Promise<boolean> {
        try {
            const service = await this.kongClient.getService(serviceName);
            return service.enabled !== false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get detailed service information
     */
    async getServiceDetails(serviceName: string): Promise<any> {
        return this.kongClient.getService(serviceName);
    }
}
