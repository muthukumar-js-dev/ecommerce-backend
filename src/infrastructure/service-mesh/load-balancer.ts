import { ConsulClient, ServiceInstance } from './consul/consul-client';

export enum LoadBalancingStrategy {
    ROUND_ROBIN = 'ROUND_ROBIN',
    LEAST_CONNECTIONS = 'LEAST_CONNECTIONS',
    RANDOM = 'RANDOM',
    WEIGHTED = 'WEIGHTED',
}

/**
 * Load Balancer
 * Distributes traffic across service instances
 */
export class LoadBalancer {
    private consulClient: ConsulClient;
    private currentIndex = 0;
    private connectionCounts = new Map<string, number>();

    constructor(consulClient: ConsulClient) {
        this.consulClient = consulClient;
    }

    /**
     * Get a service instance using specified strategy
     */
    async getServiceInstance(
        serviceName: string,
        strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN
    ): Promise<ServiceInstance | null> {
        const instances = await this.consulClient.discoverService(serviceName);

        if (instances.length === 0) {
            console.warn(`⚠️ No healthy instances found for service: ${serviceName}`);
            return null;
        }

        switch (strategy) {
            case LoadBalancingStrategy.ROUND_ROBIN:
                return this.roundRobin(instances);
            case LoadBalancingStrategy.LEAST_CONNECTIONS:
                return this.leastConnections(instances);
            case LoadBalancingStrategy.RANDOM:
                return this.random(instances);
            case LoadBalancingStrategy.WEIGHTED:
                return this.weighted(instances);
            default:
                return this.roundRobin(instances);
        }
    }

    /**
     * Round Robin: Distribute evenly
     */
    private roundRobin(instances: ServiceInstance[]): ServiceInstance {
        const instance = instances[this.currentIndex % instances.length];
        this.currentIndex++;
        return instance;
    }

    /**
     * Least Connections: Route to least busy instance
     */
    private leastConnections(instances: ServiceInstance[]): ServiceInstance {
        let minConnections = Infinity;
        let selectedInstance = instances[0];

        for (const instance of instances) {
            const connections = this.connectionCounts.get(instance.id) || 0;
            if (connections < minConnections) {
                minConnections = connections;
                selectedInstance = instance;
            }
        }

        return selectedInstance;
    }

    /**
     * Random: Random selection
     */
    private random(instances: ServiceInstance[]): ServiceInstance {
        const index = Math.floor(Math.random() * instances.length);
        return instances[index];
    }

    /**
     * Weighted: Based on instance weights
     */
    private weighted(instances: ServiceInstance[]): ServiceInstance {
        const weights = instances.map((instance) => {
            const weight = instance.meta?.weight ? parseInt(instance.meta.weight) : 1;
            return weight;
        });

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < instances.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return instances[i];
            }
        }

        return instances[0];
    }

    /**
     * Increment connection count for an instance
     */
    incrementConnections(instanceId: string): void {
        const current = this.connectionCounts.get(instanceId) || 0;
        this.connectionCounts.set(instanceId, current + 1);
    }

    /**
     * Decrement connection count for an instance
     */
    decrementConnections(instanceId: string): void {
        const current = this.connectionCounts.get(instanceId) || 0;
        this.connectionCounts.set(instanceId, Math.max(0, current - 1));
    }

    /**
     * Get connection counts for monitoring
     */
    getConnectionCounts(): Map<string, number> {
        return new Map(this.connectionCounts);
    }
}
