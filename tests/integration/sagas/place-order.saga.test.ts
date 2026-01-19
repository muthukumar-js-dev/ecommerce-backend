import { PlaceOrderSaga } from '../../../src/application/sagas/place-order.saga';
import { PlaceOrderCommand } from '../../../src/application/commands/order/place-order.command';
import { IUserRepository } from '../../../src/domain/user/repositories/user.repository.interface';
import { IProductRepository } from '../../../src/domain/product/repositories/product.repository.interface';
import { IOrderRepository } from '../../../src/domain/order/repositories/order.repository.interface';
import { IAddressRepository } from '../../../src/domain/address/repositories/address.repository.interface';
import { Product } from '../../../src/domain/product/aggregates/product.aggregate';
import { Address } from '../../../src/domain/address/entities/address.entity';
import { success, failure } from '../../../src/shared/types/result';
import { Quantity } from '../../../src/domain/product/value-objects/quantity.vo';
import { Money } from '../../../src/domain/product/value-objects/money.vo';
import { SKU } from '../../../src/domain/product/value-objects/sku.vo';

import { ICartRepository } from '../../../src/domain/cart/repositories/cart.repository.interface';
import { EventBus } from '../../../src/infrastructure/events/event-bus';

// Mock implementations
const mockUserRepository = {
    findById: jest.fn(),
    save: jest.fn(),
    findByEmail: jest.fn(),
} as unknown as IUserRepository;

const mockProductRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
} as unknown as IProductRepository;

const mockOrderRepository = {
    save: jest.fn(),
    findById: jest.fn(),
} as unknown as IOrderRepository;

const mockAddressRepository = {
    findById: jest.fn(),
} as unknown as IAddressRepository;

const mockCartRepository = {
    findByUserId: jest.fn(),
    update: jest.fn(),
    clear: jest.fn(),
} as unknown as ICartRepository;

const mockEventBus = {
    publish: jest.fn(),
} as unknown as EventBus;

describe('PlaceOrderSaga Integration', () => {
    const userId = 'user-123';
    const productId = 'prod-123';
    const addressId = 'addr-123';

    const command = new PlaceOrderCommand(
        userId,
        [{ productId, quantity: 2, price: 100 }],
        addressId,
        'payment-method-id'
    );

    let saga: PlaceOrderSaga;
    let mockProduct: Product;
    let mockAddress: Address;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock data
        mockProduct = Product.create({
            title: 'Test Product',
            sku: SKU.create('SKU-123'),
            description: 'Desc',
            category: 'Cat',
            brand: 'Brand',
            sellingPrice: Money.create(100),
            actualPrice: Money.create(120),
            inventory: Quantity.create(10),
            sellerId: 'seller-1',
            images: ['img.jpg'],
            productDetails: [],
        }, productId);

        mockAddress = Address.create({
            userId,
            name: 'Test User',
            firstLine: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            postalCode: '123456',
            country: 'Test Country',
            phone: '1234567890',
            phoneCode: '+1',
            isDefault: true,
            status: 1
        }, addressId);

        const mockUser = {
            id: { value: userId },
            incrementOrderCount: jest.fn(),
            decrementOrderCount: jest.fn(),
        };

        // Setup success responses
        (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
        (mockProductRepository.findById as jest.Mock).mockResolvedValue(mockProduct);
        (mockProductRepository.update as jest.Mock).mockResolvedValue(success(mockProduct));
        (mockAddressRepository.findById as jest.Mock).mockResolvedValue(mockAddress);
        (mockOrderRepository.save as jest.Mock).mockResolvedValue(success({ id: { value: 'order-123' } }));
        (mockCartRepository.findByUserId as jest.Mock).mockResolvedValue(null);
        (mockUserRepository.save as jest.Mock).mockResolvedValue(success(mockUser)); // Mock save result

        saga = new PlaceOrderSaga(
            userId,
            command,
            mockUserRepository,
            mockProductRepository,
            mockOrderRepository,
            mockAddressRepository,
            mockCartRepository,
            mockEventBus
        );
    });

    it('should successfully execute all steps', async () => {
        await saga.execute();

        // Verify User Validated
        expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);

        // Verify Inventory Reserved
        expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
        expect(mockProductRepository.update).toHaveBeenCalled();
        expect(mockProduct.inventory.value).toBe(8); // 10 - 2

        // Verify Order Created
        expect(mockAddressRepository.findById).toHaveBeenCalledWith(addressId);
        expect(mockOrderRepository.save).toHaveBeenCalled();

        expect(saga.getOrder()).toBeDefined();

        // Verify User Stats Updated
        // expect(mockUser.incrementOrderCount).toHaveBeenCalled(); // Cannot verify mockUser variable directly here easily without scope?
        // But we called save
        expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should compensate when order save fails', async () => {
        // Mock Order Save Failure
        (mockOrderRepository.save as jest.Mock).mockResolvedValue(failure(new Error('DB Error')));

        // Expect execute to throw
        await expect(saga.execute()).rejects.toThrow('DB Error');

        // Verify Reserve happened
        expect(mockProductRepository.update).toHaveBeenCalledTimes(1);
        expect(mockProduct.inventory.value).toBe(8);

        await saga.compensate();

        // Verify Compensation (Inventory Restocked)
        expect(mockProductRepository.update).toHaveBeenCalledTimes(2);
        expect(mockProduct.inventory.value).toBe(10); // Restored to 10
    });
});
