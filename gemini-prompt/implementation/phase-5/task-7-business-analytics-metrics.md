# Phase 5 - Task 7: Business Analytics & Metrics

**Duration:** 3-4 days  
**Priority:** Medium  
**Dependencies:** Task 3 (Monitoring Operational)

---

## Objective

Implement comprehensive business analytics and metrics tracking to measure product success, user behavior, revenue metrics, conversion funnels, and provide data-driven insights for business decisions and growth optimization.

---

## Context

Business analytics provides:
- **Product Insights:** Understand user behavior and preferences
- **Revenue Tracking:** Real-time revenue and financial metrics
- **Conversion Optimization:** Identify and fix funnel drop-offs
- **Data-Driven Decisions:** Make informed business choices
- **Growth Measurement:** Track KPIs and business goals
- **Competitive Advantage:** Faster iteration based on data

---

## Implementation Steps

### Step 1: Business Metrics Instrumentation

**Implement comprehensive business event tracking:**

```typescript
// src/infrastructure/analytics/business-metrics.ts

import { Counter, Histogram, Gauge, Summary } from 'prom-client';

export class BusinessMetrics {
  // Order metrics
  private ordersCreated = new Counter({
    name: 'orders_created_total',
    help: 'Total number of orders created',
    labelNames: ['status', 'payment_method', 'country'],
  });

  private orderValue = new Histogram({
    name: 'order_value_dollars',
    help: 'Order value in dollars',
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    labelNames: ['currency', 'category'],
  });

  private orderProcessingTime = new Histogram({
    name: 'order_processing_duration_seconds',
    help: 'Time taken to process an order',
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  });

  // Revenue metrics
  private revenue = new Counter({
    name: 'revenue_total',
    help: 'Total revenue in dollars',
    labelNames: ['currency', 'product_category', 'country'],
  });

  private revenuePerUser = new Histogram({
    name: 'revenue_per_user_dollars',
    help: 'Revenue per user',
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
  });

  // User metrics
  private activeUsers = new Gauge({
    name: 'active_users',
    help: 'Number of currently active users',
    labelNames: ['user_type'],
  });

  private userRegistrations = new Counter({
    name: 'user_registrations_total',
    help: 'Total user registrations',
    labelNames: ['source', 'country'],
  });

  private userSessions = new Counter({
    name: 'user_sessions_total',
    help: 'Total user sessions',
    labelNames: ['device_type', 'platform'],
  });

  private sessionDuration = new Histogram({
    name: 'session_duration_seconds',
    help: 'User session duration',
    buckets: [30, 60, 120, 300, 600, 1800, 3600],
  });

  // Product metrics
  private productViews = new Counter({
    name: 'product_views_total',
    help: 'Total product views',
    labelNames: ['product_id', 'category', 'source'],
  });

  private productSearches = new Counter({
    name: 'product_searches_total',
    help: 'Total product searches',
    labelNames: ['query_type'],
  });

  private cartAdditions = new Counter({
    name: 'cart_additions_total',
    help: 'Total items added to cart',
    labelNames: ['product_id', 'category'],
  });

  private cartRemovals = new Counter({
    name: 'cart_removals_total',
    help: 'Total items removed from cart',
    labelNames: ['product_id', 'reason'],
  });

  private wishlistAdditions = new Counter({
    name: 'wishlist_additions_total',
    help: 'Total wishlist additions',
    labelNames: ['product_id'],
  });

  // Conversion metrics
  private checkoutStarted = new Counter({
    name: 'checkout_started_total',
    help: 'Total checkouts started',
    labelNames: ['cart_value_range'],
  });

  private checkoutCompleted = new Counter({
    name: 'checkout_completed_total',
    help: 'Total checkouts completed',
    labelNames: ['payment_method'],
  });

  private checkoutAbandoned = new Counter({
    name: 'checkout_abandoned_total',
    help: 'Total checkouts abandoned',
    labelNames: ['step', 'reason'],
  });

  // Payment metrics
  private paymentAttempts = new Counter({
    name: 'payment_attempts_total',
    help: 'Total payment attempts',
    labelNames: ['method', 'status'],
  });

  private paymentFailures = new Counter({
    name: 'payment_failures_total',
    help: 'Total payment failures',
    labelNames: ['method', 'error_code'],
  });

  // Customer metrics
  private customerLifetimeValue = new Histogram({
    name: 'customer_lifetime_value_dollars',
    help: 'Customer lifetime value',
    buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
  });

  private repeatPurchaseRate = new Gauge({
    name: 'repeat_purchase_rate',
    help: 'Percentage of repeat customers',
  });

  // Methods
  trackOrderCreated(order: any): void {
    this.ordersCreated.inc({ 
      status: order.status, 
      payment_method: order.paymentMethod,
      country: order.shippingAddress.country,
    });
    
    this.orderValue.observe(
      { currency: order.currency, category: order.category },
      order.total
    );
    
    this.revenue.inc(
      { 
        currency: order.currency, 
        product_category: order.category,
        country: order.shippingAddress.country,
      }, 
      order.total
    );
  }

  trackOrderProcessing(duration: number): void {
    this.orderProcessingTime.observe(duration);
  }

  trackUserRegistration(source: string, country: string): void {
    this.userRegistrations.inc({ source, country });
  }

  trackUserSession(deviceType: string, platform: string, duration: number): void {
    this.userSessions.inc({ device_type: deviceType, platform });
    this.sessionDuration.observe(duration);
  }

  trackProductView(productId: string, category: string, source: string): void {
    this.productViews.inc({ product_id: productId, category, source });
  }

  trackProductSearch(queryType: string): void {
    this.productSearches.inc({ query_type: queryType });
  }

  trackCartAddition(productId: string, category: string): void {
    this.cartAdditions.inc({ product_id: productId, category });
  }

  trackCartRemoval(productId: string, reason: string): void {
    this.cartRemovals.inc({ product_id: productId, reason });
  }

  trackWishlistAddition(productId: string): void {
    this.wishlistAdditions.inc({ product_id: productId });
  }

  trackCheckoutStarted(cartValue: number): void {
    const range = this.getCartValueRange(cartValue);
    this.checkoutStarted.inc({ cart_value_range: range });
  }

  trackCheckoutCompleted(paymentMethod: string): void {
    this.checkoutCompleted.inc({ payment_method: paymentMethod });
  }

  trackCheckoutAbandoned(step: string, reason: string): void {
    this.checkoutAbandoned.inc({ step, reason });
  }

  trackPaymentAttempt(method: string, status: 'success' | 'failure'): void {
    this.paymentAttempts.inc({ method, status });
    
    if (status === 'failure') {
      this.paymentFailures.inc({ method, error_code: 'unknown' });
    }
  }

  updateActiveUsers(count: number, userType: string = 'all'): void {
    this.activeUsers.set({ user_type: userType }, count);
  }

  updateCustomerLifetimeValue(userId: string, value: number): void {
    this.customerLifetimeValue.observe(value);
  }

  updateRepeatPurchaseRate(rate: number): void {
    this.repeatPurchaseRate.set(rate);
  }

  private getCartValueRange(value: number): string {
    if (value < 50) return '0-50';
    if (value < 100) return '50-100';
    if (value < 250) return '100-250';
    if (value < 500) return '250-500';
    if (value < 1000) return '500-1000';
    return '1000+';
  }
}

export const businessMetrics = new BusinessMetrics();
```

**Integrate metrics into application:**

```typescript
// src/api/controllers/order.controller.ts

import { businessMetrics } from '../../infrastructure/analytics/business-metrics';

export class OrderController {
  async createOrder(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const order = await this.orderService.createOrder(req.body);
      
      // Track business metrics
      businessMetrics.trackOrderCreated(order);
      businessMetrics.trackOrderProcessing((Date.now() - startTime) / 1000);
      businessMetrics.trackCheckoutCompleted(order.paymentMethod);
      
      res.status(201).json(order);
    } catch (error) {
      businessMetrics.trackCheckoutAbandoned('payment', error.message);
      throw error;
    }
  }
}
```

### Step 2: Advanced Analytics Dashboards

**Create comprehensive business analytics dashboard:**

```json
{
  "dashboard": {
    "title": "Business Analytics - Executive Overview",
    "tags": ["business", "analytics", "executive"],
    "refresh": "30s",
    "panels": [
      {
        "id": 1,
        "title": "Revenue (24h)",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [{
          "expr": "sum(increase(revenue_total[24h]))",
          "legendFormat": "Total Revenue"
        }],
        "options": {
          "unit": "currencyUSD",
          "colorMode": "value",
          "graphMode": "area",
          "textMode": "value_and_name"
        },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 10000, "color": "yellow" },
                { "value": 50000, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Revenue Trend (7 days)",
        "type": "graph",
        "gridPos": { "x": 6, "y": 0, "w": 12, "h": 4 },
        "targets": [{
          "expr": "sum(increase(revenue_total[1h]))",
          "legendFormat": "Revenue/hour"
        }],
        "yaxes": [{
          "format": "currencyUSD"
        }]
      },
      {
        "id": 3,
        "title": "Orders Created",
        "type": "graph",
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
        "targets": [{
          "expr": "sum(rate(orders_created_total[5m])) * 60",
          "legendFormat": "Orders/min"
        }]
      },
      {
        "id": 4,
        "title": "Conversion Funnel",
        "type": "graph",
        "gridPos": { "x": 0, "y": 4, "w": 12, "h": 6 },
        "targets": [
          {
            "expr": "sum(rate(product_views_total[5m]))",
            "legendFormat": "Product Views"
          },
          {
            "expr": "sum(rate(cart_additions_total[5m]))",
            "legendFormat": "Cart Additions"
          },
          {
            "expr": "sum(rate(checkout_started_total[5m]))",
            "legendFormat": "Checkout Started"
          },
          {
            "expr": "sum(rate(checkout_completed_total[5m]))",
            "legendFormat": "Checkout Completed"
          }
        ],
        "options": {
          "stacking": { "mode": "none" }
        }
      },
      {
        "id": 5,
        "title": "Conversion Rates",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 4, "w": 6, "h": 6 },
        "targets": [
          {
            "expr": "(sum(rate(cart_additions_total[1h])) / sum(rate(product_views_total[1h]))) * 100",
            "legendFormat": "View to Cart"
          },
          {
            "expr": "(sum(rate(checkout_started_total[1h])) / sum(rate(cart_additions_total[1h]))) * 100",
            "legendFormat": "Cart to Checkout"
          },
          {
            "expr": "(sum(rate(checkout_completed_total[1h])) / sum(rate(checkout_started_total[1h]))) * 100",
            "legendFormat": "Checkout to Purchase"
          },
          {
            "expr": "(sum(rate(checkout_completed_total[1h])) / sum(rate(product_views_total[1h]))) * 100",
            "legendFormat": "Overall Conversion"
          }
        ],
        "options": {
          "unit": "percent",
          "min": 0,
          "max": 100,
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "value": 0, "color": "red" },
              { "value": 2, "color": "yellow" },
              { "value": 5, "color": "green" }
            ]
          }
        }
      },
      {
        "id": 6,
        "title": "Average Order Value",
        "type": "stat",
        "gridPos": { "x": 18, "y": 4, "w": 6, "h": 3 },
        "targets": [{
          "expr": "histogram_quantile(0.50, rate(order_value_dollars_bucket[1h]))"
        }],
        "options": {
          "unit": "currencyUSD",
          "colorMode": "value"
        }
      },
      {
        "id": 7,
        "title": "Active Users",
        "type": "graph",
        "gridPos": { "x": 18, "y": 7, "w": 6, "h": 3 },
        "targets": [{
          "expr": "active_users"
        }]
      },
      {
        "id": 8,
        "title": "Top Products (by views)",
        "type": "table",
        "gridPos": { "x": 0, "y": 10, "w": 8, "h": 6 },
        "targets": [{
          "expr": "topk(10, sum by (product_id) (rate(product_views_total[1h])))",
          "format": "table",
          "instant": true
        }],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": { "Time": true },
              "indexByName": { "product_id": 0, "Value": 1 },
              "renameByName": { "product_id": "Product ID", "Value": "Views/hour" }
            }
          }
        ]
      },
      {
        "id": 9,
        "title": "Revenue by Category",
        "type": "piechart",
        "gridPos": { "x": 8, "y": 10, "w": 8, "h": 6 },
        "targets": [{
          "expr": "sum by (product_category) (increase(revenue_total[24h]))"
        }],
        "options": {
          "legend": { "displayMode": "table", "placement": "right" },
          "pieType": "donut"
        }
      },
      {
        "id": 10,
        "title": "Payment Success Rate",
        "type": "gauge",
        "gridPos": { "x": 16, "y": 10, "w": 8, "h": 6 },
        "targets": [{
          "expr": "(sum(rate(payment_attempts_total{status=\"success\"}[1h])) / sum(rate(payment_attempts_total[1h]))) * 100"
        }],
        "options": {
          "unit": "percent",
          "min": 0,
          "max": 100,
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "value": 0, "color": "red" },
              { "value": 95, "color": "yellow" },
              { "value": 98, "color": "green" }
            ]
          }
        }
      },
      {
        "id": 11,
        "title": "Customer Acquisition",
        "type": "graph",
        "gridPos": { "x": 0, "y": 16, "w": 12, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(user_registrations_total[1h])) * 24",
            "legendFormat": "New Users/day"
          },
          {
            "expr": "sum(rate(user_sessions_total[1h])) * 24",
            "legendFormat": "Sessions/day"
          }
        ]
      },
      {
        "id": 12,
        "title": "Session Duration Distribution",
        "type": "heatmap",
        "gridPos": { "x": 12, "y": 16, "w": 12, "h": 4 },
        "targets": [{
          "expr": "sum(rate(session_duration_seconds_bucket[5m])) by (le)",
          "format": "heatmap"
        }]
      }
    ]
  }
}
```

### Step 3: Automated Business Reports

**Create comprehensive daily business report:**

```typescript
// scripts/analytics/business-report-generator.ts

import { PrometheusClient } from './prometheus-client';
import { SlackClient } from './slack-client';

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
  topProducts: Array<{ id: string; name: string; views: number; revenue: number }>;
  topCategories: Array<{ name: string; revenue: number; orders: number }>;
  geography: Array<{ country: string; revenue: number; orders: number }>;
}

export class BusinessReportGenerator {
  private prometheus: PrometheusClient;
  private slack: SlackClient;

  constructor() {
    this.prometheus = new PrometheusClient();
    this.slack = new SlackClient();
  }

  async generateDailyReport(): Promise<string> {
    console.log('Generating daily business report...');
    
    const metrics = await this.collectMetrics();
    const insights = this.generateInsights(metrics);
    
    const report = this.formatReport(metrics, insights);
    
    // Send to Slack
    await this.slack.sendMessage('#business-analytics', report);
    
    // Save to file
    await this.saveReport(report);
    
    return report;
  }

  private async collectMetrics(): Promise<BusinessMetrics> {
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
      this.prometheus.query('sum(increase(revenue_total[24h]))'),
      this.prometheus.query('sum(increase(revenue_total[24h] offset 24h))'),
      this.prometheus.query('sum(increase(revenue_total[24h] offset 7d))'),
      this.prometheus.query('sum(increase(orders_created_total[24h]))'),
      this.prometheus.query('sum(increase(orders_created_total{status="completed"}[24h]))'),
      this.prometheus.query('sum(increase(orders_created_total{status="pending"}[24h]))'),
      this.prometheus.query('sum(increase(orders_created_total{status="failed"}[24h]))'),
      this.prometheus.query('histogram_quantile(0.50, rate(order_value_dollars_bucket[24h]))'),
      this.prometheus.query('sum(increase(user_registrations_total[24h]))'),
      this.prometheus.query('avg_over_time(active_users[24h])'),
      this.prometheus.query('max_over_time(active_users[24h])'),
      this.prometheus.query('sum(increase(product_views_total[24h]))'),
      this.prometheus.query('sum(increase(cart_additions_total[24h]))'),
      this.prometheus.query('sum(increase(checkout_started_total[24h]))'),
      this.prometheus.query('sum(increase(checkout_completed_total[24h]))'),
    ]);

    const topProducts = await this.getTopProducts();
    const topCategories = await this.getTopCategories();
    const geography = await this.getGeographyBreakdown();

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
      topProducts,
      topCategories,
      geography,
    };
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
  - ✅ Completed: ${metrics.orders.completed} (${((metrics.orders.completed/metrics.orders.total)*100).toFixed(1)}%)
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

## 🏆 Top Products (by revenue)
${metrics.topProducts.slice(0, 5).map((p, i) => 
  `${i+1}. ${p.name}: $${p.revenue.toLocaleString()} (${p.views} views)`
).join('\n')}

## 📦 Top Categories
${metrics.topCategories.slice(0, 5).map((c, i) => 
  `${i+1}. ${c.name}: $${c.revenue.toLocaleString()} (${c.orders} orders)`
).join('\n')}

## 🌍 Geography Breakdown
${metrics.geography.slice(0, 5).map((g, i) => 
  `${i+1}. ${g.country}: $${g.revenue.toLocaleString()} (${g.orders} orders)`
).join('\n')}

## 💡 Insights & Recommendations
${insights.map((insight, i) => `${i+1}. ${insight}`).join('\n')}

---
*Generated automatically at ${new Date().toISOString()}*
`;
  }

  private generateInsights(metrics: BusinessMetrics): string[] {
    const insights: string[] = [];

    // Revenue insights
    if (metrics.revenue.change < -10) {
      insights.push('⚠️  **Revenue Alert:** Revenue down ${Math.abs(metrics.revenue.change).toFixed(1)}% vs yesterday - investigate pricing, marketing, or technical issues');
    } else if (metrics.revenue.change > 20) {
      insights.push('🎉 **Revenue Spike:** Revenue up ${metrics.revenue.change.toFixed(1)}% vs yesterday - analyze what drove this increase');
    }

    // Conversion insights
    if (metrics.conversion.overall < 2) {
      insights.push('⚠️  **Low Conversion:** Overall conversion rate is ${metrics.conversion.overall.toFixed(2)}% - optimize checkout flow and reduce friction');
    }

    if (metrics.conversion.viewToCart < 5) {
      insights.push('📉 **Low Cart Addition Rate:** Only ${metrics.conversion.viewToCart.toFixed(1)}% of views convert to cart - improve product pages and pricing');
    }

    if (metrics.conversion.checkoutToPurchase < 70) {
      insights.push('🛒 **Checkout Abandonment:** ${(100 - metrics.conversion.checkoutToPurchase).toFixed(1)}% checkout abandonment - simplify checkout and reduce payment failures');
    }

    // Order insights
    if (metrics.orders.failed > metrics.orders.total * 0.05) {
      insights.push('❌ **High Order Failure Rate:** ${((metrics.orders.failed/metrics.orders.total)*100).toFixed(1)}% of orders failed - check payment processing and inventory');
    }

    // User insights
    if (metrics.users.new < 100) {
      insights.push('📊 **Low User Acquisition:** Only ${metrics.users.new} new users - increase marketing efforts');
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

  private async getTopProducts(): Promise<any[]> {
    // Query top products by revenue
    const results = await this.prometheus.query(
      'topk(10, sum by (product_id) (increase(revenue_total[24h])))'
    );
    
    // Fetch product details from database
    return Promise.all(results.map(async (r: any) => ({
      id: r.metric.product_id,
      name: await this.getProductName(r.metric.product_id),
      revenue: r.value[1],
      views: await this.getProductViews(r.metric.product_id),
    })));
  }

  private async getTopCategories(): Promise<any[]> {
    const results = await this.prometheus.query(
      'topk(10, sum by (product_category) (increase(revenue_total[24h])))'
    );
    
    return results.map((r: any) => ({
      name: r.metric.product_category,
      revenue: r.value[1],
      orders: 0, // TODO: fetch from separate query
    }));
  }

  private async getGeographyBreakdown(): Promise<any[]> {
    const results = await this.prometheus.query(
      'topk(10, sum by (country) (increase(revenue_total[24h])))'
    );
    
    return results.map((r: any) => ({
      country: r.metric.country,
      revenue: r.value[1],
      orders: 0, // TODO: fetch from separate query
    }));
  }

  private async saveReport(report: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const filename = `reports/business-report-${date}.md`;
    await fs.writeFile(filename, report);
    console.log(`Report saved to ${filename}`);
  }
}
```

**Schedule daily report generation:**

```yaml
# k8s/jobs/business-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-business-report
  namespace: ecommerce-prod
spec:
  schedule: "0 9 * * *"  # Daily at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: report-generator
              image: ecommerce/analytics:latest
              command: ["node", "scripts/analytics/business-report-generator.js"]
              env:
                - name: PROMETHEUS_URL
                  value: "http://prometheus:9090"
                - name: SLACK_WEBHOOK_URL
                  valueFrom:
                    secretKeyRef:
                      name: slack-credentials
                      key: webhook-url
          restartPolicy: OnFailure
```

### Step 4: Real-Time Analytics API

**Create analytics API endpoints:**

```typescript
// src/api/controllers/analytics.controller.ts

import { Request, Response } from 'express';
import { PrometheusClient } from '../../infrastructure/analytics/prometheus-client';

export class AnalyticsController {
  private prometheus: PrometheusClient;

  constructor() {
    this.prometheus = new PrometheusClient();
  }

  async getRealtimeMetrics(req: Request, res: Response): Promise<void> {
    const metrics = {
      activeUsers: await this.prometheus.query('active_users'),
      ordersPerMinute: await this.prometheus.query('sum(rate(orders_created_total[1m])) * 60'),
      revenuePerHour: await this.prometheus.query('sum(rate(revenue_total[1h]))'),
      conversionRate: await this.prometheus.query(
        '(sum(rate(checkout_completed_total[5m])) / sum(rate(product_views_total[5m]))) * 100'
      ),
    };

    res.json(metrics);
  }

  async getConversionFunnel(req: Request, res: Response): Promise<void> {
    const timeRange = req.query.timeRange || '1h';
    
    const funnel = {
      productViews: await this.prometheus.query(`sum(increase(product_views_total[${timeRange}]))`),
      cartAdditions: await this.prometheus.query(`sum(increase(cart_additions_total[${timeRange}]))`),
      checkoutsStarted: await this.prometheus.query(`sum(increase(checkout_started_total[${timeRange}]))`),
      checkoutsCompleted: await this.prometheus.query(`sum(increase(checkout_completed_total[${timeRange}]))`),
    };

    res.json(funnel);
  }

  async getTopProducts(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 10;
    const metric = req.query.metric || 'views';
    
    let query: string;
    if (metric === 'views') {
      query = `topk(${limit}, sum by (product_id) (rate(product_views_total[1h])))`;
    } else if (metric === 'revenue') {
      query = `topk(${limit}, sum by (product_id) (rate(revenue_total[1h])))`;
    }

    const results = await this.prometheus.query(query);
    res.json(results);
  }

  async getRevenueBreakdown(req: Request, res: Response): Promise<void> {
    const groupBy = req.query.groupBy || 'category';
    
    const breakdown = await this.prometheus.query(
      `sum by (${groupBy}) (increase(revenue_total[24h]))`
    );

    res.json(breakdown);
  }
}
```

---

## Testing

**Test analytics instrumentation:**

```typescript
// tests/analytics/business-metrics.test.ts

import { businessMetrics } from '../../src/infrastructure/analytics/business-metrics';
import { register } from 'prom-client';

describe('Business Metrics', () => {
  beforeEach(() => {
    register.clear();
  });

  it('should track order creation', async () => {
    const order = {
      status: 'completed',
      paymentMethod: 'credit_card',
      total: 150.00,
      currency: 'USD',
      category: 'electronics',
      shippingAddress: { country: 'US' },
    };

    businessMetrics.trackOrderCreated(order);

    const metrics = await register.metrics();
    expect(metrics).toContain('orders_created_total');
    expect(metrics).toContain('revenue_total');
  });

  it('should track conversion funnel', async () => {
    businessMetrics.trackProductView('product-123', 'electronics', 'search');
    businessMetrics.trackCartAddition('product-123', 'electronics');
    businessMetrics.trackCheckoutStarted(150);
    businessMetrics.trackCheckoutCompleted('credit_card');

    const metrics = await register.metrics();
    expect(metrics).toContain('product_views_total');
    expect(metrics).toContain('cart_additions_total');
    expect(metrics).toContain('checkout_started_total');
    expect(metrics).toContain('checkout_completed_total');
  });
});
```

---

## Deliverables

- [ ] Business metrics instrumented in all services
- [ ] Analytics dashboards created (Executive, Product, Marketing)
- [ ] Daily business reports automated
- [ ] Real-time analytics API implemented
- [ ] Conversion funnel tracking operational
- [ ] Product analytics implemented
- [ ] Revenue tracking by category/geography
- [ ] Customer lifetime value tracking
- [ ] A/B testing framework (optional)

---

## Success Criteria

| Criteria | Target | Status |
|----------|--------|--------|
| Metrics coverage | 100% of key events | ___ |
| Dashboard refresh rate | < 30s | ___ |
| Report delivery | Daily at 9 AM | ___ |
| API response time | < 500ms | ___ |
| Data accuracy | > 99% | ___ |

---

**Task Owner:** Product + Engineering + Data Team  
**Reviewer:** Product Manager + CTO  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
