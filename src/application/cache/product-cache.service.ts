import { CacheService } from '@infrastructure/cache/cache.service';

export class ProductCacheService {
    private readonly CACHE_PREFIX = 'product:';
    private readonly LIST_PREFIX = 'product:list:';
    private readonly CACHE_TTL = 300; // 5 minutes

    constructor(private cacheService: CacheService) { }

    /**
     * Get product by ID with caching
     */
    async getProduct(
        productId: string,
        fetchFn: () => Promise<any>
    ): Promise<any> {
        const cacheKey = `${this.CACHE_PREFIX}${productId}`;

        return this.cacheService.getOrSet(
            cacheKey,
            fetchFn,
            this.CACHE_TTL
        );
    }

    /**
     * Get products list with caching
     */
    async getProducts(
        page: number,
        limit: number,
        fetchFn: () => Promise<any[]>
    ): Promise<any[]> {
        const cacheKey = `${this.LIST_PREFIX}${page}:${limit}`;

        return this.cacheService.getOrSet(
            cacheKey,
            fetchFn,
            this.CACHE_TTL
        );
    }

    /**
     * Get products by category with caching
     */
    async getProductsByCategory(
        categoryId: string,
        page: number,
        limit: number,
        fetchFn: () => Promise<any[]>
    ): Promise<any[]> {
        const cacheKey = `${this.LIST_PREFIX}category:${categoryId}:${page}:${limit}`;

        return this.cacheService.getOrSet(
            cacheKey,
            fetchFn,
            this.CACHE_TTL
        );
    }

    /**
     * Search products with caching
     */
    async searchProducts(
        query: string,
        page: number,
        limit: number,
        fetchFn: () => Promise<any[]>
    ): Promise<any[]> {
        const cacheKey = `${this.LIST_PREFIX}search:${query}:${page}:${limit}`;

        return this.cacheService.getOrSet(
            cacheKey,
            fetchFn,
            this.CACHE_TTL
        );
    }

    /**
     * Invalidate product cache
     */
    async invalidateProduct(productId: string): Promise<void> {
        const cacheKey = `${this.CACHE_PREFIX}${productId}`;
        await this.cacheService.del(cacheKey);

        // Invalidate all list caches as they might contain this product
        await this.invalidateAllLists();
    }

    /**
     * Invalidate all product lists
     */
    async invalidateAllLists(): Promise<void> {
        await this.cacheService.invalidatePattern(`${this.LIST_PREFIX}*`);
    }

    /**
     * Invalidate category lists
     */
    async invalidateCategoryLists(categoryId: string): Promise<void> {
        await this.cacheService.invalidatePattern(`${this.LIST_PREFIX}category:${categoryId}:*`);
    }

    /**
     * Warm up cache for popular products
     */
    async warmUpCache(
        productIds: string[],
        fetchFn: (id: string) => Promise<any>
    ): Promise<void> {
        console.log(`Warming up cache for ${productIds.length} products`);

        await Promise.all(
            productIds.map(async (productId) => {
                try {
                    await this.getProduct(productId, () => fetchFn(productId));
                } catch (error: unknown) {
                    console.error(`Failed to warm up cache for product ${productId}:`, error);
                }
            })
        );

        console.log('Cache warm-up complete');
    }
}
