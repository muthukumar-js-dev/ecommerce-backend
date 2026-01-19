import { ConsulClient, ServiceConfig, HealthCheck } from './consul/consul-client';
import os from 'os';

/**
 * Service Registry
 * Handles automatic service registration with Consul
 */
export class ServiceRegistry {
    private consulClient: ConsulClient;
    private serviceId?: string;

    constructor(consulHost?: string, consulPort?: string) {
        this.consulClient = new ConsulClient(consulHost, consulPort);
    }

    /**
     * Register service with Consul
     */
    async register(
        serviceName: string,
        port: number,
        healthCheckPath: string = '/health'
    ): Promise<void> {
        const hostname = os.hostname();
        const address = this.getLocalIpAddress();

        this.serviceId = `${serviceName}-${hostname}-${port}`;

        const serviceConfig: ServiceConfig = {
            name: serviceName,
            id: this.serviceId,
            address,
            port,
            tags: [
                `version:${process.env.SERVICE_VERSION || '1.0.0'}`,
                `env:${process.env.NODE_ENV || 'development'}`,
            ],
            meta: {
                hostname,
                startTime: new Date().toISOString(),
            },
        };

        const healthCheck: HealthCheck = {
            http: `http://${address}:${port}${healthCheckPath}`,
            interval: '10s',
            timeout: '5s',
            deregisterCriticalServiceAfter: '1m',
        };

        await this.consulClient.registerService(serviceConfig, healthCheck);

        // Setup graceful shutdown
        this.setupGracefulShutdown();

        console.log(`🚀 Service registered with Consul: ${serviceName} at ${address}:${port}`);
    }

    /**
     * Deregister service from Consul
     */
    async deregister(): Promise<void> {
        if (this.serviceId) {
            await this.consulClient.deregisterService(this.serviceId);
        }
    }

    /**
     * Setup graceful shutdown handlers
     */
    private setupGracefulShutdown(): void {
        const shutdown = async () => {
            console.log('🛑 Shutting down, deregistering service...');
            await this.deregister();
            process.exit(0);
        };

        process.on('SIGTERM', () => { void shutdown(); });
        process.on('SIGINT', () => { void shutdown(); });
    }

    /**
     * Get local IP address (non-loopback)
     */
    private getLocalIpAddress(): string {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return 'localhost';
    }
}
