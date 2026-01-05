import winston from 'winston';

/**
 * Create Winston logger
 */
export function createLogger(serviceName: string): winston.Logger {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        defaultMeta: {
            service: serviceName,
            environment: process.env.NODE_ENV,
        },
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                ),
            }),
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
            }),
            new winston.transports.File({
                filename: 'logs/combined.log',
            }),
        ],
    });
}

/**
 * Logging middleware for Express
 */
export function loggingMiddleware(logger: winston.Logger) {
    return (req: any, res: any, next: any) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;

            logger.info('HTTP Request', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                correlationId: req.correlationId,
                userId: req.user?.id,
            });
        });

        next();
    };
}
