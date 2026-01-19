import { Request, Response, NextFunction } from 'express';
import { EventBus } from './event-bus';

export function eventDispatcherMiddleware(eventBus: EventBus) {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Store original send
        const originalSend = res.send;

        // Override send to dispatch events after response
        res.send = function (data: any): Response {
            // Send response first
            const result = originalSend.call(this, data);

            // Dispatch events after response (fire and forget)
            if ((req as any).domainEvents && Array.isArray((req as any).domainEvents)) {
                setImmediate(() => {
                    void (async () => {
                        try {
                            await eventBus.publishAll((req as any).domainEvents);
                        } catch (error) {
                            console.error('Error dispatching events:', error);
                        }
                    })();
                });
            }

            return result;
        };

        next();
    };
}
