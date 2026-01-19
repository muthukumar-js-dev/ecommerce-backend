import { Redis } from 'ioredis';

interface FeatureFlag {
    name: string;
    enabled: boolean;
    percentage: number;
    targetUsers?: string[];
    targetSegments?: string[];
    variants?: Record<string, unknown>;
}

export class FeatureFlagService {
    private redis: Redis;

    constructor() {
        this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    }

    async isEnabled(flagName: string, userId?: string, context?: any): Promise<boolean> {
        const flag = await this.getFlag(flagName);

        if (!flag?.enabled) {return false;}

        // User targeting
        if (flag.targetUsers && userId) {
            return flag.targetUsers.includes(userId);
        }

        // Segment targeting
        if (flag.targetSegments && context?.segment) {
            return flag.targetSegments.includes(context.segment);
        }

        // Percentage rollout
        if (flag.percentage < 100) {
            const hash = this.hashUserId(userId ?? 'anonymous');
            return hash % 100 < flag.percentage;
        }

        return true;
    }

    async getVariant(flagName: string, userId?: string): Promise<string> {
        const flag = await this.getFlag(flagName);

        if (!flag?.variants) {return 'control';}

        const hash = this.hashUserId(userId ?? 'anonymous');
        const variantKeys = Object.keys(flag.variants);
        const index = hash % variantKeys.length;

        return variantKeys[index] ?? 'control';
    }

    async trackFeatureUsage(flagName: string, _userId: string, variant?: string): Promise<void> {
        const key = `feature_usage:${flagName}:${variant ?? 'default'}`;
        await this.redis.incr(key);
        await this.redis.expire(key, 86400 * 30); // 30 days
    }

    async setFlag(flag: FeatureFlag): Promise<void> {
        const key = `feature_flag:${flag.name}`;
        await this.redis.set(key, JSON.stringify(flag));
    }

    async deleteFlag(flagName: string): Promise<void> {
        const key = `feature_flag:${flagName}`;
        await this.redis.del(key);
    }

    private async getFlag(name: string): Promise<FeatureFlag | null> {
        const data = await this.redis.get(`feature_flag:${name}`);
        return data ? JSON.parse(data) : null;
    }

    private hashUserId(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}

// Usage examples
export const featureFlags = new FeatureFlagService();

/*
// Simple feature flag
if (await featureFlags.isEnabled('new_checkout_flow', userId)) {
    return newCheckoutFlow(order);
} else {
    return oldCheckoutFlow(order);
}

// A/B testing with variants
const variant = await featureFlags.getVariant('checkout_button_color', userId);
const buttonColor = variant === 'red' ? '#FF0000' : '#0000FF';

// Track usage
await featureFlags.trackFeatureUsage('new_checkout_flow', userId, variant);

// Set a new flag
await featureFlags.setFlag({
    name: 'new_feature',
    enabled: true,
    percentage: 50,
    targetUsers: ['user1', 'user2'],
    variants: { red: {}, blue: {} }
});
*/
