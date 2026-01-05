import { EachMessagePayload } from 'kafkajs';
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { NotificationType } from '@domain/notification.entity';

/**
 * Base Event Handler
 * Provides common functionality for all event handlers
 */
export abstract class BaseEventHandler {
    protected abstract processEvent(payload: EachMessagePayload): Promise<void>;

    async handle(payload: EachMessagePayload): Promise<void> {
        const eventId = payload.message.key?.toString() || 'unknown';

        try {
            console.log(`Processing event: ${eventId}`);
            await this.processEvent(payload);
            console.log(`✅ Event processed successfully: ${eventId}`);
        } catch (error: any) {
            console.error(`❌ Error processing event ${eventId}:`, error.message);
            throw error; // Kafka will retry
        }
    }

    protected parseMessage<T>(payload: EachMessagePayload): T {
        const value = payload.message.value?.toString();
        if (!value) {
            throw new Error('Empty message value');
        }
        return JSON.parse(value) as T;
    }
}

/**
 * UserRegistered Event Handler
 */
export class UserRegisteredHandler extends BaseEventHandler {
    constructor(private sendEmailUseCase: SendEmailUseCase) {
        super();
    }

    protected async processEvent(payload: EachMessagePayload): Promise<void> {
        const event = this.parseMessage<{
            userId: string;
            email: string;
            name: string;
            registeredAt: string;
        }>(payload);

        const result = await this.sendEmailUseCase.execute({
            type: NotificationType.WELCOME_EMAIL,
            recipient: event.email,
            data: {
                name: event.name,
                email: event.email,
                platformName: 'E-Commerce Platform',
                loginUrl: `${process.env.FRONTEND_URL}/login`,
            },
        });

        if (!result.success) {
            console.error(`Failed to send welcome email to ${event.email}:`, result.error);
            throw result.error;
        }

        console.log(`✉️ Welcome email sent to ${event.email}`);
    }
}
