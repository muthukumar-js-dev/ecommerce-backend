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
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI not defined in environment. Check global-setup.js');
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
