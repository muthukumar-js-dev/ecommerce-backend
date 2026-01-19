import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from './base-event-handler';
import { ProcessedEventRepository } from '@infrastructure/database/mongodb/repositories/processed-event.repository';
import { UserReadRepository } from '@infrastructure/database/mongodb/read-models/user-read.repository';

/**
 * Handler for UserRegistered events from Kafka
 * Updates user read model when a new user registers
 */
export class UserRegisteredConsumerHandler extends BaseEventHandler {
    constructor(
        processedEventRepo: ProcessedEventRepository,
        private userReadRepo: UserReadRepository
    ) {
        super(processedEventRepo);
    }

    protected async processEvent(payload: EachMessagePayload): Promise<void> {
        const event = this.parseMessage<{
            userId: string;
            email: string;
            name: string;
            role: string;
            createdAt: string;
        }>(payload);

        // Update user read model
        await this.userReadRepo.create({
            id: event.userId,
            name: event.name,
            email: event.email,
            role: event.role,
            currentOrderCount: 0,
            returnedOrderCount: 0,
            createdAt: new Date(event.createdAt),
            updatedAt: new Date(),
        } as any);

        console.log(`  ✓ User read model created for: ${event.email}`);
    }
}
