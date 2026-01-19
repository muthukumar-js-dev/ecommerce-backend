import { Kafka } from 'kafkajs';

export interface HealthCheckResult {
    healthy: boolean;
    message: string;
    details?: {
        brokers?: number;
        clusterId?: string;
        controller?: number;
    };
}

export class KafkaHealthCheck {
    constructor(private kafka: Kafka) { }

    async check(): Promise<HealthCheckResult> {
        try {
            const admin = this.kafka.admin();
            await admin.connect();

            const cluster = await admin.describeCluster();
            await admin.disconnect();

            if (cluster.brokers.length === 0) {
                return {
                    healthy: false,
                    message: 'No brokers available',
                };
            }

            return {
                healthy: true,
                message: `Connected to ${cluster.brokers.length} broker(s)`,
                details: {
                    brokers: cluster.brokers.length,
                    clusterId: cluster.clusterId,
                    controller: cluster.controller ?? undefined,
                },
            };
        } catch (error: any) {
            return {
                healthy: false,
                message: `Kafka health check failed: ${error.message}`,
            };
        }
    }

    async checkTopics(expectedTopics: string[]): Promise<HealthCheckResult> {
        try {
            const admin = this.kafka.admin();
            await admin.connect();

            const topics = await admin.listTopics();
            await admin.disconnect();

            const missingTopics = expectedTopics.filter(
                (topic) => !topics.includes(topic)
            );

            if (missingTopics.length > 0) {
                return {
                    healthy: false,
                    message: `Missing topics: ${missingTopics.join(', ')}`,
                };
            }

            return {
                healthy: true,
                message: `All ${expectedTopics.length} topics exist`,
                details: {
                    brokers: topics.length,
                },
            };
        } catch (error: any) {
            return {
                healthy: false,
                message: `Topic check failed: ${error.message}`,
            };
        }
    }
}
