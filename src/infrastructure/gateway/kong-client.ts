import axios, { AxiosInstance } from 'axios';

export interface KongService {
    name: string;
    url: string;
    retries?: number;
    connect_timeout?: number;
    write_timeout?: number;
    read_timeout?: number;
}

export interface KongRoute {
    name: string;
    paths: string[];
    methods?: string[];
    service?: { id: string };
}

export interface KongPlugin {
    name: string;
    config: Record<string, any>;
}

/**
 * Kong Admin API Client
 * Programmatic configuration of Kong Gateway
 */
export class KongClient {
    private client: AxiosInstance;

    constructor(adminUrl: string = process.env.KONG_ADMIN_URL || 'http://localhost:8001') {
        this.client = axios.create({
            baseURL: adminUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }

    /**
     * Create a new service in Kong
     */
    async createService(service: KongService): Promise<any> {
        try {
            const response = await this.client.post('/services', service);
            return response.data;
        } catch (error: any) {
            console.error('Failed to create service:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Create a route for a service
     */
    async createRoute(serviceId: string, route: Omit<KongRoute, 'service'>): Promise<any> {
        try {
            const response = await this.client.post(`/services/${serviceId}/routes`, {
                ...route,
                service: { id: serviceId },
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to create route:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Add a plugin to a service or route
     */
    async addPlugin(
        entityType: 'services' | 'routes',
        entityId: string,
        pluginName: string,
        config: Record<string, any>
    ): Promise<any> {
        try {
            const response = await this.client.post(`/${entityType}/${entityId}/plugins`, {
                name: pluginName,
                config,
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to add plugin:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Add a global plugin
     */
    async addGlobalPlugin(pluginName: string, config: Record<string, any>): Promise<any> {
        try {
            const response = await this.client.post('/plugins', {
                name: pluginName,
                config,
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to add global plugin:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * List all services
     */
    async listServices(): Promise<any[]> {
        try {
            const response = await this.client.get('/services');
            return response.data.data || [];
        } catch (error: any) {
            console.error('Failed to list services:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * List all routes
     */
    async listRoutes(): Promise<any[]> {
        try {
            const response = await this.client.get('/routes');
            return response.data.data || [];
        } catch (error: any) {
            console.error('Failed to list routes:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get service by ID or name
     */
    async getService(serviceId: string): Promise<any> {
        try {
            const response = await this.client.get(`/services/${serviceId}`);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get service:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Delete a service
     */
    async deleteService(serviceId: string): Promise<void> {
        try {
            await this.client.delete(`/services/${serviceId}`);
        } catch (error: any) {
            console.error('Failed to delete service:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Delete a route
     */
    async deleteRoute(routeId: string): Promise<void> {
        try {
            await this.client.delete(`/routes/${routeId}`);
        } catch (error: any) {
            console.error('Failed to delete route:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get Kong status
     */
    async getStatus(): Promise<any> {
        try {
            const response = await this.client.get('/status');
            return response.data;
        } catch (error: any) {
            console.error('Failed to get status:', error.response?.data || error.message);
            throw error;
        }
    }
}
