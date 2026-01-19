import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

interface PerformanceAnomaly {
    timestamp: Date;
    metric: string;
    value: number;
    baseline: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high';
}

interface MetricData {
    value: number;
    timestamp: number;
}

export class PerformanceAnalyzer {
    private prometheusUrl: string;
    private slackWebhook: string;

    constructor() {
        this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
        this.slackWebhook = process.env.SLACK_WEBHOOK_URL || '';
    }

    async analyzePerformance(): Promise<PerformanceAnomaly[]> {
        console.log('\n=== Running Performance Analysis ===\n');

        const anomalies: PerformanceAnomaly[] = [];

        // Analyze latency trends
        const latencyAnomalies = await this.detectLatencyAnomalies();
        anomalies.push(...latencyAnomalies);

        // Analyze error rate trends
        const errorAnomalies = await this.detectErrorAnomalies();
        anomalies.push(...errorAnomalies);

        // Analyze resource utilization
        const resourceAnomalies = await this.detectResourceAnomalies();
        anomalies.push(...resourceAnomalies);

        // Analyze cache performance
        const cacheAnomalies = await this.detectCacheAnomalies();
        anomalies.push(...cacheAnomalies);

        // Generate report
        if (anomalies.length > 0) {
            console.log(`\n⚠️  Found ${anomalies.length} anomalies\n`);
            await this.generateAnomalyReport(anomalies);
        } else {
            console.log('\n✅ No anomalies detected\n');
        }

        return anomalies;
    }

    private async detectLatencyAnomalies(): Promise<PerformanceAnomaly[]> {
        console.log('Analyzing latency trends...');

        const currentP95 = await this.queryPrometheus(
            'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{namespace="ecommerce-prod"}[5m]))'
        );

        const baselineP95 = await this.queryPrometheus(
            'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{namespace="ecommerce-prod"}[7d]))'
        );

        if (!currentP95 || !baselineP95) {
            console.log('  ⚠️  No latency data available');
            return [];
        }

        const deviation = ((currentP95 - baselineP95) / baselineP95) * 100;

        if (Math.abs(deviation) > 20) {
            console.log(`  ⚠️  Latency anomaly detected: ${deviation.toFixed(2)}% deviation`);
            return [
                {
                    timestamp: new Date(),
                    metric: 'P95 Latency',
                    value: currentP95 * 1000, // Convert to ms
                    baseline: baselineP95 * 1000,
                    deviation,
                    severity: Math.abs(deviation) > 50 ? 'high' : 'medium',
                },
            ];
        }

        console.log('  ✓ Latency within normal range');
        return [];
    }

    private async detectErrorAnomalies(): Promise<PerformanceAnomaly[]> {
        console.log('Analyzing error rate trends...');

        const currentErrorRate = await this.queryPrometheus(
            'sum(rate(http_request_errors_total{namespace="ecommerce-prod"}[5m])) / sum(rate(http_requests_total{namespace="ecommerce-prod"}[5m])) * 100'
        );

        const baselineErrorRate = await this.queryPrometheus(
            'sum(rate(http_request_errors_total{namespace="ecommerce-prod"}[7d])) / sum(rate(http_requests_total{namespace="ecommerce-prod"}[7d])) * 100'
        );

        if (!currentErrorRate || !baselineErrorRate) {
            console.log('  ⚠️  No error rate data available');
            return [];
        }

        const deviation = ((currentErrorRate - baselineErrorRate) / (baselineErrorRate || 0.01)) * 100;

        if (currentErrorRate > 0.5 || Math.abs(deviation) > 50) {
            console.log(`  ⚠️  Error rate anomaly detected: ${currentErrorRate.toFixed(3)}%`);
            return [
                {
                    timestamp: new Date(),
                    metric: 'Error Rate',
                    value: currentErrorRate,
                    baseline: baselineErrorRate,
                    deviation,
                    severity: currentErrorRate > 1.0 ? 'high' : 'medium',
                },
            ];
        }

        console.log('  ✓ Error rate within normal range');
        return [];
    }

    private async detectResourceAnomalies(): Promise<PerformanceAnomaly[]> {
        console.log('Analyzing resource utilization...');

        const anomalies: PerformanceAnomaly[] = [];

        // Check CPU
        const cpuUsage = await this.queryPrometheus(
            'sum(rate(container_cpu_usage_seconds_total{namespace="ecommerce-prod"}[5m])) / sum(container_spec_cpu_quota{namespace="ecommerce-prod"} / container_spec_cpu_period{namespace="ecommerce-prod"}) * 100'
        );

        if (cpuUsage && cpuUsage > 80) {
            console.log(`  ⚠️  High CPU usage: ${cpuUsage.toFixed(2)}%`);
            anomalies.push({
                timestamp: new Date(),
                metric: 'CPU Utilization',
                value: cpuUsage,
                baseline: 70,
                deviation: ((cpuUsage - 70) / 70) * 100,
                severity: cpuUsage > 90 ? 'high' : 'medium',
            });
        }

        // Check Memory
        const memoryUsage = await this.queryPrometheus(
            'sum(container_memory_usage_bytes{namespace="ecommerce-prod"}) / sum(container_spec_memory_limit_bytes{namespace="ecommerce-prod"}) * 100'
        );

        if (memoryUsage && memoryUsage > 85) {
            console.log(`  ⚠️  High memory usage: ${memoryUsage.toFixed(2)}%`);
            anomalies.push({
                timestamp: new Date(),
                metric: 'Memory Utilization',
                value: memoryUsage,
                baseline: 75,
                deviation: ((memoryUsage - 75) / 75) * 100,
                severity: memoryUsage > 95 ? 'high' : 'medium',
            });
        }

        if (anomalies.length === 0) {
            console.log('  ✓ Resource utilization within normal range');
        }

        return anomalies;
    }

    private async detectCacheAnomalies(): Promise<PerformanceAnomaly[]> {
        console.log('Analyzing cache performance...');

        const hitRate = await this.queryPrometheus(
            'rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100'
        );

        if (!hitRate) {
            console.log('  ⚠️  No cache data available');
            return [];
        }

        if (hitRate < 70) {
            console.log(`  ⚠️  Low cache hit rate: ${hitRate.toFixed(2)}%`);
            return [
                {
                    timestamp: new Date(),
                    metric: 'Cache Hit Rate',
                    value: hitRate,
                    baseline: 80,
                    deviation: ((hitRate - 80) / 80) * 100,
                    severity: hitRate < 50 ? 'high' : 'medium',
                },
            ];
        }

        console.log('  ✓ Cache performance within normal range');
        return [];
    }

    private async generateAnomalyReport(anomalies: PerformanceAnomaly[]): Promise<void> {
        const highSeverity = anomalies.filter((a) => a.severity === 'high');
        const mediumSeverity = anomalies.filter((a) => a.severity === 'medium');

        const report = `
# Performance Anomaly Report
Generated: ${new Date().toISOString()}

## Summary
- Total Anomalies: ${anomalies.length}
- High Severity: ${highSeverity.length}
- Medium Severity: ${mediumSeverity.length}

## Anomalies

${anomalies
                .map(
                    (a) => `
### ${a.metric}
- **Current Value:** ${a.value.toFixed(2)}${a.metric.includes('Rate') ? '%' : a.metric.includes('Latency') ? 'ms' : ''}
- **Baseline:** ${a.baseline.toFixed(2)}${a.metric.includes('Rate') ? '%' : a.metric.includes('Latency') ? 'ms' : ''}
- **Deviation:** ${a.deviation.toFixed(2)}%
- **Severity:** ${a.severity.toUpperCase()}
- **Timestamp:** ${a.timestamp.toISOString()}
`
                )
                .join('\n')}

## Recommendations

${this.generateRecommendations(anomalies)}
`;

        console.log(report);

        // Send to Slack if webhook is configured
        if (this.slackWebhook) {
            await this.sendToSlack(anomalies);
        }
    }

    private generateRecommendations(anomalies: PerformanceAnomaly[]): string {
        const recommendations: string[] = [];

        anomalies.forEach((a) => {
            if (a.metric === 'P95 Latency' && a.severity === 'high') {
                recommendations.push('- Investigate slow database queries and optimize indexes');
                recommendations.push('- Check for N+1 query problems');
                recommendations.push('- Review recent code changes for performance regressions');
            }

            if (a.metric === 'Error Rate') {
                recommendations.push('- Review application logs for error patterns');
                recommendations.push('- Check external service dependencies');
                recommendations.push('- Verify database connectivity');
            }

            if (a.metric === 'CPU Utilization') {
                recommendations.push('- Consider scaling up pod replicas');
                recommendations.push('- Profile CPU-intensive operations');
                recommendations.push('- Check for infinite loops or inefficient algorithms');
            }

            if (a.metric === 'Memory Utilization') {
                recommendations.push('- Check for memory leaks');
                recommendations.push('- Review cache sizes and TTLs');
                recommendations.push('- Consider increasing memory limits');
            }

            if (a.metric === 'Cache Hit Rate') {
                recommendations.push('- Review cache key patterns');
                recommendations.push('- Adjust cache TTLs');
                recommendations.push('- Consider warming up cache on deployment');
            }
        });

        return recommendations.length > 0 ? recommendations.join('\n') : '- No specific recommendations';
    }

    private async sendToSlack(anomalies: PerformanceAnomaly[]): Promise<void> {
        const highSeverity = anomalies.filter((a) => a.severity === 'high');
        const color = highSeverity.length > 0 ? 'danger' : 'warning';

        const message = {
            text: '⚠️ Performance Anomalies Detected',
            attachments: [
                {
                    color,
                    title: 'Performance Anomaly Report',
                    fields: anomalies.map((a) => ({
                        title: a.metric,
                        value: `Current: ${a.value.toFixed(2)}, Baseline: ${a.baseline.toFixed(2)}, Deviation: ${a.deviation.toFixed(2)}%`,
                        short: false,
                    })),
                    footer: 'Performance Analyzer',
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        };

        try {
            await axios.post(this.slackWebhook, message);
            console.log('✓ Sent anomaly report to Slack');
        } catch (error) {
            console.error('✗ Failed to send to Slack:', (error as Error).message);
        }
    }

    private async queryPrometheus(query: string): Promise<number | null> {
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
            console.error(`Failed to query Prometheus: ${(error as Error).message}`);
            return null;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new PerformanceAnalyzer();
    analyzer
        .analyzePerformance()
        .then((anomalies) => {
            process.exit(anomalies.some((a) => a.severity === 'high') ? 1 : 0);
        })
        .catch((error) => {
            console.error('Performance analysis failed:', error);
            process.exit(1);
        });
}
