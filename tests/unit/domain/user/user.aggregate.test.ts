import { User } from '../../../../src/domain/user/aggregates/user.aggregate';
import { Email } from '../../../../src/domain/user/value-objects/email.vo';
import { Password } from '../../../../src/domain/user/value-objects/password.vo';
import { UserRole } from '../../../../src/shared/types/common';

describe('User Aggregate', () => {
    describe('Creation', () => {
        it('should create a new user with valid data', async () => {
            const user = await createTestUser();

            expect(user).toBeDefined();
            expect(user.id.value).toBe('user-123');
            expect(user.name).toBe('Test User');
            expect(user.email.value).toBe('test@example.com');
            expect(user.role).toBe(UserRole.USER);
            expect(user.isActive).toBe(true);
            expect(user.currentOrderCount).toBe(0);
            expect(user.returnedOrderCount).toBe(0);
        });

        it('should raise UserRegistered event on creation', async () => {
            const user = await createTestUser();

            const events = user.domainEvents;
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('UserRegistered');
        });
    });

    describe('Business Rules - Order Management', () => {
        it('should enforce maximum order limit (50 orders)', async () => {
            const user = await createTestUser();

            // Place 50 orders (max)
            for (let i = 0; i < 50; i++) {
                user.incrementOrderCount();
            }

            expect(user.currentOrderCount).toBe(50);
            expect(() => user.incrementOrderCount()).toThrow();
        });

        it('should allow incrementing order count within limit', async () => {
            const user = await createTestUser();

            user.incrementOrderCount();
            user.incrementOrderCount();

            expect(user.currentOrderCount).toBe(2);
        });

        it('should track returned orders', async () => {
            const user = await createTestUser();

            user.incrementOrderCount();
            user.incrementReturnCount();

            expect(user.currentOrderCount).toBe(1);
            expect(user.returnedOrderCount).toBe(1);
        });
    });

    describe('Business Rules - Role Management', () => {
        it('should require shop details for seller role', async () => {
            const user = await createTestUser();

            expect(() => user.changeRole(UserRole.SELLER, 'admin-123')).toThrow();
        });

        it('should allow role change to seller with shop details', async () => {
            const user = await createTestUser();
            user.updateSellerDetails('Test Shop', '123 Main St');

            user.changeRole(UserRole.SELLER, 'admin-123');

            expect(user.role).toBe(UserRole.SELLER);
        });

        it('should allow role change to admin', async () => {
            const user = await createTestUser();

            user.changeRole(UserRole.ADMIN, 'super-admin-123');

            expect(user.role).toBe(UserRole.ADMIN);
        });
    });

    describe('Domain Events', () => {
        it('should raise UserRoleChanged when role changes', async () => {
            const user = await createTestUser();
            user.updateSellerDetails('Shop', 'Address');
            user.clearDomainEvents();

            user.changeRole(UserRole.SELLER, 'admin-123');

            const events = user.domainEvents;
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('UserRoleChanged');
        });

        it('should raise UserLoggedIn event on login', async () => {
            const user = await createTestUser();
            user.clearDomainEvents();

            user.recordLogin();

            const events = user.domainEvents;
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('UserLoggedIn');
        });

        it('should update lastLogin timestamp on login', async () => {
            const user = await createTestUser();
            const beforeLogin = new Date();

            user.recordLogin();

            expect(user.lastLogin).toBeDefined();
            expect(user.lastLogin!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
        });
    });

    describe('User Status', () => {
        it('should deactivate user', async () => {
            const user = await createTestUser();

            user.deactivate();

            expect(user.isActive).toBe(false);
        });

        it('should reactivate user', async () => {
            const user = await createTestUser();
            user.deactivate();

            user.activate();

            expect(user.isActive).toBe(true);
        });
    });
});

async function createTestUser(): Promise<User> {
    return User.create(
        {
            name: 'Test User',
            email: Email.create('test@example.com'),
            password: await Password.create('Password123!'),
            role: UserRole.USER,
        },
        'user-123'
    );
}
