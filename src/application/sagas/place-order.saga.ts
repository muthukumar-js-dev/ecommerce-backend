import { BaseSaga, SagaStep } from './saga.interface';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { IAddressRepository } from '@domain/address/repositories/address.repository.interface';
import { Order } from '@domain/order/aggregates/order.aggregate';
import { ID } from '@shared/types/common';
import { PlaceOrderCommand } from '@application/commands/order/place-order.command';
import { OrderItem } from '@domain/order/entities/order-item.entity';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { ShippingAddress } from '@domain/order/value-objects/shipping-address.vo';
import { BusinessRuleError } from '@shared/errors';

export class PlaceOrderSaga extends BaseSaga {
    private order?: Order;
    private reservedProducts: Array<{ productId: ID; quantity: number }> = [];

    constructor(
        private readonly userId: ID,
        private readonly command: PlaceOrderCommand,
        private readonly userRepository: IUserRepository,
        private readonly productRepository: IProductRepository,
        private readonly orderRepository: IOrderRepository,
        private readonly addressRepository: IAddressRepository
    ) {
        super();
    }

    async execute(): Promise<void> {
        // Step 1: Validate User
        await this.executeStep(new ValidateUserStep(this.userId, this.userRepository));

        // Step 2: Reserve Inventory
        await this.executeStep(
            new ReserveInventoryStep(
                this.command.items,
                this.productRepository,
                this.reservedProducts
            )
        );

        // Step 3: Create Order
        await this.executeStep(
            new CreateOrderStep(
                this.userId,
                this.command,
                this.orderRepository,
                this.productRepository,
                this.addressRepository,
                (order) => { this.order = order; }
            )
        );

        // Step 4: Update User Stats
        await this.executeStep(
            new UpdateUserOrderCountStep(this.userId, this.userRepository)
        );
    }

    getOrder(): Order | undefined {
        return this.order;
    }
}

// --- Steps ---

class ValidateUserStep implements SagaStep {
    name = 'ValidateUser';

    constructor(
        private userId: ID,
        private userRepository: IUserRepository
    ) { }

    async execute(): Promise<void> {
        const user = await this.userRepository.findById(this.userId);
        if (!user) {
            throw new BusinessRuleError('User not found', 'USER_NOT_FOUND');
        }
    }

    async compensate(): Promise<void> {
        // Read-only
    }
}

class ReserveInventoryStep implements SagaStep {
    name = 'ReserveInventory';

    constructor(
        private items: Array<{ productId: string; quantity: number }>,
        private productRepository: IProductRepository,
        private reservedProducts: Array<{ productId: ID; quantity: number }>
    ) { }

    async execute(): Promise<void> {
        for (const item of this.items) {
            const product = await this.productRepository.findById(item.productId);
            if (!product) {
                throw new BusinessRuleError(`Product ${item.productId} not found`, 'PRODUCT_NOT_FOUND');
            }

            const quantity = Quantity.create(item.quantity);
            product.reserveInventory(quantity);

            const result = await this.productRepository.update(product);
            if (!result.success) throw result.error;

            this.reservedProducts.push({
                productId: item.productId,
                quantity: item.quantity,
            });
        }
    }

    async compensate(): Promise<void> {
        for (const reserved of this.reservedProducts) {
            const product = await this.productRepository.findById(reserved.productId);
            if (product) {
                const quantity = Quantity.create(reserved.quantity);
                product.restockInventory(quantity);
                await this.productRepository.update(product);
            }
        }
    }
}

class CreateOrderStep implements SagaStep {
    name = 'CreateOrder';

    constructor(
        private userId: ID,
        private command: PlaceOrderCommand,
        private orderRepository: IOrderRepository,
        private productRepository: IProductRepository,
        private addressRepository: IAddressRepository,
        private onOrderCreated: (order: Order) => void
    ) { }

    async execute(): Promise<void> {
        const orderItems: OrderItem[] = [];

        for (const itemCmd of this.command.items) {
            const product = await this.productRepository.findById(itemCmd.productId);
            if (!product) throw new Error(`Product ${itemCmd.productId} not found during creation`);

            orderItems.push(
                OrderItem.create(
                    product.id,
                    product.title,
                    Quantity.create(itemCmd.quantity),
                    product.sellingPrice,
                    new Date().getTime().toString() + Math.random()
                )
            );
        }

        const address = await this.addressRepository.findById(this.command.shippingAddressId);
        if (!address) throw new BusinessRuleError('Shipping Address not found', 'ADDRESS_NOT_FOUND');

        const shippingAddress = ShippingAddress.create({
            street: address.firstLine,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            recipientName: address.name,
            phoneNumber: address.phone
        });

        const order = Order.create(
            this.userId,
            orderItems,
            shippingAddress,
            new Date().getTime().toString()
        );

        const result = await this.orderRepository.save(order);
        if (!result.success) {
            throw result.error;
        }

        this.onOrderCreated(order);
    }

    async compensate(): Promise<void> {
        console.log('[CreateOrderStep] Compensation: Would cancel order here');
    }
}

class UpdateUserOrderCountStep implements SagaStep {
    name = 'UpdateUserOrderCount';

    constructor(
        private userId: ID,
        private userRepository: IUserRepository
    ) { }

    async execute(): Promise<void> {
        const user = await this.userRepository.findById(this.userId);
        if (!user) {
            throw new BusinessRuleError('User not found for stats update', 'USER_NOT_FOUND');
        }

        user.incrementOrderCount();

        const result = await this.userRepository.save(user);
        if (!result.success) {
            throw result.error;
        }
    }

    async compensate(): Promise<void> {
        const user = await this.userRepository.findById(this.userId);
        if (user) {
            user.decrementOrderCount();
            await this.userRepository.save(user);
        }
    }
}
