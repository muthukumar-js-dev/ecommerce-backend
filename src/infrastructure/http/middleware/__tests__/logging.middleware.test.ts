import { Request, Response, NextFunction } from 'express';
import { requestLogger, RequestWithId } from '../logging.middleware';

describe('Logging Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let onMock: jest.Mock;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/test',
      query: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
    };

    onMock = jest.fn();
    res = {
      on: onMock,
      statusCode: 200,
    };

    next = jest.fn();

    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should add request ID and start time', () => {
    requestLogger(req as Request, res as Response, next);

    expect((req as RequestWithId).id).toBeDefined();
    expect((req as RequestWithId).startTime).toBeDefined();
    expect(typeof (req as RequestWithId).id).toBe('string');
    expect(typeof (req as RequestWithId).startTime).toBe('number');
  });

  it('should call next middleware', () => {
    requestLogger(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should log request details', () => {
    const consoleSpy = jest.spyOn(console, 'log');

    requestLogger(req as Request, res as Response, next);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REQUEST',
        requestId: expect.any(String),
        method: 'GET',
        path: '/test',
        query: {},
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: expect.any(String),
      })
    );
  });

  it('should register response finish handler', () => {
    requestLogger(req as Request, res as Response, next);

    expect(onMock).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should log response details on finish', () => {
    const consoleSpy = jest.spyOn(console, 'log');

    requestLogger(req as Request, res as Response, next);

    // Simulate response finish
    const finishHandler = onMock.mock.calls[0][1];
    finishHandler();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESPONSE',
        requestId: expect.any(String),
        method: 'GET',
        path: '/test',
        statusCode: 200,
        duration: expect.stringContaining('ms'),
        timestamp: expect.any(String),
      })
    );
  });

  it('should calculate request duration', () => {
    const consoleSpy = jest.spyOn(console, 'log');

    requestLogger(req as Request, res as Response, next);

    // Simulate some time passing
    const startTime = (req as RequestWithId).startTime;
    (req as RequestWithId).startTime = startTime - 100; // 100ms ago

    const finishHandler = onMock.mock.calls[0][1];
    finishHandler();

    const responseLog = consoleSpy.mock.calls[1]?.[0];
    expect(responseLog?.duration).toMatch(/\d+ms/);
  });
});
