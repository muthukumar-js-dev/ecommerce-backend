import { Request, Response } from 'express';
import axios from 'axios';

export class AnalyticsController {
    private prometheusUrl: string;

    constructor() {
        this.prometheusUrl = process.env.PROMETHEUS_URL ?? 'http://prometheus:9090';
    }

    async getRevenue(req: Request, res: Response): Promise<void> {
        const period = (req.query.period as string) ?? '24h';

        try {
            const revenue = await this.queryPrometheus(`sum(increase(revenue_total[${period}]))`);
            const orders = await this.queryPrometheus(`sum(increase(orders_created_total[${period}]))`);
            const avgOrderValue = await this.queryPrometheus(
                `histogram_quantile(0.50, rate(order_value_dollars_bucket[${period}]))`
            );

            res.json({
                period,
                revenue,
                orders,
                avgOrderValue,
                revenuePerOrder: orders > 0 ? revenue / orders : 0,
            });
        } catch (error: unknown) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getConversion(req: Request, res: Response): Promise<void> {
        const period = (req.query.period as string) ?? '1h';

        try {
            const productViews = await this.queryPrometheus(`sum(rate(product_views_total[${period}]))`);
            const cartAdditions = await this.queryPrometheus(`sum(rate(cart_additions_total[${period}]))`);
            const checkoutsStarted = await this.queryPrometheus(`sum(rate(checkout_started_total[${period}]))`);
            const checkoutsCompleted = await this.queryPrometheus(`sum(rate(checkout_completed_total[${period}]))`);

            res.json({
                period,
                funnel: {
                    productViews,
                    cartAdditions,
                    checkoutsStarted,
                    checkoutsCompleted,
                },
                rates: {
                    viewToCart: productViews > 0 ? (cartAdditions / productViews) * 100 : 0,
                    cartToCheckout: cartAdditions > 0 ? (checkoutsStarted / cartAdditions) * 100 : 0,
                    checkoutToPurchase: checkoutsStarted > 0 ? (checkoutsCompleted / checkoutsStarted) * 100 : 0,
                    overall: productViews > 0 ? (checkoutsCompleted / productViews) * 100 : 0,
                },
            });
        } catch (error: unknown) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getUsers(req: Request, res: Response): Promise<void> {
        const period = (req.query.period as string) ?? '24h';

        try {
            const newUsers = await this.queryPrometheus(`sum(increase(user_registrations_total[${period}]))`);
            const activeUsers = await this.queryPrometheus(`avg_over_time(active_users[${period}])`);
            const peakUsers = await this.queryPrometheus(`max_over_time(active_users[${period}])`);
            const sessions = await this.queryPrometheus(`sum(increase(user_sessions_total[${period}]))`);

            res.json({
                period,
                newUsers,
                activeUsers: Math.round(activeUsers),
                peakUsers: Math.round(peakUsers),
                sessions,
                sessionsPerUser: activeUsers > 0 ? sessions / activeUsers : 0,
            });
        } catch (error: unknown) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getTopProducts(req: Request, res: Response): Promise<void> {
        const period = (req.query.period as string) ?? '24h';
        const limit = (req.query.limit as string) ?? '10';

        try {
            const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
                params: {
                    query: `topk(${limit}, sum by (product_id) (increase(product_views_total[${period}])))`,
                },
            });

            const products = response.data.data.result.map((r: any) => ({
                productId: r.metric.product_id,
                views: parseFloat(r.value[1]),
            }));

            res.json({
                period,
                products,
            });
        } catch (error: unknown) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    async getDashboardMetrics(_req: Request, res: Response): Promise<void> {
        try {
            const [revenue24h, orders24h, activeUsers, conversionRate] = await Promise.all([
                this.queryPrometheus('sum(increase(revenue_total[24h]))'),
                this.queryPrometheus('sum(increase(orders_created_total[24h]))'),
                this.queryPrometheus('active_users'),
                this.queryPrometheus(
                    '(sum(rate(checkout_completed_total[1h])) / sum(rate(product_views_total[1h]))) * 100'
                ),
            ]);

            res.json({
                revenue24h,
                orders24h,
                activeUsers,
                conversionRate,
                avgOrderValue: orders24h > 0 ? revenue24h / orders24h : 0,
            });
        } catch (error: unknown) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    private async queryPrometheus(query: string): Promise<number> {
        try {
            const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
                params: { query },
            });

            if (response.data.status === 'success' && response.data.data.result.length > 0) {
                return parseFloat(response.data.data.result[0].value[1]) ?? 0;
            }

            return 0;
        } catch (error: unknown) {
            throw new Error(`Prometheus query failed: ${(error as Error).message}`);
        }
    }
}
