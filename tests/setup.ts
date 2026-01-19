
import { jest } from '@jest/globals';

// Global Redis Mock
// This prevents tests from trying to connect to a real Redis instance
jest.mock('ioredis', () => {
  const EventEmitter = require('events');

  class RedisMock extends EventEmitter {
    data = new Map<string, string>();
    expirations = new Map<string, NodeJS.Timeout>();
    expiryTimes = new Map<string, number>();

    constructor() {
      super();
      this.status = 'ready';
    }

    async connect() { return Promise.resolve(); }
    async disconnect() { return Promise.resolve(); }
    async quit() {
      this.expirations.forEach((timeout: any) => clearTimeout(timeout));
      this.expirations.clear();
      this.expiryTimes.clear();
      return Promise.resolve();
    }

    async get(key: string) { return this.data.get(key) || null; }

    async set(key: string, value: string) {
      this.data.set(key, value);
      this.removeExpiry(key);
      return 'OK';
    }

    async setex(key: string, seconds: number, value: string) {
      this.data.set(key, value);
      this.expire(key, seconds);
      return 'OK';
    }

    async del(key: string) {
      this.removeExpiry(key);
      return this.data.delete(key) ? 1 : 0;
    }

    async exists(key: string) { return this.data.has(key) ? 1 : 0; }

    async expire(key: string, seconds: number) {
      this.removeExpiry(key);
      const timeout = setTimeout(() => {
        this.data.delete(key);
        this.expiryTimes.delete(key);
        this.expirations.delete(key);
      }, seconds * 1000);
      timeout.unref();
      this.expirations.set(key, timeout);
      this.expiryTimes.set(key, Date.now() + seconds * 1000);
      return 1;
    }

    async ttl(key: string) {
      if (!this.data.has(key)) return -2;
      if (!this.expiryTimes.has(key)) return -1;
      const remaining = Math.ceil((this.expiryTimes.get(key)! - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }

    private removeExpiry(key: string) {
      if (this.expirations.has(key)) {
        clearTimeout(this.expirations.get(key)!);
        this.expirations.delete(key);
      }
      this.expiryTimes.delete(key);
    }

    async incr(key: string) {
      const val = parseInt(this.data.get(key) || '0');
      const newVal = val + 1;
      this.data.set(key, newVal.toString());
      return newVal;
    }

    async decr(key: string) {
      const val = parseInt(this.data.get(key) || '0');
      const newVal = val - 1;
      this.data.set(key, newVal.toString());
      return newVal;
    }

    async hget(key: string, field: string) {
      const data = this.data.get(key);
      if (!data) return null;
      try {
        const parsed = JSON.parse(data); // Mock implementation stores whole object? 
        // No, Redis HSET stores fields. 
        // My simple Map<string, string> doesn't handle Hash well unless I serialize Map?
        // Let's implement separate map for hashes or reuse data.
        // If the key is used for HSET, let's assume value is JSON object stringified?
        // But `ioredis` stores fields.
        // Simplified: Store hash as JSON string in data map.
        return parsed[field] || null;
      } catch { return null; }
    }

    async hset(key: string, field: string, value: string) {
      let current: Record<string, string> = {};
      if (this.data.has(key)) {
        try { current = JSON.parse(this.data.get(key)!); } catch { }
      }
      current[field] = value;
      this.data.set(key, JSON.stringify(current));
      return 1;
    }

    async hgetall(key: string) {
      if (this.data.has(key)) {
        try { return JSON.parse(this.data.get(key)!) as Record<string, string>; } catch { return {}; }
      }
      return {};
    }

    async hdel(key: string, field: string) {
      if (this.data.has(key)) {
        try {
          const current: Record<string, string> = JSON.parse(this.data.get(key)!);
          delete current[field];
          this.data.set(key, JSON.stringify(current));
          return 1;
        } catch { return 0; }
      }
      return 0;
    }

    async keys(pattern: string) {
      if (pattern === '*') return Array.from(this.data.keys());

      // Simple glob to regex conversion
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(this.data.keys()).filter(key => regex.test(key));
    }

    async flushdb() {
      this.data.clear();
      this.expirations.forEach((t: any) => clearTimeout(t));
      this.expirations.clear();
      return 'OK';
    }
    async ping() { return 'PONG'; }
  }

  // Mock Cluster
  class ClusterMock extends EventEmitter {
    constructor() { super(); }
    async quit() { return Promise.resolve(); }
    async disconnect() { return Promise.resolve(); }
    // Add same methods as RedisMock if needed, or just delegate
  }

  const MockRedis = function () { return new RedisMock(); };
  MockRedis.Cluster = ClusterMock;

  return MockRedis;
});

// Suppress excessive logs during tests
if (process.env.NODE_ENV === 'test') {
  // console.log = jest.fn(); // Optional: uncomment to silence logs
  // console.error = jest.fn(); // Keeping error logs is usually good
}

// Mock KafkaJS
jest.mock('kafkajs', () => {
  return {
    Kafka: jest.fn<any>().mockImplementation(() => ({
      producer: jest.fn<any>().mockReturnValue({
        connect: jest.fn<any>().mockResolvedValue(undefined),
        disconnect: jest.fn<any>().mockResolvedValue(undefined),
        send: jest.fn<any>().mockResolvedValue([{ errorCode: 0 }]),
        on: jest.fn<any>(),
      }),
      consumer: jest.fn<any>().mockReturnValue({
        connect: jest.fn<any>().mockResolvedValue(undefined),
        disconnect: jest.fn<any>().mockResolvedValue(undefined),
        subscribe: jest.fn<any>().mockResolvedValue(undefined),
        run: jest.fn<any>().mockResolvedValue(undefined),
        on: jest.fn<any>(),
      }),
      admin: jest.fn<any>().mockReturnValue({
        connect: jest.fn<any>().mockResolvedValue(undefined),
        disconnect: jest.fn<any>().mockResolvedValue(undefined),
        createTopics: jest.fn<any>().mockResolvedValue(true),
        listTopics: jest.fn<any>().mockResolvedValue([]),
      }),
    })),
    Partitioners: {
      LegacyPartitioner: jest.fn<any>(),
    },
    LogLevel: {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 4,
      NOTHING: 5,
    },
  };
});
