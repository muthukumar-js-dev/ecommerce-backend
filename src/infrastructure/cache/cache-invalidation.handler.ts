import { ProductCacheService } from '@application/cache/product-cache.service';
import { UserCacheService } from '@application/cache/user-cache.service';

export interface DomainEvent {
    eventName: string;
    payload: any;
    timestamp: Date;
}

export class CacheInvalidationHandler {
    constructor(
        private productCacheService: ProductCacheService,
        private userCacheService: UserCacheService
    ) { }

    /**
     * Handle domain events and invalidate cache accordingly
     */
    async handle(event: DomainEvent): Promise<void> {
        console.log(`Processing cache invalidation for event: ${(event as any).eventName}`);

        try {
            switch ((event as any).eventName) {
                // Product events
                case 'ProductCreated':
                    await this.handleProductCreated((event as any).payload);
                    break;

                case 'ProductUpdated':
                    await this.handleProductUpdated((event as any).payload);
                    break;

                case 'ProductDeleted':
                    await this.handleProductDeleted((event as any).payload);
                    break;

                case 'ProductPriceChanged':
                    await this.handleProductPriceChanged((event as any).payload);
                    break;

                case 'ProductStockUpdated':
                    await this.handleProductStockUpdated((event as any).payload);
                    break;

                // User events
                case 'UserCreated':
                    // No cache to invalidate for new users
                    break;

                case 'UserUpdated':
                    await this.handleUserUpdated((event as any).payload);
                    break;

                case 'UserDeleted':
                    await this.handleUserDeleted((event as any).payload);
                    break;

                case 'UserEmailChanged':
                    await this.handleUserEmailChanged((event as any).payload);
                    break;

                // Category events
                case 'CategoryUpdated':
                    await this.handleCategoryUpdated((event as any).payload);
                    break;

                default:
                    console.log(`No cache invalidation handler for event: ${(event as any).eventName}`);
            }
        } catch (error: unknown) {
            console.error(`Cache invalidation failed for event ${(event as any).eventName}:`, error);
            // Don't throw - cache invalidation failures shouldn't break the application
        }
    }

    // Product event handlers

    private async handleProductCreated(_payload: unknown): Promise<void> {
        // Invalidate product lists as they now need to include the new product
        await this.productCacheService.invalidateAllLists();
    }

    private async handleProductUpdated(payload: any): Promise<void> {
        const { productId } = payload;
        await this.productCacheService.invalidateProduct(productId);
    }

    private async handleProductDeleted(payload: any): Promise<void> {
        const { productId } = payload;
        await this.productCacheService.invalidateProduct(productId);
    }

    private async handleProductPriceChanged(payload: any): Promise<void> {
        const { productId } = payload;
        await this.productCacheService.invalidateProduct(productId);
    }

    private async handleProductStockUpdated(payload: any): Promise<void> {
        const { productId } = payload;
        await this.productCacheService.invalidateProduct(productId);
    }

    // User event handlers

    private async handleUserUpdated(payload: any): Promise<void> {
        const { userId } = payload;
        await this.userCacheService.invalidateUser(userId);
    }

    private async handleUserDeleted(payload: any): Promise<void> {
        const { userId } = payload;
        await this.userCacheService.invalidateUser(userId);
    }

    private async handleUserEmailChanged(payload: any): Promise<void> {
        const { userId, oldEmail, newEmail } = payload;

        // Invalidate both old and new email caches
        await this.userCacheService.invalidateUser(userId);
        await this.userCacheService.invalidateUserByEmail(oldEmail);
        await this.userCacheService.invalidateUserByEmail(newEmail);
    }

    // Category event handlers

    private async handleCategoryUpdated(payload: any): Promise<void> {
        const { categoryId } = payload;
        await this.productCacheService.invalidateCategoryLists(categoryId);
    }
}
