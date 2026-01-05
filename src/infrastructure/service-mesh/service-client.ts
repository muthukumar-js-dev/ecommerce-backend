import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { LoadBalancer, LoadBalancingStrategy } from './load-balancer';
import { CircuitBreaker } from './circuit-breaker';
import { ConsulClient } from './consul/consul-client';

/**
 * Service Client
 * Unified client for inter-service communication with load balancing and circuit breaker
 */
export class ServiceClient {
    private consulClient: ConsulClient;
    private loadBalancer: LoadBalancer;
    private circuitBreakers = new Map<string, CircuitBreaker>();
    private axiosInstance: AxiosInstance;

    constructor(consulHost?: string, consulPort?: string) {
        this.consulClient = new ConsulClient(consulHost, consulPort);
        this.loadBalancer = new LoadBalancer(this.consulClient);
        this.axiosInstance = axios.create({
            timeout: 30000,
        });
    }

    /**
     * Call a service with automatic load balancing and circuit breaker
     */
    async call<T>(
        serviceName: string,
        path: string,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const circuitBreaker = this.getCircuitBreaker(serviceName);

        return circuitBreaker.execute(async () => {
            const instance = await this.loadBalancer.getServiceInstance(
                serviceName,
                LoadBalancingStrategy.ROUND_ROBIN
            );

            if (!instance) {
                throw new Error(`No healthy instances found for service: ${serviceName}`);
            }

            const url = `http://${instance.address}:${instance.port}${path}`;

            try {
                this.loadBalancer.incrementConnections(instance.id);
                const response = await this.axiosInstance.request<T>({
                    ...config,
                    url,
                });
                return response.data;
            } finally {
                this.loadBalancer.decrementConnections(instance.id);
            }
        });
    }

    /**
     * GET request
     */
    async get<T>(serviceName: string, path: string, config?: AxiosRequestConfig): Promise<T> {
        return this.call<T>(serviceName, path, { ...config, method: 'GET' });
    }

    /**
     * POST request
     */
    async post<T>(
        serviceName: string,
        path: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<T> {
        return this.call<T>(serviceName, path, { ...config, method: 'POST', data });
    }

    /**
     * PUT request
     */
    async put<T>(
        serviceName: string,
        path: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<T> {
        return this.call<T>(serviceName, path, { ...config, method: 'PUT', data });
    }

    /**
     * DELETE request
     */
    async delete<T>(serviceName: string, path: string, config?: AxiosRequestConfig): Promise<T> {
        return this.call<T>(serviceName, path, { ...config, method: 'DELETE' });
    }

    /**
     * Get or create circuit breaker for a service
     */
    private getCircuitBreaker(serviceName: string): CircuitBreaker {
        if (!this.circuitBreakers.has(serviceName)) {
            this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName));
        }
        return this.circuitBreakers.get(serviceName)!;
    }

    /**
     * Get circuit breaker metrics for all services
     */
    getCircuitBreakerMetrics(): Record<string, any> {
        const metrics: Record<string, any> = {};
        for (const [serviceName, breaker] of this.circuitBreakers) {
            metrics[serviceName] = breaker.getMetrics();
        }
        return metrics;
    }

    /**
     * Get load balancer connection counts
     */
    getConnectionCounts(): Map<string, number> {
        return this.loadBalancer.getConnectionCounts();
    }
}
