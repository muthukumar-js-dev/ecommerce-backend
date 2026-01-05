import { Application } from 'express';
// Use relative path require for app to be safe
const { createApp } = require('../../src/infrastructure/http/app');
// Import DB helper from source - use require to avoid import issues if any
const { connectToTestDB, disconnectTestDB, clearTestDB } = require('../../src/shared/utils/test-db');

let app: Application;

/**
 * Setup integration test environment
 * Connects to the Global Mongo Memory Server started by Jest Global Setup
 */
export async function setupIntegrationTests(): Promise<Application> {
  try {
    let mongoUri = process.env.MONGO_URI;

    // If not in env (worker process), try reading from file shared by global setup
    if (!mongoUri) {
      const fs = require('fs');
      const path = require('path');
      const uriPath = path.join(__dirname, '..', 'mongo-uri.json'); // Up one level to tests/ dir
      if (fs.existsSync(uriPath)) {
        const config = JSON.parse(fs.readFileSync(uriPath, 'utf8'));
        mongoUri = config.mongoUri;
        process.env.MONGO_URI = mongoUri;
      }
    }

    if (!mongoUri) {
      throw new Error('MONGO_URI not defined in environment or config file. Check global-setup.js');
    }

    // Connect Mongoose via helper
    await connectToTestDB(mongoUri);

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
  await disconnectTestDB();
}

/**
 * Clear all data from the database
 * Useful to run between tests
 */
export async function clearDatabase(): Promise<void> {
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
    email: `test-${Date.now()}@example.com`,
    password: 'Password123!',
  };
}

/**
 * Create test product data
 */
export function createTestProduct() {
  return {
    title: `Test Product ${Date.now()}`,
    description: 'Test product description',
    price: 1000,
    inventory: 100,
    category: 'Electronics',
  };
}

/**
 * Create test order data
 */
export function createTestOrder() {
  return {
    shippingAddress: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'Test Country',
    },
    paymentMethodId: 'pm_test_123',
  };
}
