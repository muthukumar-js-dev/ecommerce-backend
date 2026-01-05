import Consul from 'consul';

export interface ServiceConfig {
    name: string;
    id: string;
    address: string;
    port: number;
    tags?: string[];
    meta?: Record<string, string>;
}

export interface HealthCheck {
    http?: string;
    tcp?: string;
    interval: string;
    timeout: string;
    deregisterCriticalServiceAfter?: string;
}

export interface ServiceInstance {
    id: string;
    address: string;
    port: number;
    tags?: string[];
    meta?: Record<string, string>;
}

export interface ServiceHealth {
    serviceId: string;
    status: 'healthy' | 'unhealthy';
    checks: Array<{
        name: string;
        status: string;
        output: string;
    }>;
}

/**
 * Consul Client
 * Manages service registration, discovery, and health checks
 */
export class ConsulClient {
    private consul: Consul.Consul;

    constructor(host: string = 'localhost', port: string = '8500') {
        this.consul = new Consul({
            host,
            port,
            promisify: true,
        });
    }

    /**
     * Register a service with Consul
     */
    async registerService(
        service: ServiceConfig,
        healthCheck: HealthCheck
    ): Promise<void> {
        const registration: Consul.Agent.Service.RegisterOptions = {
            name: service.name,
            id: service.id,
            address: service.address,
            port: service.port,
            tags: service.tags,
            meta: service.meta,
            check: {
                http: healthCheck.http,
                tcp: healthCheck.tcp,
                interval: healthCheck.interval,
                timeout: healthCheck.timeout,
                deregistercriticalserviceafter: healthCheck.deregisterCriticalServiceAfter,
            },
        };

        await this.consul.agent.service.register(registration);
        console.log(`✅ Service registered: ${service.name} (${service.id})`);
    }

    /**
     * Deregister a service from Consul
     */
    async deregisterService(serviceId: string): Promise<void> {
        await this.consul.agent.service.deregister(serviceId);
        console.log(`✅ Service deregistered: ${serviceId}`);
    }

    /**
     * Discover healthy instances of a service
     */
    async discoverService(serviceName: string): Promise<ServiceInstance[]> {
        const result = await this.consul.health.service({
            service: serviceName,
            passing: true,
        });

        return result.map((entry: any) => ({
            id: entry.Service.ID,
            address: entry.Service.Address,
            port: entry.Service.Port,
            tags: entry.Service.Tags,
            meta: entry.Service.Meta,
        }));
    }

    /**
     * Get health status of all instances of a service
     */
    async getServiceHealth(serviceName: string): Promise<ServiceHealth[]> {
        const result = await this.consul.health.service({
            service: serviceName,
        });

        return result.map((entry: any) => ({
            serviceId: entry.Service.ID,
            status: entry.Checks.every((c: any) => c.Status === 'passing')
                ? 'healthy'
                : 'unhealthy',
            checks: entry.Checks.map((c: any) => ({
                name: c.Name,
                status: c.Status,
                output: c.Output,
            })),
        }));
    }

    /**
     * Watch for changes to a service
     */
    async watchService(
        serviceName: string,
        callback: (instances: ServiceInstance[]) => void
    ): Promise<Consul.Watch> {
        const watch = this.consul.watch({
            method: this.consul.health.service,
            options: {
                service: serviceName,
                passing: true,
            },
        });

        watch.on('change', (data: any) => {
            const instances = data.map((entry: any) => ({
                id: entry.Service.ID,
                address: entry.Service.Address,
                port: entry.Service.Port,
                tags: entry.Service.Tags,
            }));
            callback(instances);
        });

        watch.on('error', (err: Error) => {
            console.error(`❌ Watch error for service ${serviceName}:`, err);
        });

        return watch;
    }
}
