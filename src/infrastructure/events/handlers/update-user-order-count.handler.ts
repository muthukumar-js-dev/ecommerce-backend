import { EventHandler } from '../event-handler.interface';
import { OrderPlaced } from '@domain/order/events/order-placed.event';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';

export class UpdateUserOrderCountHandler implements EventHandler<OrderPlaced> {
    constructor(private readonly userRepository: IUserRepository) { }

    async handle(event: OrderPlaced): Promise<void> {
        const { userId } = event.payload;

        const user = await this.userRepository.findById(userId);
        if (!user) {
            console.error(`[UpdateUserOrderCountHandler] User ${userId} not found`);
            return;
        }

        // This logic updates the User aggregate's statistics.
        // Ideally this might be a domain service method, but simple logic fits here.
        // Note: User aggregate needs methods to support this safely.
        // Checking User aggregate capabilities... assumed public or method available.
        // Assuming we need to implement increment logic or use props access if strict.

        // Since direct prop modification is discouraged outside aggregate, 
        // we should really have a method like user.recordOrder(itemCount).
        // For now, I will use what's likely exposed or add the method.

        // user.currentOrderCount += 1; // Direct access might vary based on impl.
        // Let's assume we need to add a method to User aggregate if not present.
        // For this step, I'll assume a 'recordNewOrder' method or similar exists or act via strict props.

        // Re-reading User aggregate from previous context... 
        // User has properties. I will create a method on User aggregate if needed in next step.
        // For now, writing speculative code that I will verify/fix.

        // user.props.currentOrderCount += 1; // Accessing props directly if protected/public

        console.log(`[UpdateUserOrderCountHandler] Updating order count for user ${userId}`);
        // Logic placeholder - I will verify User Aggregate in next step and update this file.
    }
}
