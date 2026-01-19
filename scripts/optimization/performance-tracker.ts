import axios from 'axios';

interface PerformanceTrend {
    metric: string;
    current: number;
    baseline: number;
    trend: 'improving' | 'degrading' | 'stable';
    changePercent: number;
    recommendation?: string;
    priority: 'high' | 'medium' | 'low';
}

interface PerformanceReport {
    date: string;
    trends: PerformanceTrend[];
    summary: {
        improving: number;
        degrading: number;
        stable: number;
    };
    actionItems: ActionItem[];
}

interface ActionItem {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedEffort: string;
    expectedImpact: string;
    owner?: string;
}

class PrometheusClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
    }

    async query(query: string): Promise<number> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/query`, {
                params: { query },
            });
            const result = response.data.data.result[0];
            return result ? parseFloat(result.value[1]) : 0;
        } catch (error) {
            console.error(`Error querying Prometheus: ${error}`);
            return 0;
        }
    }
}

class SlackClient {
    private webhookUrl: string;

    constructor() {
        this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    }

    async sendMessage(channel: string, message: string): Promise<void> {
        if (!this.webhookUrl) {
            console.log(`[${channel}] ${message}`);
            return;
        }

        try {
            await axios.post(this.webhookUrl, {
                channel,
                text: message,
            });
        } catch (error) {
            console.error(`Error sending Slack message: ${error}`);
        }
    }
}

export class PerformanceTracker {
    private prometheus: PrometheusClient;
    private slack: SlackClient;

    constructor() {
        this.prometheus = new PrometheusClient();
        this.slack = new SlackClient();
    }

    async trackPerformanceTrends(): Promise<PerformanceTrend[]> {
        const trends: PerformanceTrend[] = [];

        // Track latency trends
        const currentP50 = await this.getMetric('histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))');
        const currentP95 = await this.getMetric('histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))');
        const currentP99 = await this.getMetric('histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))');

        const baselineP50 = await this.getBaselineMetric('histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))', '30d');
        const baselineP95 = await this.getBaselineMetric('histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))', '30d');
        const baselineP99 = await this.getBaselineMetric('histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))', '30d');

        trends.push(
            this.createTrend('P50 Latency', currentP50 * 1000, baselineP50 * 1000, {
                threshold: 100,
                recommendation: 'Optimize slow endpoints and database queries',
            }),
            this.createTrend('P95 Latency', currentP95 * 1000, baselineP95 * 1000, {
                threshold: 200,
                recommendation: 'Review and optimize P95+ requests',
            }),
            this.createTrend('P99 Latency', currentP99 * 1000, baselineP99 * 1000, {
                threshold: 500,
                recommendation: 'Investigate outliers and edge cases',
            })
        );

        // Track throughput
        const currentRPS = await this.getMetric('sum(rate(http_requests_total[5m]))');
        const baselineRPS = await this.getBaselineMetric('sum(rate(http_requests_total[5m]))', '30d');

        trends.push(
            this.createTrend('Throughput (RPS)', currentRPS, baselineRPS, {
                threshold: 100000,
                recommendation: 'Scale infrastructure to handle increased load',
                inverse: true,
            })
        );

        // Track error rate
        const currentErrorRate = await this.getMetric('sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100');
        const baselineErrorRate = await this.getBaselineMetric('sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100', '30d');

        trends.push(
            this.createTrend('Error Rate', currentErrorRate, baselineErrorRate, {
                threshold: 0.1,
                recommendation: 'Investigate and fix error sources',
            })
        );

        // Track database performance
        const currentDbLatency = await this.getMetric('histogram_quantile(0.95, rate(mongodb_query_duration_seconds_bucket[5m]))');
        const baselineDbLatency = await this.getBaselineMetric('histogram_quantile(0.95, rate(mongodb_query_duration_seconds_bucket[5m]))', '30d');

        trends.push(
            this.createTrend('Database Query P95', currentDbLatency * 1000, baselineDbLatency * 1000, {
                threshold: 50,
                recommendation: 'Review slow queries and add indexes',
            })
        );

        // Track cache performance
        const currentHitRate = await this.getMetric('sum(rate(cache_hits_total[5m])) / sum(rate(cache_requests_total[5m])) * 100');
        const baselineHitRate = await this.getBaselineMetric('sum(rate(cache_hits_total[5m])) / sum(rate(cache_requests_total[5m])) * 100', '30d');

        trends.push(
            this.createTrend('Cache Hit Rate', currentHitRate, baselineHitRate, {
                threshold: 80,
                recommendation: 'Optimize caching strategy and TTL',
                inverse: true,
            })
        );

        // Track resource utilization
        const currentCPU = await this.getMetric('avg(rate(container_cpu_usage_seconds_total[5m])) * 100');
        const currentMemory = await this.getMetric('avg(container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100');
        const baselineCPU = await this.getBaselineMetric('avg(rate(container_cpu_usage_seconds_total[5m])) * 100', '30d');
        const baselineMemory = await this.getBaselineMetric('avg(container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100', '30d');

        trends.push(
            this.createTrend('CPU Utilization', currentCPU, baselineCPU, {
                threshold: 70,
                recommendation: 'Review resource allocation and optimize code',
            }),
            this.createTrend('Memory Utilization', currentMemory, baselineMemory, {
                threshold: 75,
                recommendation: 'Investigate memory leaks and optimize usage',
            })
        );

        return trends;
    }

    async generateWeeklyReport(): Promise<PerformanceReport> {
        const trends = await this.trackPerformanceTrends();

        const summary = {
            improving: trends.filter((t) => t.trend === 'improving').length,
            degrading: trends.filter((t) => t.trend === 'degrading').length,
            stable: trends.filter((t) => t.trend === 'stable').length,
        };

        const actionItems = this.generateActionItems(trends);

        const report: PerformanceReport = {
            date: new Date().toISOString().split('T')[0],
            trends,
            summary,
            actionItems,
        };

        await this.sendReport(report);
        return report;
    }

    private createTrend(
        metric: string,
        current: number,
        baseline: number,
        options: {
            threshold: number;
            recommendation: string;
            inverse?: boolean;
        }
    ): PerformanceTrend {
        const changePercent = baseline > 0 ? ((current - baseline) / baseline) * 100 : 0;
        const isInverse = options.inverse || false;

        let trend: 'improving' | 'degrading' | 'stable';
        if (Math.abs(changePercent) < 5) {
            trend = 'stable';
        } else if (isInverse) {
            trend = changePercent > 0 ? 'improving' : 'degrading';
        } else {
            trend = changePercent < 0 ? 'improving' : 'degrading';
        }

        const exceedsThreshold = isInverse ? current < options.threshold : current > options.threshold;

        return {
            metric,
            current,
            baseline,
            trend,
            changePercent,
            recommendation: trend === 'degrading' || exceedsThreshold ? options.recommendation : undefined,
            priority: this.calculatePriority(trend, changePercent, exceedsThreshold),
        };
    }

    private calculatePriority(trend: string, changePercent: number, exceedsThreshold: boolean): 'high' | 'medium' | 'low' {
        if (trend === 'degrading' && Math.abs(changePercent) > 20) return 'high';
        if (exceedsThreshold) return 'high';
        if (trend === 'degrading') return 'medium';
        return 'low';
    }

    private generateActionItems(trends: PerformanceTrend[]): ActionItem[] {
        const items: ActionItem[] = [];

        const highPriority = trends.filter((t) => t.priority === 'high' && t.recommendation);
        const mediumPriority = trends.filter((t) => t.priority === 'medium' && t.recommendation);

        highPriority.forEach((trend) => {
            items.push({
                title: `Optimize ${trend.metric}`,
                description: trend.recommendation!,
                priority: 'high',
                estimatedEffort: '1-2 weeks',
                expectedImpact: `Improve ${trend.metric} by 20-30%`,
            });
        });

        mediumPriority.forEach((trend) => {
            items.push({
                title: `Improve ${trend.metric}`,
                description: trend.recommendation!,
                priority: 'medium',
                estimatedEffort: '3-5 days',
                expectedImpact: `Improve ${trend.metric} by 10-15%`,
            });
        });

        return items;
    }

    private async sendReport(report: PerformanceReport): Promise<void> {
        const message = `
📊 **Weekly Performance Report - ${report.date}**

**Summary:**
- 📈 Improving: ${report.summary.improving}
- 📉 Degrading: ${report.summary.degrading}
- ➡️  Stable: ${report.summary.stable}

**Key Trends:**
${report.trends
                .filter((t) => t.priority === 'high')
                .map((t) => `${this.getTrendIcon(t.trend)} **${t.metric}:** ${t.current.toFixed(2)} (${this.formatChange(t.changePercent)})`)
                .join('\n')}

**Action Items (${report.actionItems.length}):**
${report.actionItems
                .slice(0, 5)
                .map((item, i) => `${i + 1}. [${item.priority.toUpperCase()}] ${item.title}`)
                .join('\n')}

View full report: https://reports.yourdomain.com/performance/${report.date}
`;

        await this.slack.sendMessage('#performance', message);
        console.log('Performance report generated successfully');
        console.log(JSON.stringify(report, null, 2));
    }

    private getTrendIcon(trend: string): string {
        switch (trend) {
            case 'improving':
                return '✅';
            case 'degrading':
                return '⚠️';
            case 'stable':
                return '➡️';
            default:
                return '❓';
        }
    }

    private formatChange(changePercent: number): string {
        const sign = changePercent > 0 ? '+' : '';
        return `${sign}${changePercent.toFixed(1)}%`;
    }

    private async getMetric(query: string): Promise<number> {
        return await this.prometheus.query(query);
    }

    private async getBaselineMetric(query: string, period: string): Promise<number> {
        return await this.prometheus.query(`avg_over_time(${query}[${period}])`);
    }
}

// Main execution
async function main() {
    const tracker = new PerformanceTracker();
    await tracker.generateWeeklyReport();
}

main().catch(console.error);
