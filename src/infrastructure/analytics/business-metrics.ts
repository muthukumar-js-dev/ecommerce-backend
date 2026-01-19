import { Counter, Histogram, Gauge } from 'prom-client';

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

    // Tracking methods
    trackOrderCreated(order: any): void {
        this.ordersCreated.inc({
            status: order.status,
            payment_method: order.paymentMethod,
            country: order.shippingAddress?.country ?? 'unknown',
        });

        this.orderValue.observe(
            { currency: order.currency ?? 'USD', category: order.category ?? 'general' },
            order.total
        );

        this.revenue.inc(
            {
                currency: order.currency ?? 'USD',
                product_category: order.category ?? 'general',
                country: order.shippingAddress?.country ?? 'unknown',
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

    trackPaymentAttempt(method: string, status: 'success' | 'failure', errorCode?: string): void {
        this.paymentAttempts.inc({ method, status });

        if (status === 'failure') {
            this.paymentFailures.inc({ method, error_code: errorCode ?? 'unknown' });
        }
    }

    updateActiveUsers(count: number, userType: string = 'all'): void {
        this.activeUsers.set({ user_type: userType }, count);
    }

    updateCustomerLifetimeValue(value: number): void {
        this.customerLifetimeValue.observe(value);
    }

    updateRepeatPurchaseRate(rate: number): void {
        this.repeatPurchaseRate.set(rate);
    }

    private getCartValueRange(value: number): string {
        if (value < 50) {return '0-50';}
        if (value < 100) {return '50-100';}
        if (value < 250) {return '100-250';}
        if (value < 500) {return '250-500';}
        if (value < 1000) {return '500-1000';}
        return '1000+';
    }
}

export const businessMetrics = new BusinessMetrics();
