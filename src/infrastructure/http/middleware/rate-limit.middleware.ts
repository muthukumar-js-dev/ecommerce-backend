/**
 * Rate limiting middleware (Optional - requires Redis)
 * 
 * NOTE: This implementation requires Redis to be installed and configured.
 * To use this middleware:
 * 1. Install dependencies: npm install express-rate-limit rate-limit-redis ioredis
 * 2. Set REDIS_URL environment variable
 * 3. Import and use in your Express app
 * 
 * Example usage:
 * import { generalLimiter, authLimiter } from './middleware/rate-limit.middleware';
 * app.use('/api', generalLimiter);
 * app.use('/api/auth', authLimiter);
 */

import rateLimit from 'express-rate-limit';

/**
 * General rate limiter for all API endpoints
 * Limits each IP to 100 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store is in-memory by default (not recommended for production)
  // For production, use Redis store (see below)
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits each IP to 5 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth endpoints to 5 requests per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Redis-based rate limiter (commented out - requires Redis setup)
 * 
 * Uncomment and configure when Redis is available:
 * 
 * import RedisStore from 'rate-limit-redis';
 * import Redis from 'ioredis';
 * 
 * const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
 * 
 * export const redisGeneralLimiter = rateLimit({
 *   store: new RedisStore({
 *     client: redis,
 *     prefix: 'rl:general:',
 *   }),
 *   windowMs: 15 * 60 * 1000,
 *   max: 100,
 *   message: 'Too many requests, please try again later',
 *   standardHeaders: true,
 *   legacyHeaders: false,
 * });
 * 
 * export const redisAuthLimiter = rateLimit({
 *   store: new RedisStore({
 *     client: redis,
 *     prefix: 'rl:auth:',
 *   }),
 *   windowMs: 15 * 60 * 1000,
 *   max: 5,
 *   message: 'Too many authentication attempts, please try again later',
 *   skipSuccessfulRequests: true,
 *   standardHeaders: true,
 *   legacyHeaders: false,
 * });
 */
