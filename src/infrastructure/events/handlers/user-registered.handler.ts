import { EventHandler } from '../event-handler.interface';
import { UserRegistered } from '@domain/user/events/user-registered.event';
import { UserReadModel } from '@infrastructure/database/mongodb/read-models/user-read.model';

export class UserRegisteredHandler implements EventHandler<UserRegistered> {
    async handle(event: UserRegistered): Promise<void> {
        const { userId, email, name, role, registeredAt } = event.payload;

        await UserReadModel.create({
            id: userId,
            email,
            name,
            role,
            currentOrderCount: 0,
            returnedOrderCount: 0,
            createdAt: registeredAt,
            updatedAt: registeredAt,
        });

        console.log(`Read model updated for UserRegistered: ${userId}`);
    }
}
