import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';

/**
 * Validate User Step
 * Validates that the user exists and can place orders
 */
export class ValidateUserStep implements SagaStep {
    name = 'ValidateUser';

    constructor(private userRepository: IUserRepository) { }

    async execute(context: SagaContext): Promise<void> {
        const { userId } = context.data;

        const userResult = await this.userRepository.findById(userId);
        if (!userResult.success || !userResult.data) {
            throw new Error(`User not found: ${userId}`);
        }

        const user = userResult.data;

        // Check if user can place orders (e.g., not banned, email verified)
        if (!user.isActive) {
            throw new Error('User account is not active');
        }

        // Store user in context for later steps
        context.stepData.set('user', user);

        console.log(`✅ User ${userId} validated successfully`);
    }

    async compensate(context: SagaContext): Promise<void> {
        // No compensation needed for validation
        console.log('ℹ️ ValidateUser: No compensation required');
    }
}
