import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';

/**
 * Update User Stats Step
 * Updates user statistics after successful order
 */
export class UpdateUserStatsStep implements SagaStep {
    name = 'UpdateUserStats';

    constructor(private userRepository: IUserRepository) { }

    async execute(context: SagaContext): Promise<void> {
        const { userId } = context.data;

        console.log(`📊 Updating stats for user ${userId}`);

        const userResult = await this.userRepository.findById(userId);
        if (!userResult.success || !userResult.data) {
            throw new Error(`User not found: ${userId}`);
        }

        const user = userResult.data;

        // Increment order count
        user.incrementOrderCount();

        const updateResult = await this.userRepository.update(user);
        if (!updateResult.success) {
            throw updateResult.error;
        }

        console.log(`✅ User stats updated for ${userId}`);
    }

    async compensate(context: SagaContext): Promise<void> {
        const { userId } = context.data;

        console.log(`🔙 Reverting stats for user ${userId}`);

        const userResult = await this.userRepository.findById(userId);
        if (userResult.success && userResult.data) {
            const user = userResult.data;

            // Decrement order count
            user.decrementOrderCount();

            await this.userRepository.update(user);

            console.log(`✅ User stats reverted for ${userId}`);
        }
    }
}
