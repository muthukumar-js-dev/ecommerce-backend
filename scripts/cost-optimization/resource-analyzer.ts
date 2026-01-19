import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

interface ResourceRecommendation {
    resource: string;
    namespace: string;
    currentSize: {
        cpu: string;
        memory: string;
    };
    recommendedSize: {
        cpu: string;
        memory: string;
    };
    currentCost: number;
    projectedCost: number;
    savings: number;
    utilizationPercent: {
        cpu: number;
        memory: number;
    };
}

interface PodMetrics {
    name: string;
    namespace: string;
    resources: {
        requests: {
            cpu: number;
            memory: number;
        };
        limits: {
            cpu: number;
            memory: number;
        };
    };
}

export class ResourceAnalyzer {
    private prometheusUrl: string;

    constructor() {
        this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
    }

    async analyzeResources(): Promise<ResourceRecommendation[]> {
        console.log('\n=== Resource Right-Sizing Analysis ===\n');

        const recommendations: ResourceRecommendation[] = [];
        const pods = await this.getPodMetrics();

        for (const pod of pods) {
            const avgCPU = await this.getAvgMetric(
                `avg_over_time(container_cpu_usage_seconds_total{pod="${pod.name}",namespace="${pod.namespace}"}[7d])`,
                '7d'
            );

            const avgMemory = await this.getAvgMetric(
                `avg_over_time(container_memory_usage_bytes{pod="${pod.name}",namespace="${pod.namespace}"}[7d])`,
                '7d'
            );

            if (!avgCPU || !avgMemory) continue;

            const cpuRequest = pod.resources.requests.cpu;
            const memoryRequest = pod.resources.requests.memory;

            const cpuUtilization = (avgCPU / cpuRequest) * 100;
            const memoryUtilization = (avgMemory / memoryRequest) * 100;

            // Recommend downsizing if using <50% of requested resources
            if (cpuUtilization < 50 || memoryUtilization < 50) {
                const recommendedCPU = Math.ceil(avgCPU * 1.2 * 1000) / 1000; // 20% buffer
                const recommendedMemory = Math.ceil(avgMemory * 1.2);

                const currentCost = this.calculateCost(cpuRequest, memoryRequest);
                const projectedCost = this.calculateCost(recommendedCPU, recommendedMemory);

                recommendations.push({
                    resource: pod.name,
                    namespace: pod.namespace,
                    currentSize: {
                        cpu: `${cpuRequest}`,
                        memory: `${this.formatMemory(memoryRequest)}`,
                    },
                    recommendedSize: {
                        cpu: `${recommendedCPU}`,
                        memory: `${this.formatMemory(recommendedMemory)}`,
                    },
                    currentCost,
                    projectedCost,
                    savings: currentCost - projectedCost,
                    utilizationPercent: {
                        cpu: Math.round(cpuUtilization),
                        memory: Math.round(memoryUtilization),
                    },
                });
            }
        }

        this.printRecommendations(recommendations);
        return recommendations;
    }

    private async getPodMetrics(): Promise<PodMetrics[]> {
        try {
            const { stdout } = await execAsync(
                'kubectl get pods -n ecommerce-prod -o json'
            );

            const data = JSON.parse(stdout);
            const pods: PodMetrics[] = [];

            for (const pod of data.items) {
                if (pod.spec.containers && pod.spec.containers.length > 0) {
                    const container = pod.spec.containers[0];

                    pods.push({
                        name: pod.metadata.name,
                        namespace: pod.metadata.namespace,
                        resources: {
                            requests: {
                                cpu: this.parseCPU(container.resources?.requests?.cpu || '100m'),
                                memory: this.parseMemory(
                                    container.resources?.requests?.memory || '128Mi'
                                ),
                            },
                            limits: {
                                cpu: this.parseCPU(container.resources?.limits?.cpu || '1000m'),
                                memory: this.parseMemory(
                                    container.resources?.limits?.memory || '512Mi'
                                ),
                            },
                        },
                    });
                }
            }

            return pods;
        } catch (error) {
            console.error('Failed to get pod metrics:', (error as Error).message);
            return [];
        }
    }

    private async getAvgMetric(query: string, range: string): Promise<number | null> {
        try {
            const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
                params: { query },
            });

            const result = response.data.data.result;
            if (result && result.length > 0 && result[0].value) {
                return parseFloat(result[0].value[1]);
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    private calculateCost(cpu: number, memory: number): number {
        // AWS EKS pricing (approximate)
        const cpuCostPerHour = 0.0416; // per vCPU
        const memoryCostPerHour = 0.0046; // per GB
        const hoursPerMonth = 730;

        const cpuCost = cpu * cpuCostPerHour * hoursPerMonth;
        const memoryCost = (memory / (1024 * 1024 * 1024)) * memoryCostPerHour * hoursPerMonth;

        return cpuCost + memoryCost;
    }

    private parseCPU(cpu: string): number {
        if (cpu.endsWith('m')) {
            return parseInt(cpu) / 1000;
        }
        return parseFloat(cpu);
    }

    private parseMemory(memory: string): number {
        const units: { [key: string]: number } = {
            Ki: 1024,
            Mi: 1024 * 1024,
            Gi: 1024 * 1024 * 1024,
            K: 1000,
            M: 1000 * 1000,
            G: 1000 * 1000 * 1000,
        };

        for (const [unit, multiplier] of Object.entries(units)) {
            if (memory.endsWith(unit)) {
                return parseInt(memory) * multiplier;
            }
        }

        return parseInt(memory);
    }

    private formatMemory(bytes: number): string {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}Gi`;
        } else if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)}Mi`;
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(2)}Ki`;
        }
        return `${bytes}`;
    }

    private printRecommendations(recommendations: ResourceRecommendation[]): void {
        if (recommendations.length === 0) {
            console.log('✓ No right-sizing recommendations found\n');
            return;
        }

        console.log(`Found ${recommendations.length} right-sizing opportunities:\n`);

        const totalSavings = recommendations.reduce((sum, r) => sum + r.savings, 0);

        recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec.resource} (${rec.namespace})`);
            console.log(`   Current: CPU ${rec.currentSize.cpu}, Memory ${rec.currentSize.memory}`);
            console.log(
                `   Recommended: CPU ${rec.recommendedSize.cpu}, Memory ${rec.recommendedSize.memory}`
            );
            console.log(
                `   Utilization: CPU ${rec.utilizationPercent.cpu}%, Memory ${rec.utilizationPercent.memory}%`
            );
            console.log(`   Monthly Savings: $${rec.savings.toFixed(2)}`);
            console.log('');
        });

        console.log(`Total Potential Monthly Savings: $${totalSavings.toFixed(2)}\n`);
    }

    async exportRecommendations(recommendations: ResourceRecommendation[]): Promise<void> {
        const report = {
            generatedAt: new Date().toISOString(),
            totalRecommendations: recommendations.length,
            totalMonthlySavings: recommendations.reduce((sum, r) => sum + r.savings, 0),
            recommendations,
        };

        console.log(JSON.stringify(report, null, 2));
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new ResourceAnalyzer();
    analyzer
        .analyzeResources()
        .then((recommendations) => {
            return analyzer.exportRecommendations(recommendations);
        })
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Resource analysis failed:', error);
            process.exit(1);
        });
}
