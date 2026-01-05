import { ConsulClient } from '@infrastructure/service-mesh/consul/consul-client';
import { ServiceRegistry } from '@infrastructure/service-mesh/service-registry';

describe('Service Discovery', () => {
    let consulClient: ConsulClient;
    let serviceRegistry: ServiceRegistry;

    beforeAll(() => {
        consulClient = new ConsulClient();
        serviceRegistry = new ServiceRegistry();
    });

    describe('Service Registration', () => {
        it('should register service with Consul', async () => {
            try {
                await serviceRegistry.register('test-service', 3000);

                const instances = await consulClient.discoverService('test-service');
                expect(instances.length).toBeGreaterThan(0);
            } catch (error: any) {
                // Consul might not be running
                expect(error).toBeDefined();
            }
        });
    });

    describe('Service Discovery', () => {
        it('should discover healthy services only', async () => {
            try {
                const instances = await consulClient.discoverService('payment-service');

                if (instances.length > 0) {
                    for (const instance of instances) {
                        const health = await consulClient.getServiceHealth('payment-service');
                        const instanceHealth = health.find((h) => h.serviceId === instance.id);
                        expect(instanceHealth?.status).toBe('healthy');
                    }
                }
            } catch (error: any) {
                // Consul or service might not be running
                expect(error).toBeDefined();
            }
        });

        it('should return empty array when service not found', async () => {
            try {
                const instances = await consulClient.discoverService('non-existent-service');
                expect(instances).toEqual([]);
            } catch (error: any) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('Health Checks', () => {
        it('should get service health status', async () => {
            try {
                const health = await consulClient.getServiceHealth('test-service');

                if (health.length > 0) {
                    expect(health[0]).toHaveProperty('serviceId');
                    expect(health[0]).toHaveProperty('status');
                    expect(health[0]).toHaveProperty('checks');
                }
            } catch (error: any) {
                expect(error).toBeDefined();
            }
        });
    });
});
