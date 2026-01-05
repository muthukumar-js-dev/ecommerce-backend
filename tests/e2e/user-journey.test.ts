import { test, expect, chromium, Browser, Page } from '@playwright/test';

test.describe('E2E User Journey', () => {
    let browser: Browser;
    let page: Page;

    test.beforeAll(async () => {
        browser = await chromium.launch();
    });

    test.afterAll(async () => {
        await browser.close();
    });

    test.beforeEach(async () => {
        page = await browser.newPage();
    });

    test.afterEach(async () => {
        await page.close();
    });

    test('should complete full shopping journey', async () => {
        // 1. Navigate to homepage
        await page.goto('http://localhost:3000');
        await expect(page).toHaveTitle(/E-Commerce/);

        // 2. Register new user
        await page.click('text=Sign Up');
        await page.fill('[name=name]', 'Test User');
        await page.fill('[name=email]', `test${Date.now()}@example.com`);
        await page.fill('[name=password]', 'Password123!');
        await page.click('button[type=submit]');

        // Wait for registration success
        await page.waitForSelector('.dashboard, .products, .home', { timeout: 5000 });

        // 3. Browse products
        await page.goto('http://localhost:3000/products');
        await page.waitForSelector('.product-list, .products', { timeout: 5000 });

        // 4. View product details
        const firstProduct = page.locator('.product-card, .product-item').first();
        await firstProduct.click();
        await page.waitForSelector('.product-details, .product-info', { timeout: 5000 });

        // 5. Add to cart
        await page.click('text=Add to Cart');
        await page.waitForSelector('.cart-badge, .cart-count', { timeout: 5000 });

        // Verify cart badge shows 1 item
        const cartBadge = page.locator('.cart-badge, .cart-count');
        await expect(cartBadge).toContainText('1');

        // 6. View cart
        await page.click('.cart-icon, .cart-link');
        await page.waitForSelector('.cart-items, .cart-list', { timeout: 5000 });

        // Verify cart has items
        const cartItems = page.locator('.cart-item, .cart-product');
        await expect(cartItems).toHaveCount(1);

        // 7. Proceed to checkout
        await page.click('text=Checkout, text=Proceed to Checkout');
        await page.waitForSelector('.checkout, .checkout-form', { timeout: 5000 });

        // 8. Fill shipping information
        await page.fill('[name=street]', '123 Test Street');
        await page.fill('[name=city]', 'Test City');
        await page.fill('[name=state]', 'TS');
        await page.fill('[name=postalCode]', '12345');
        await page.fill('[name=country]', 'Test Country');

        // 9. Fill payment information (test mode)
        await page.fill('[name=paymentMethodId]', 'pm_test_123');

        // 10. Place order
        await page.click('text=Place Order, text=Complete Order');

        // 11. Verify order confirmation
        await page.waitForSelector('.order-confirmation, .success-message', { timeout: 10000 });

        const orderNumber = await page.locator('.order-number, .order-id').textContent();
        expect(orderNumber).toBeDefined();
        expect(orderNumber).toMatch(/ORD-|ORDER-/);
    });

    test('should handle product search', async () => {
        await page.goto('http://localhost:3000');

        // Search for product
        await page.fill('[name=search], input[type=search]', 'Test Product');
        await page.press('[name=search], input[type=search]', 'Enter');

        // Wait for search results
        await page.waitForSelector('.search-results, .products', { timeout: 5000 });

        // Verify results are displayed
        const results = page.locator('.product-card, .product-item');
        const count = await results.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should handle cart operations', async () => {
        // Login first
        await page.goto('http://localhost:3000/login');
        await page.fill('[name=email]', 'test@example.com');
        await page.fill('[name=password]', 'Password123!');
        await page.click('button[type=submit]');

        await page.waitForNavigation();

        // Add product to cart
        await page.goto('http://localhost:3000/products');
        await page.waitForSelector('.product-card, .product-item', { timeout: 5000 });

        const product = page.locator('.product-card, .product-item').first();
        await product.click();

        await page.click('text=Add to Cart');
        await page.waitForTimeout(1000);

        // Go to cart
        await page.goto('http://localhost:3000/cart');
        await page.waitForSelector('.cart-items, .cart-list', { timeout: 5000 });

        // Update quantity
        const quantityInput = page.locator('input[type=number], .quantity-input').first();
        await quantityInput.fill('3');
        await page.click('text=Update, .update-button');
        await page.waitForTimeout(1000);

        // Remove item
        await page.click('text=Remove, .remove-button');
        await page.waitForTimeout(1000);

        // Verify cart is empty
        const emptyMessage = page.locator('text=Your cart is empty, .empty-cart');
        await expect(emptyMessage).toBeVisible();
    });
});
