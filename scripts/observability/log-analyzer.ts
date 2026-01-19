import { Client } from '@elastic/elasticsearch';
import axios from 'axios';

interface ErrorAnalysis {
    totalErrors: number;
    byService: Array<{ key: string; doc_count: number }>;
    byErrorType: Array<{ key: string; doc_count: number }>;
    timeline: Array<{ key: number; doc_count: number }>;
}

export class LogAnalyzer {
    private client: Client;
    private slackWebhook: string;

    constructor() {
        this.client = new Client({
            node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch-es-http.logging.svc:9200',
            auth: {
                username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
                password: process.env.ELASTICSEARCH_PASSWORD || '',
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
        this.slackWebhook = process.env.SLACK_WEBHOOK_URL || '';
    }

    async analyzeErrors(timeRange: string = '1h'): Promise<ErrorAnalysis> {
        console.log(`\nAnalyzing errors for the last ${timeRange}...\n`);

        try {
            const result = await this.client.search({
                index: 'logs-*',
                body: {
                    query: {
                        bool: {
                            must: [
                                { term: { level: 'error' } },
                                { range: { '@timestamp': { gte: `now-${timeRange}` } } },
                            ],
                        },
                    },
                    aggs: {
                        by_service: {
                            terms: { field: 'service.keyword', size: 10 },
                        },
                        by_error_type: {
                            terms: { field: 'message.keyword', size: 20 },
                        },
                        error_timeline: {
                            date_histogram: {
                                field: '@timestamp',
                                fixed_interval: '5m',
                            },
                        },
                    },
                    size: 0,
                },
            });

            const total = typeof result.hits.total === 'number'
                ? result.hits.total
                : result.hits.total?.value || 0;

            return {
                totalErrors: total,
                byService: (result.aggregations?.by_service as any)?.buckets || [],
                byErrorType: (result.aggregations?.by_error_type as any)?.buckets || [],
                timeline: (result.aggregations?.error_timeline as any)?.buckets || [],
            };
        } catch (error) {
            console.error('Failed to analyze errors:', (error as Error).message);
            return {
                totalErrors: 0,
                byService: [],
                byErrorType: [],
                timeline: [],
            };
        }
    }

    async findSlowRequests(threshold: number = 1000): Promise<any[]> {
        console.log(`\nFinding requests slower than ${threshold}ms...\n`);

        try {
            const result = await this.client.search({
                index: 'logs-*',
                body: {
                    query: {
                        bool: {
                            must: [
                                { term: { type: 'http_request' } },
                                { range: { duration: { gte: threshold } } },
                                { range: { '@timestamp': { gte: 'now-1h' } } },
                            ],
                        },
                    },
                    sort: [{ duration: { order: 'desc' } }],
                    size: 100,
                },
            });

            return result.hits.hits.map((hit: any) => hit._source);
        } catch (error) {
            console.error('Failed to find slow requests:', (error as Error).message);
            return [];
        }
    }

    async detectAnomalies(): Promise<any> {
        console.log('\nDetecting anomalies...\n');

        try {
            // Simple anomaly detection based on error rate
            const currentHour = await this.analyzeErrors('1h');
            const previousHour = await this.analyzeErrors('2h');

            const currentRate = currentHour.totalErrors;
            const previousRate = previousHour.totalErrors - currentHour.totalErrors;

            const anomalies = [];

            if (currentRate > previousRate * 2) {
                anomalies.push({
                    type: 'error_rate_spike',
                    severity: 'high',
                    current: currentRate,
                    baseline: previousRate,
                    increase: ((currentRate - previousRate) / previousRate) * 100,
                });
            }

            return anomalies;
        } catch (error) {
            console.error('Failed to detect anomalies:', (error as Error).message);
            return [];
        }
    }

    async generateDailyReport(): Promise<string> {
        console.log('\n=== Generating Daily Log Analysis Report ===\n');

        const errors = await this.analyzeErrors('24h');
        const slowRequests = await this.findSlowRequests();
        const anomalies = await this.detectAnomalies();

        const report = `
# Daily Log Analysis Report
Generated: ${new Date().toISOString()}

## Error Summary (24 hours)
- **Total Errors:** ${errors.totalErrors}
- **Top Services with Errors:**
${errors.byService.map((s: any) => `  - ${s.key}: ${s.doc_count} errors`).join('\n') || '  - No errors'}

## Top Error Messages
${errors.byErrorType
                .slice(0, 5)
                .map((e: any, i: number) => `${i + 1}. ${e.key} (${e.doc_count} occurrences)`)
                .join('\n') || 'No errors'}

## Slow Requests (>1s)
- **Total Slow Requests:** ${slowRequests.length}
${slowRequests.length > 0 ? `- **Slowest Request:** ${slowRequests[0]?.duration}ms - ${slowRequests[0]?.url}` : ''}

## Anomalies Detected
${anomalies.length > 0 ? anomalies.map((a: any) => `- ${a.type}: ${a.increase.toFixed(1)}% increase`).join('\n') : '- No anomalies detected'}

## Recommendations
${this.generateRecommendations(errors, slowRequests, anomalies)}
`;

        console.log(report);

        // Send to Slack if configured
        if (this.slackWebhook) {
            await this.sendToSlack(report);
        }

        return report;
    }

    private generateRecommendations(
        errors: ErrorAnalysis,
        slowRequests: any[],
        anomalies: any[]
    ): string {
        const recommendations: string[] = [];

        if (errors.totalErrors > 1000) {
            recommendations.push('- **High error rate detected.** Investigate top error messages.');
        }

        if (slowRequests.length > 50) {
            recommendations.push(
                '- **Many slow requests detected.** Consider optimizing database queries or adding caching.'
            );
        }

        if (anomalies.length > 0) {
            recommendations.push(
                '- **Anomalies detected.** Review recent deployments or traffic changes.'
            );
        }

        if (errors.byService.length > 0) {
            const topService = errors.byService[0];
            if (topService.doc_count > 100) {
                recommendations.push(
                    `- **Service ${topService.key} has high error count.** Investigate service health.`
                );
            }
        }

        return recommendations.length > 0
            ? recommendations.join('\n')
            : '- **No critical issues detected.** System is operating normally.';
    }

    private async sendToSlack(report: string): Promise<void> {
        try {
            await axios.post(this.slackWebhook, {
                text: '📊 Daily Log Analysis Report',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: report,
                        },
                    },
                ],
            });
            console.log('✓ Sent report to Slack');
        } catch (error) {
            console.error('✗ Failed to send to Slack:', (error as Error).message);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new LogAnalyzer();
    analyzer
        .generateDailyReport()
        .then(() => {
            console.log('\n✓ Daily report generated successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n✗ Report generation failed:', error);
            process.exit(1);
        });
}
