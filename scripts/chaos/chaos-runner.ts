import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

interface ChaosExperiment {
    name: string;
    file: string;
    duration: number;
    validations: string[];
}

interface Metrics {
    errorRate: number;
    latencyP95: number;
    podCount: number;
    requestRate: number;
}

export class ChaosRunner {
    private prometheusUrl: string;
    private experiments: ChaosExperiment[] = [
        {
            name: 'Pod Kill',
            file: 'chaos-experiments/pod-chaos.yaml',
            duration: 60,
            validations: ['pod_recovery', 'service_availability', 'error_rate'],
        },
        {
            name: 'Network Delay',
            file: 'chaos-experiments/network-chaos.yaml',
            duration: 600,
            validations: ['latency_increase', 'timeout_handling', 'circuit_breaker'],
        },
        {
            name: 'CPU Stress',
            file: 'chaos-experiments/stress-chaos.yaml',
            duration: 300,
            validations: ['autoscaling', 'performance_degradation', 'resource_limits'],
        },
    ];

    constructor() {
        this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
    }

    async runExperiment(experiment: ChaosExperiment): Promise<boolean> {
        console.log(`\n🔬 Running Chaos Experiment: ${experiment.name}`);
        console.log('='.repeat(60));

        try {
            // Capture baseline metrics
            console.log('📊 Capturing baseline metrics...');
            const baseline = await this.captureMetrics();
            this.displayMetrics('Baseline', baseline);

            // Apply chaos experiment
            console.log('\n💥 Applying chaos...');
            await execAsync(`kubectl apply -f ${experiment.file}`);
            console.log('✓ Chaos experiment applied');

            // Monitor during experiment
            console.log(`\n⏱️  Monitoring for ${experiment.duration}s...`);
            await this.monitorExperiment(experiment.duration);

            // Capture post-chaos metrics
            console.log('\n📊 Capturing post-chaos metrics...');
            const postChaos = await this.captureMetrics();
            this.displayMetrics('Post-Chaos', postChaos);

            // Cleanup
            console.log('\n🧹 Cleaning up chaos experiment...');
            await execAsync(`kubectl delete -f ${experiment.file}`);
            console.log('✓ Chaos experiment removed');

            // Wait for recovery
            console.log('\n🔄 Waiting for system recovery...');
            await this.waitForRecovery();

            // Validate results
            const results = await this.validateExperiment(experiment, baseline, postChaos);

            console.log(`\n${results.passed ? '✅' : '❌'} Experiment ${results.passed ? 'PASSED' : 'FAILED'}`);
            console.log('='.repeat(60));

            return results.passed;
        } catch (error) {
            console.error(`\n❌ Experiment failed with error: ${(error as Error).message}`);
            return false;
        }
    }

    async runAllExperiments(): Promise<void> {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║     Chaos Engineering Test Suite                      ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        const results: Array<{ experiment: string; passed: boolean }> = [];

        for (const experiment of this.experiments) {
            const passed = await this.runExperiment(experiment);
            results.push({ experiment: experiment.name, passed });

            // Wait between experiments
            if (experiment !== this.experiments[this.experiments.length - 1]) {
                console.log('\n⏸️  Waiting 60s before next experiment...\n');
                await this.sleep(60000);
            }
        }

        // Generate report
        this.generateReport(results);
    }

    private async captureMetrics(): Promise<Metrics> {
        try {
            const metrics: Metrics = {
                errorRate: await this.queryPrometheus(
                    'sum(rate(http_request_errors_total[1m])) / sum(rate(http_requests_total[1m])) * 100'
                ),
                latencyP95: await this.queryPrometheus(
                    'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m])) * 1000'
                ),
                podCount: await this.queryPrometheus(
                    'count(kube_pod_status_phase{phase="Running", namespace="ecommerce-prod"})'
                ),
                requestRate: await this.queryPrometheus('sum(rate(http_requests_total[1m]))'),
            };

            return metrics;
        } catch (error) {
            console.warn('⚠️  Failed to capture metrics, using defaults');
            return {
                errorRate: 0,
                latencyP95: 0,
                podCount: 0,
                requestRate: 0,
            };
        }
    }

    private async monitorExperiment(duration: number): Promise<void> {
        const interval = 10; // Check every 10 seconds
        const iterations = Math.floor(duration / interval);

        for (let i = 0; i < iterations; i++) {
            const metrics = await this.captureMetrics();
            const elapsed = i * interval;

            console.log(
                `  [${elapsed.toString().padStart(3)}s] ` +
                `Error: ${metrics.errorRate.toFixed(2)}% | ` +
                `P95: ${metrics.latencyP95.toFixed(0)}ms | ` +
                `Pods: ${metrics.podCount} | ` +
                `RPS: ${metrics.requestRate.toFixed(1)}`
            );

            // Check if system is completely down
            if (metrics.requestRate === 0 && i > 0) {
                console.log('  ⚠️  WARNING: System appears to be down!');
            }

            await this.sleep(interval * 1000);
        }
    }

    private async waitForRecovery(): Promise<void> {
        const maxWait = 300; // 5 minutes
        const interval = 10;

        for (let i = 0; i < maxWait / interval; i++) {
            const metrics = await this.captureMetrics();

            if (metrics.errorRate < 0.1 && metrics.latencyP95 < 200) {
                console.log(`✓ System recovered in ${i * interval}s`);
                return;
            }

            if (i % 3 === 0) {
                console.log(`  Waiting for recovery... (${i * interval}s)`);
            }

            await this.sleep(interval * 1000);
        }

        console.log('⚠️  WARNING: System did not fully recover within timeout');
    }

    private async validateExperiment(
        experiment: ChaosExperiment,
        baseline: Metrics,
        postChaos: Metrics
    ): Promise<{ passed: boolean; validations: Record<string, boolean> }> {
        const validations: Record<string, boolean> = {};

        for (const validation of experiment.validations) {
            switch (validation) {
                case 'pod_recovery':
                    validations.pod_recovery = postChaos.podCount >= baseline.podCount;
                    break;
                case 'service_availability':
                    validations.service_availability = postChaos.requestRate > 0;
                    break;
                case 'error_rate':
                    validations.error_rate = postChaos.errorRate < 1; // < 1%
                    break;
                case 'autoscaling':
                    validations.autoscaling = postChaos.podCount >= baseline.podCount;
                    break;
                case 'latency_increase':
                    validations.latency_increase = postChaos.latencyP95 < baseline.latencyP95 * 3;
                    break;
                case 'timeout_handling':
                    validations.timeout_handling = postChaos.errorRate < 5; // < 5%
                    break;
                case 'circuit_breaker':
                    validations.circuit_breaker = postChaos.requestRate > 0;
                    break;
                case 'performance_degradation':
                    validations.performance_degradation = postChaos.latencyP95 < 1000; // < 1s
                    break;
                case 'resource_limits':
                    validations.resource_limits = postChaos.podCount === baseline.podCount;
                    break;
            }
        }

        const passed = Object.values(validations).every((v) => v === true);

        console.log('\n📋 Validation Results:');
        Object.entries(validations).forEach(([key, value]) => {
            console.log(`  ${value ? '✅' : '❌'} ${key.replace(/_/g, ' ')}`);
        });

        return { passed, validations };
    }

    private generateReport(results: Array<{ experiment: string; passed: boolean }>): void {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║     Chaos Engineering Report                          ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        const passed = results.filter((r) => r.passed).length;
        const failed = results.filter((r) => !r.passed).length;

        console.log(`📊 Summary:`);
        console.log(`  Total Experiments: ${results.length}`);
        console.log(`  ✅ Passed: ${passed}`);
        console.log(`  ❌ Failed: ${failed}`);
        console.log(`  Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

        console.log(`\n📝 Details:`);
        results.forEach((r) => {
            console.log(`  ${r.passed ? '✅' : '❌'} ${r.experiment}`);
        });

        console.log('\n' + '='.repeat(60) + '\n');
    }

    private displayMetrics(label: string, metrics: Metrics): void {
        console.log(`  ${label}:`);
        console.log(`    Error Rate: ${metrics.errorRate.toFixed(2)}%`);
        console.log(`    P95 Latency: ${metrics.latencyP95.toFixed(0)}ms`);
        console.log(`    Pod Count: ${metrics.podCount}`);
        console.log(`    Request Rate: ${metrics.requestRate.toFixed(1)} req/s`);
    }

    private async queryPrometheus(query: string): Promise<number> {
        try {
            const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
                params: { query },
            });

            if (response.data.status === 'success' && response.data.data.result.length > 0) {
                return parseFloat(response.data.data.result[0].value[1]) || 0;
            }

            return 0;
        } catch (error) {
            return 0;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new ChaosRunner();
    runner
        .runAllExperiments()
        .then(() => {
            console.log('✓ Chaos testing completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('✗ Chaos testing failed:', error);
            process.exit(1);
        });
}
