import mongoose from 'mongoose';

export function Transactional() {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Execute original method with session context if needed, 
                // but typically repositories should use the session if passed or global context.
                // For now, simple transaction wrapping.
                const result = await originalMethod.apply(this, args);

                // Commit transaction
                await session.commitTransaction();
                return result;
            } catch (error) {
                // Rollback on error
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        };

        return descriptor;
    };
}
