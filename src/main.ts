import dotenv from 'dotenv';
import { connectDatabase } from '@infrastructure/database/mongodb/connection';
import { startServer } from '@infrastructure/http/server';
import { initializeOutboxPublisher } from '@infrastructure/outbox-publisher.module';
import { initializeConsumerGroups } from '@infrastructure/messaging/consumer-groups.module';
import { ServiceRegistry } from '@infrastructure/service-mesh/service-registry';

// Load environment variables
dotenv.config();

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting E-Commerce Backend...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Connect to database
    await connectDatabase();

    // Initialize outbox publisher for reliable event publishing
    await initializeOutboxPublisher();

    // Initialize consumer groups for event consumption
    await initializeConsumerGroups();

    // Register with Consul
    const serviceRegistry = new ServiceRegistry(
      process.env.CONSUL_HOST,
      process.env.CONSUL_PORT
    );
    const port = process.env.PORT || 3000;
    await serviceRegistry.register('core-service', Number(port), '/health');
    console.log('✓ Registered with Consul');

    // Start HTTP server
    startServer();
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
main();
