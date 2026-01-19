import { Application } from 'express';
// Use relative path require for app to be safe
// App lazy loaded in setup
// const { createApp } = require('../../src/infrastructure/http/app');
// Import DB helper from source - use require to avoid import issues if any
const { connectToTestDB, disconnectTestDB, clearTestDB } = require('../../src/shared/utils/test-db');
import { getOutboxPublisherModule } from '../../src/infrastructure/outbox-publisher.module';

let app: Application;

/**
 * Setup integration test environment
 * Connects to the Global Mongo Memory Server started by Jest Global Setup
 */
// Initialize collections to avoid "catalog changes" in transactions
const mongoose = require('mongoose');
// Ensure all models are registered (dependent on import order, but usually safe in integration tests)
// We can also force load key models if needed, but assuming they are imported by test suites.
if (mongoose.models) {
  for (const modelName of Object.keys(mongoose.models)) {
    try {
      await mongoose.models[modelName].createCollection();
    } catch (err: any) {
      // Ignore if collection already exists or other minor issue
      if (err.codeName !== 'NamespaceExists') {
        console.warn(`Warning: Failed to create collection for ${modelName}:`, err.message);
      }
    }
  }
}

// Lazy load app to ensure env vars are set
const { createApp } = require('../../src/infrastructure/http/app');
app = createApp();
return app;
  } catch (error) {
  console.error('Error in setupIntegrationTests:', error);
  throw error;
}
}

/**
 * Teardown integration test environment
 * Disconnects mongoose but keeps Server running (Global Teardown handles it)
 */
export async function teardownIntegrationTests(): Promise<void> {
  // Stop background services
  const outboxModule = getOutboxPublisherModule();
  await outboxModule.stop();

  await disconnectTestDB();
}

/**
 * Clear all data from the database
 * Useful to run between tests
 */
export async function clearDatabase(): Promise<void> {
  console.log('[Setup] Clearing Database...');
  await clearTestDB();
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create test user data
 */
export function createTestUser() {
  return {
    name: 'Test User',
    email: `test-${Date.now()}-${Math.floor(Math.random() * 1000000000)}@example.com`,
    password: 'Password123!',
  };
}

/**
 * Create test product data
 */
export function createTestProduct() {
  return {
    title: `Test Product ${Date.now()}`,
    description: 'Test product description with at least 10 characters',
    actualPrice: 1200,
    sellingPrice: 1000,
    inventory: 100,
    category: 'Electronics',
    brand: 'Test Brand',
    sku: `SKU-${Date.now()}`,
    pid: `PID-${Date.now()}`,
    images: ['http://example.com/image.jpg'],
    productDetails: []
  };
}

/**
 * Create test order data
 */
export function createTestOrder() {
  return {
    // Note: Use a mock or existing ID appropriate for the test environment
    // The use case expects shippingAddressId, not the full object
    shippingAddressId: 'addr_test_123',
    paymentMethod: 'card',
  };
}
