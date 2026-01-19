import axios from 'axios';

interface BusinessMetrics {
    revenue: {
        total: number;
        change: number;
        changeWeek: number;
    };
    orders: {
        total: number;
        completed: number;
        pending: number;
        failed: number;
        avgValue: number;
    };
    users: {
        new: number;
        active: number;
        peak: number;
    };
    conversion: {
        productViews: number;
        cartAdditions: number;
        checkoutsStarted: number;
        checkoutsCompleted: number;
        viewToCart: number;
        cartToCheckout: number;
        checkoutToPurchase: number;
        overall: number;
    };
}

export class BusinessReportGenerator {
    private prometheusUrl: string;
    private slackWebhook: string;

    constructor() {
        this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
        this.slackWebhook = process.env.SLACK_WEBHOOK_URL || '';
    }

    async generateDailyReport(): Promise<string> {
        console.log('\n=== Generating Daily Business Report ===\n');

        const metrics = await this.collectMetrics();
        const insights = this.generateInsights(metrics);
        const report = this.formatReport(metrics, insights);

        // Send to Slack
        if (this.slackWebhook) {
            await this.sendToSlack(report);
        }

        console.log(report);
        return report;
    }

    private async collectMetrics(): Promise<BusinessMetrics> {
        try {
            const [
                revenue,
                revenueYesterday,
                revenueLastWeek,
                orders,
                ordersCompleted,
                ordersPending,
                ordersFailed,
                avgOrderValue,
                newUsers,
                activeUsers,
                peakUsers,
                productViews,
                cartAdditions,
                checkoutsStarted,
                checkoutsCompleted,
            ] = await Promise.all([
                this.queryPrometheus('sum(increase(revenue_total[24h]))'),
                this.queryPrometheus('sum(increase(revenue_total[24h] offset 24h))'),
                this.queryPrometheus('sum(increase(revenue_total[24h] offset 7d))'),
                this.queryPrometheus('sum(increase(orders_created_total[24h]))'),
                this.queryPrometheus('sum(increase(orders_created_total{status="completed"}[24h]))'),
                this.queryPrometheus('sum(increase(orders_created_total{status="pending"}[24h]))'),
                this.queryPrometheus('sum(increase(orders_created_total{status="failed"}[24h]))'),
                this.queryPrometheus('histogram_quantile(0.50, rate(order_value_dollars_bucket[24h]))'),
                this.queryPrometheus('sum(increase(user_registrations_total[24h]))'),
                this.queryPrometheus('avg_over_time(active_users[24h])'),
                this.queryPrometheus('max_over_time(active_users[24h])'),
                this.queryPrometheus('sum(increase(product_views_total[24h]))'),
                this.queryPrometheus('sum(increase(cart_additions_total[24h]))'),
                this.queryPrometheus('sum(increase(checkout_started_total[24h]))'),
                this.queryPrometheus('sum(increase(checkout_completed_total[24h]))'),
            ]);

            return {
                revenue: {
                    total: revenue,
                    change: ((revenue - revenueYesterday) / revenueYesterday) * 100,
                    changeWeek: ((revenue - revenueLastWeek) / revenueLastWeek) * 100,
                },
                orders: {
                    total: orders,
                    completed: ordersCompleted,
                    pending: ordersPending,
                    failed: ordersFailed,
                    avgValue: avgOrderValue,
                },
                users: {
                    new: newUsers,
                    active: activeUsers,
                    peak: peakUsers,
                },
                conversion: {
                    productViews,
                    cartAdditions,
                    checkoutsStarted,
                    checkoutsCompleted,
                    viewToCart: (cartAdditions / productViews) * 100,
                    cartToCheckout: (checkoutsStarted / cartAdditions) * 100,
                    checkoutToPurchase: (checkoutsCompleted / checkoutsStarted) * 100,
                    overall: (checkoutsCompleted / productViews) * 100,
                },
            };
        } catch (error) {
            console.error('Failed to collect metrics:', (error as Error).message);
            // Return default values
            return {
                revenue: { total: 0, change: 0, changeWeek: 0 },
                orders: { total: 0, completed: 0, pending: 0, failed: 0, avgValue: 0 },
                users: { new: 0, active: 0, peak: 0 },
                conversion: {
                    productViews: 0,
                    cartAdditions: 0,
                    checkoutsStarted: 0,
                    checkoutsCompleted: 0,
                    viewToCart: 0,
                    cartToCheckout: 0,
                    checkoutToPurchase: 0,
                    overall: 0,
                },
            };
        }
    }

    private formatReport(metrics: BusinessMetrics, insights: string[]): string {
        const date = new Date().toISOString().split('T')[0];

        return `
# 📊 Daily Business Report
**Date:** ${date}

## 💰 Revenue
- **Total Revenue (24h):** $${metrics.revenue.total.toLocaleString()}
- **vs Yesterday:** ${this.formatChange(metrics.revenue.change)}
- **vs Last Week:** ${this.formatChange(metrics.revenue.changeWeek)}

## 🛒 Orders
- **Total Orders:** ${metrics.orders.total.toLocaleString()}
- **Average Order Value:** $${metrics.orders.avgValue.toFixed(2)}
- **Order Status:**
  - ✅ Completed: ${metrics.orders.completed} (${((metrics.orders.completed / metrics.orders.total) * 100).toFixed(1)}%)
  - ⏳ Pending: ${metrics.orders.pending}
  - ❌ Failed: ${metrics.orders.failed}

## 👥 Users
- **New Registrations:** ${metrics.users.new.toLocaleString()}
- **Active Users (avg):** ${Math.round(metrics.users.active).toLocaleString()}
- **Peak Concurrent Users:** ${Math.round(metrics.users.peak).toLocaleString()}

## 🎯 Conversion Funnel
- **Product Views:** ${metrics.conversion.productViews.toLocaleString()}
- **Cart Additions:** ${metrics.conversion.cartAdditions.toLocaleString()} (${metrics.conversion.viewToCart.toFixed(2)}%)
- **Checkouts Started:** ${metrics.conversion.checkoutsStarted.toLocaleString()} (${metrics.conversion.cartToCheckout.toFixed(2)}%)
- **Checkouts Completed:** ${metrics.conversion.checkoutsCompleted.toLocaleString()} (${metrics.conversion.checkoutToPurchase.toFixed(2)}%)
- **Overall Conversion:** ${metrics.conversion.overall.toFixed(2)}%

## 💡 Insights & Recommendations
${insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

---
*Generated automatically at ${new Date().toISOString()}*
`;
    }

    private generateInsights(metrics: BusinessMetrics): string[] {
        const insights: string[] = [];

        // Revenue insights
        if (metrics.revenue.change < -10) {
            insights.push(
                `⚠️  **Revenue Alert:** Revenue down ${Math.abs(metrics.revenue.change).toFixed(1)}% vs yesterday - investigate pricing, marketing, or technical issues`
            );
        } else if (metrics.revenue.change > 20) {
            insights.push(
                `🎉 **Revenue Spike:** Revenue up ${metrics.revenue.change.toFixed(1)}% vs yesterday - analyze what drove this increase`
            );
        }

        // Conversion insights
        if (metrics.conversion.overall < 2) {
            insights.push(
                `⚠️  **Low Conversion:** Overall conversion rate is ${metrics.conversion.overall.toFixed(2)}% - optimize checkout flow and reduce friction`
            );
        }

        if (metrics.conversion.viewToCart < 5) {
            insights.push(
                `📉 **Low Cart Addition Rate:** Only ${metrics.conversion.viewToCart.toFixed(1)}% of views convert to cart - improve product pages and pricing`
            );
        }

        if (metrics.conversion.checkoutToPurchase < 70) {
            insights.push(
                `🛒 **Checkout Abandonment:** ${(100 - metrics.conversion.checkoutToPurchase).toFixed(1)}% checkout abandonment - simplify checkout and reduce payment failures`
            );
        }

        // Order insights
        if (metrics.orders.failed > metrics.orders.total * 0.05) {
            insights.push(
                `❌ **High Order Failure Rate:** ${((metrics.orders.failed / metrics.orders.total) * 100).toFixed(1)}% of orders failed - check payment processing and inventory`
            );
        }

        // User insights
        if (metrics.users.new < 100) {
            insights.push(`📊 **Low User Acquisition:** Only ${metrics.users.new} new users - increase marketing efforts`);
        }

        // Default positive message
        if (insights.length === 0) {
            insights.push('✅ All metrics healthy - continue current strategy');
        }

        return insights;
    }

    private formatChange(change: number): string {
        const icon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        const sign = change > 0 ? '+' : '';
        return `${icon} ${sign}${change.toFixed(1)}%`;
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
            console.warn(`Failed to query Prometheus: ${query}`);
            return 0;
        }
    }

    private async sendToSlack(report: string): Promise<void> {
        try {
            await axios.post(this.slackWebhook, {
                text: report,
                mrkdwn: true,
            });
            console.log('✓ Sent report to Slack');
        } catch (error) {
            console.error('✗ Failed to send to Slack:', (error as Error).message);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new BusinessReportGenerator();
    generator
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
