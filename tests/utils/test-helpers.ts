import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * In-memory MongoDB for testing
 */
let mongoServer: MongoMemoryServer;

/**
 * Connect to in-memory database
 */
export async function connectTestDatabase(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
}

/**
 * Disconnect and stop in-memory database
 */
export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  await mongoServer.stop();
}

/**
 * Clear all collections in test database
 */
export async function clearTestDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    if (collection) {
      await collection.deleteMany({});
    }
  }
}

/**
 * Generate random test data
 */
export const testDataGenerator = {
  randomString: (length: number = 10): string => {
    return Math.random().toString(36).substring(2, length + 2);
  },
  
  randomEmail: (): string => {
    return `test-${testDataGenerator.randomString()}@example.com`;
  },
  
  randomNumber: (min: number = 0, max: number = 1000): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  randomBoolean: (): boolean => {
    return Math.random() < 0.5;
  },
  
  randomDate: (start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },
};

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy for console methods
 */
export function spyOnConsole(): {
  log: jest.SpyInstance;
  error: jest.SpyInstance;
  warn: jest.SpyInstance;
} {
  return {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
  };
}
