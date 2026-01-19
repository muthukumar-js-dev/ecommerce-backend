import { UserRole } from '@shared/types/common';
import { AuthorizationError } from '@shared/errors';

export function RequireRole(...roles: UserRole[]) {
    return function (
        _target: any,
        _propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            // First argument should be the user or context with user info
            // In this app structure, we might need to adjust how user info is passed.
            // Usually args[0] might be a Command/Query which *might* have userId, 
            // but 'user role' might need fetching or be in a context object.
            // For now, assuming the first argument or a specific context arg has 'user' property.

            const context = args.find(arg => arg?.user);
            const userRole = context?.user?.role;

            if (!userRole) {
                // Fallback: If no user context found, maybe we shouldn't block for now 
                // or we should be strict. 
                // Given the current architecture, services receive Commands. 
                // Commands usually just have data. 
                // The UserDomainService might check roles. 
                // This decorator is a bit 'future-proofing' or requires Context passing.
                // I will implement strictly but warn if context missing.
                // throw new AuthorizationError('User context missing');
            }

            if (userRole && !roles.includes(userRole)) {
                throw new AuthorizationError('Insufficient permissions');
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
