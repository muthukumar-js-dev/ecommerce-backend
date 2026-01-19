import { Email } from '../../../src/domain/user/value-objects/email.vo';
import { Password } from '../../../src/domain/user/value-objects/password.vo';
import { Money } from '../../../src/domain/product/value-objects/money.vo';
import { SKU } from '../../../src/domain/product/value-objects/sku.vo';
import { Quantity } from '../../../src/domain/product/value-objects/quantity.vo';

describe('Value Objects', () => {
    describe('Email', () => {
        it('should create valid email', () => {
            const email = Email.create('test@example.com');

            expect(email.value).toBe('test@example.com');
        });

        it('should reject invalid email format', () => {
            expect(() => Email.create('invalid-email')).toThrow();
            expect(() => Email.create('test@')).toThrow();
            expect(() => Email.create('@example.com')).toThrow();
        });

        it('should normalize email to lowercase', () => {
            const email = Email.create('Test@Example.COM');

            expect(email.value).toBe('test@example.com');
        });

        it('should compare emails correctly', () => {
            const email1 = Email.create('test@example.com');
            const email2 = Email.create('test@example.com');
            const email3 = Email.create('other@example.com');

            expect(email1.equals(email2)).toBe(true);
            expect(email1.equals(email3)).toBe(false);
        });
    });

    describe('Password', () => {
        it('should create valid password', async () => {
            const password = await Password.create('SecurePass123!');

            expect(password).toBeDefined();
        });

        it('should enforce minimum length (8 characters)', async () => {
            await expect(Password.create('Short1!')).rejects.toThrow('Password validation failed');
        });

        it('should require uppercase letter', async () => {
            await expect(Password.create('lowercase123!')).rejects.toThrow('Password validation failed');
        });

        it('should require lowercase letter', async () => {
            await expect(Password.create('UPPERCASE123!')).rejects.toThrow('Password validation failed');
        });

        it('should require number', async () => {
            await expect(Password.create('NoNumbers!')).rejects.toThrow('Password validation failed');
        });

        it('should hash password', async () => {
            const password = await Password.create('SecurePass123!');

            expect(password.hash).not.toBe('SecurePass123!');
            expect(password.hash.length).toBeGreaterThan(20); // Bcrypt hash
        });

        it('should verify correct password', async () => {
            const password = await Password.create('SecurePass123!');

            const isValid = await password.compare('SecurePass123!');
            expect(isValid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const password = await Password.create('SecurePass123!');

            const isValid = await password.compare('WrongPassword123!');
            expect(isValid).toBe(false);
        });
    });

    describe('Money', () => {
        it('should create valid money amount', () => {
            const money = Money.create(100, 'USD');

            expect(money.amount).toBe(100);
            expect(money.currency).toBe('USD');
        });

        it('should default to INR currency', () => {
            const money = Money.create(100);

            expect(money.currency).toBe('INR');
        });

        it('should reject negative amounts', () => {
            expect(() => Money.create(-100)).toThrow('Invalid amount');
        });

        it('should add money amounts', () => {
            const money1 = Money.create(100);
            const money2 = Money.create(50);

            const result = money1.add(money2);

            expect(result.amount).toBe(150);
        });

        it('should subtract money amounts', () => {
            const money1 = Money.create(100);
            const money2 = Money.create(30);

            const result = money1.subtract(money2);

            expect(result.amount).toBe(70);
        });

        it('should multiply money', () => {
            const money = Money.create(100);

            const result = money.multiply(3);

            expect(result.amount).toBe(300);
        });

        it('should prevent operations with different currencies', () => {
            const usd = Money.create(100, 'USD');
            const inr = Money.create(100, 'INR');

            expect(() => usd.add(inr)).toThrow('Currency mismatch');
        });

        it('should compare money amounts', () => {
            const money1 = Money.create(100);
            const money2 = Money.create(100);
            const money3 = Money.create(50);

            expect(money1.equals(money2)).toBe(true);
            expect(money1.equals(money3)).toBe(false);
            expect(money1.isGreaterThan(money3)).toBe(true);
            expect(money3.isLessThan(money1)).toBe(true);
        });
    });

    describe('SKU', () => {
        it('should create valid SKU', () => {
            const sku = SKU.create('SKU-TEST-001');

            expect(sku.value).toBe('SKU-TEST-001');
        });

        it('should normalize SKU to uppercase', () => {
            const sku = SKU.create('sku-test-001');

            expect(sku.value).toBe('SKU-TEST-001');
        });

        it('should reject empty SKU', () => {
            expect(() => SKU.create('')).toThrow();
        });

        it('should enforce minimum length', () => {
            expect(() => SKU.create('AB')).toThrow('Invalid SKU format');
        });

        it('should compare SKUs correctly', () => {
            const sku1 = SKU.create('SKU-001');
            const sku2 = SKU.create('sku-001'); // Normalized to uppercase
            const sku3 = SKU.create('SKU-002');

            expect(sku1.equals(sku2)).toBe(true);
            expect(sku1.equals(sku3)).toBe(false);
        });
    });

    describe('Quantity', () => {
        it('should create valid quantity', () => {
            const quantity = Quantity.create(10);

            expect(quantity.value).toBe(10);
        });

        it('should reject negative quantities', () => {
            expect(() => Quantity.create(-5)).toThrow('Invalid quantity');
        });

        // Quantity CAN be zero (out of stock)
        // it('should reject zero quantity', () => {
        //     expect(() => Quantity.create(0)).toThrow('greater than zero');
        // });

        it('should add quantities', () => {
            const qty1 = Quantity.create(10);
            const qty2 = Quantity.create(5);

            const result = qty1.add(qty2);

            expect(result.value).toBe(15);
        });

        it('should subtract quantities', () => {
            const qty1 = Quantity.create(10);
            const qty2 = Quantity.create(3);

            const result = qty1.subtract(qty2);

            expect(result.value).toBe(7);
        });

        it('should prevent subtraction resulting in negative', () => {
            const qty1 = Quantity.create(5);
            const qty2 = Quantity.create(10);

            expect(() => qty1.subtract(qty2)).toThrow('Insufficient quantity');
        });

        it('should compare quantities', () => {
            const qty1 = Quantity.create(10);
            const qty2 = Quantity.create(10);
            const qty3 = Quantity.create(5);

            expect(qty1.equals(qty2)).toBe(true);
            expect(qty1.equals(qty3)).toBe(false);
            expect(qty1.isGreaterThan(qty3)).toBe(true);
            expect(qty3.isLessThan(qty1)).toBe(true);
        });

        it('should check if quantity is sufficient', () => {
            const qty = Quantity.create(10);

            expect(qty.isSufficient(Quantity.create(5))).toBe(true);
            expect(qty.isSufficient(Quantity.create(15))).toBe(false);
        });
    });
});
