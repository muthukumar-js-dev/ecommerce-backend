# Business Analytics & Metrics Guide

## Overview

This guide provides comprehensive documentation for business analytics and metrics tracking using Prometheus to measure product success, user behavior, revenue metrics, and conversion funnels.

---

## Business Metrics

### Revenue Metrics

- **`revenue_total`** - Total revenue in dollars
  - Labels: `currency`, `product_category`, `country`
  - Type: Counter

- **`order_value_dollars`** - Order value distribution
  - Labels: `currency`, `category`
  - Type: Histogram

### Order Metrics

- **`orders_created_total`** - Total orders created
  - Labels: `status`, `payment_method`, `country`
  - Type: Counter

- **`order_processing_duration_seconds`** - Order processing time
  - Type: Histogram

### User Metrics

- **`active_users`** - Currently active users
  - Labels: `user_type`
  - Type: Gauge

- **`user_registrations_total`** - Total user registrations
  - Labels: `source`, `country`
  - Type: Counter

- **`user_sessions_total`** - Total user sessions
  - Labels: `device_type`, `platform`
  - Type: Counter

### Conversion Metrics

- **`product_views_total`** - Product views
  - Labels: `product_id`, `category`, `source`
  - Type: Counter

- **`cart_additions_total`** - Cart additions
  - Labels: `product_id`, `category`
  - Type: Counter

- **`checkout_started_total`** - Checkouts started
  - Labels: `cart_value_range`
  - Type: Counter

- **`checkout_completed_total`** - Checkouts completed
  - Labels: `payment_method`
  - Type: Counter

---

## Usage

### Tracking Business Events

```typescript
import { businessMetrics } from '../infrastructure/analytics/business-metrics';

// Track order creation
businessMetrics.trackOrderCreated(order);

// Track user registration
businessMetrics.trackUserRegistration('google', 'US');

// Track product view
businessMetrics.trackProductView('product-123', 'electronics', 'search');

// Track conversion funnel
businessMetrics.trackCartAddition('product-123', 'electronics');
businessMetrics.trackCheckoutStarted(150.00);
businessMetrics.trackCheckoutCompleted('credit_card');
```

### Querying Metrics

```promql
# Total revenue (24h)
sum(increase(revenue_total[24h]))

# Conversion rate
(sum(rate(checkout_completed_total[1h])) / sum(rate(product_views_total[1h]))) * 100

# Average order value
histogram_quantile(0.50, rate(order_value_dollars_bucket[24h]))

# Active users
active_users

# Top products by views
topk(10, sum by (product_id) (rate(product_views_total[1h])))
```

---

## Analytics API

### Endpoints

**GET /api/analytics/revenue**
- Query params: `period` (default: 24h)
- Returns: Revenue, orders, avg order value

**GET /api/analytics/conversion**
- Query params: `period` (default: 1h)
- Returns: Conversion funnel and rates

**GET /api/analytics/users**
- Query params: `period` (default: 24h)
- Returns: User metrics

**GET /api/analytics/top-products**
- Query params: `period` (default: 24h), `limit` (default: 10)
- Returns: Top products by views

**GET /api/analytics/dashboard**
- Returns: Key dashboard metrics

### Example

```bash
# Get revenue metrics
curl http://localhost:3000/api/analytics/revenue?period=7d

# Get conversion funnel
curl http://localhost:3000/api/analytics/conversion?period=1h

# Get top products
curl http://localhost:3000/api/analytics/top-products?limit=5
```

---

## Daily Business Reports

### Generate Report

```bash
# Run daily report
npm run analytics:report
```

### Report Contents

- Revenue (24h) with trends
- Order statistics
- User metrics
- Conversion funnel
- Insights and recommendations

### Automated Delivery

Reports are automatically sent to Slack #business-analytics channel daily at 9 AM.

---

## Key Performance Indicators (KPIs)

### Revenue KPIs

- **Daily Revenue** - Total revenue in 24h
- **Revenue Growth** - % change vs yesterday/last week
- **Average Order Value (AOV)** - Median order value
- **Revenue Per User** - Total revenue / active users

### Conversion KPIs

- **Overall Conversion Rate** - Checkouts / Product Views
- **View to Cart Rate** - Cart Additions / Product Views
- **Cart to Checkout Rate** - Checkouts Started / Cart Additions
- **Checkout to Purchase Rate** - Checkouts Completed / Checkouts Started

### User KPIs

- **Daily Active Users (DAU)** - Active users per day
- **New User Registrations** - New users per day
- **Session Duration** - Average session length
- **Sessions Per User** - Total sessions / active users

### Product KPIs

- **Product Views** - Total product page views
- **Cart Addition Rate** - % of views that add to cart
- **Top Products** - Most viewed/purchased products
- **Category Performance** - Revenue by category

---

## Best Practices

### Do's ✅

- Track all key business events
- Use consistent label naming
- Monitor metric cardinality
- Set up alerts for anomalies
- Review reports daily
- Act on insights
- A/B test changes

### Don'ts ❌

- Don't track PII in metrics
- Don't create high-cardinality labels
- Don't ignore conversion drops
- Don't skip daily reviews
- Don't make changes without data

---

## Troubleshooting

### Issue: Metrics Not Appearing

**Solutions:**
```bash
# Check if metrics are being exported
curl http://localhost:3000/metrics | grep business

# Verify Prometheus is scraping
curl http://prometheus:9090/api/v1/targets

# Check metric registration
```

### Issue: Inaccurate Conversion Rates

**Possible Causes:**
- Missing tracking calls
- Incorrect event ordering
- Bot traffic

**Solutions:**
- Verify all tracking calls are in place
- Add bot filtering
- Check event timestamps

---

## Quick Reference

### Commands

```bash
# Generate daily report
npm run analytics:report

# Query metrics
curl http://prometheus:9090/api/v1/query?query=revenue_total

# Test analytics API
curl http://localhost:3000/api/analytics/dashboard
```

### Files

- Business Metrics: `src/infrastructure/analytics/business-metrics.ts`
- Report Generator: `scripts/analytics/business-report-generator.ts`
- Analytics API: `src/api/controllers/analytics.controller.ts`

---

**Last Updated:** 2026-01-08  
**Version:** 1.0.0
