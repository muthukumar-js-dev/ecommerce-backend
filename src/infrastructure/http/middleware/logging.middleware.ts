import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Extended Request interface with request ID and timing
 */
export interface RequestWithId extends Request {
  id: string;
  startTime: number;
}

/**
 * Request logging middleware
 * Logs incoming requests and outgoing responses with performance metrics
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const reqWithId = req as RequestWithId;
  reqWithId.id = randomUUID();
  reqWithId.startTime = Date.now();

  // Log request
  console.log({
    type: 'REQUEST',
    requestId: reqWithId.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - reqWithId.startTime;

    console.log({
      type: 'RESPONSE',
      requestId: reqWithId.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  });

  next();
}
