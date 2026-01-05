import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: 'healthy' | 'unhealthy' | 'unknown';
    memory: {
      status: 'healthy' | 'warning' | 'critical';
      usage: number;
      limit: number;
      percentage: number;
    };
  };
}

export function createHealthRoute(): Router {
  const router = Router();

  router.get('/health', async (_req: Request, res: Response) => {
    const health: HealthCheck = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: 'unknown',
        memory: {
          status: 'healthy',
          usage: 0,
          limit: 0,
          percentage: 0
        }
      }
    };

    try {
      // Check database connection
      if (mongoose.connection.readyState === 1) {
        // Connected
        health.checks.database = 'healthy';
      } else if (mongoose.connection.readyState === 2) {
        // Connecting
        health.checks.database = 'unknown';
        health.status = 'unhealthy';
      } else {
        // Disconnected or disconnecting
        health.checks.database = 'unhealthy';
        health.status = 'unhealthy';
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryPercentage = (usedMemory / totalMemory) * 100;

      health.checks.memory = {
        status: memoryPercentage > 90 ? 'critical' : memoryPercentage > 75 ? 'warning' : 'healthy',
        usage: Math.round(usedMemory / 1024 / 1024), // MB
        limit: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round(memoryPercentage)
      };

      if (health.checks.memory.status === 'critical') {
        health.status = 'unhealthy';
      }

      // Determine overall status code
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      health.status = 'unhealthy';
      res.status(503).json(health);
    }
  });

  // Readiness probe - checks if app is ready to receive traffic
  router.get('/ready', async (_req: Request, res: Response) => {
    try {
      // Check if database is connected
      if (mongoose.connection.readyState === 1) {
        res.status(200).json({ ready: true });
      } else {
        res.status(503).json({ ready: false, reason: 'Database not connected' });
      }
    } catch (error) {
      res.status(503).json({ ready: false, reason: 'Error checking readiness' });
    }
  });

  // Liveness probe - checks if app is alive
  router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({ alive: true });
  });

  return router;
}
