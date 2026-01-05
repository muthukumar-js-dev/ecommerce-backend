import { Order } from '@domain/order/aggregates/order.aggregate';
import { OrderItem } from '@domain/order/entities/order-item.entity';
import { OrderStatus } from '@domain/order/value-objects/order-status.vo';
import { ShippingAddress } from '@domain/order/value-objects/shipping-address.vo';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';

describe('Order Aggregate', () => {
    describe('Creation', () => {
        it('should create a new order with valid data', () => {
            const order = createTestOrder();

            expect(order).toBeDefined();
            expect(order.id.value).toBe('order-123');
            expect(order.userId).toBe('user-123');
            expect(order.status.value).toBe('PENDING');
            expect(order.items.length).toBe(2);
        });

        it('should raise OrderPlaced event on creation', () => {
            const order = createTestOrder();

            const events = order.domainEvents;
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('OrderPlaced');
            expect(events[0].payload.orderId).toBe('order-123');
            expect(events[0].payload.userId).toBe('user-123');
        });

        it('should calculate total amount correctly', () => {
            const order = createTestOrder();

            // Item 1: 2 * 100 = 200
            // Item 2: 1 * 50 = 50
            // Total: 250
            expect(order.totalAmount.amount).toBe(250);
        });

        it('should require at least one item', () => {
            expect(() =>
                Order.create(
                    {
                        userId: 'user-123',
                        items: [],
                        shippingAddress: createTestAddress(),
                        paymentMethodId: 'payment-123',
                    },
                    'order-123'
                )
            ).toThrow('at least one item');
        });
    });

    describe('State Transitions', () => {
        it('should transition from PENDING to CONFIRMED', () => {
            const order = createTestOrder();

            order.confirm();

            expect(order.status.value).toBe('CONFIRMED');
        });

        it('should transition from CONFIRMED to SHIPPED', () => {
            const order = createTestOrder();
            order.confirm();

            order.ship('TRACK-123');

            expect(order.status.value).toBe('SHIPPED');
            expect(order.trackingNumber).toBe('TRACK-123');
        });

        it('should transition from SHIPPED to DELIVERED', () => {
            const order = createTestOrder();
            order.confirm();
            order.ship('TRACK-123');

            order.deliver();

            expect(order.status.value).toBe('DELIVERED');
        });

        it('should allow cancellation from PENDING', () => {
            const order = createTestOrder();

            order.cancel('Customer request');

            expect(order.status.value).toBe('CANCELLED');
        });

        it('should prevent shipping before confirmation', () => {
            const order = createTestOrder();

            expect(() => order.ship('TRACK-123')).toThrow('must be confirmed');
        });

        it('should prevent delivery before shipping', () => {
            const order = createTestOrder();
            order.confirm();

            expect(() => order.deliver()).toThrow('must be shipped');
        });

        it('should prevent cancellation after delivery', () => {
            const order = createTestOrder();
            order.confirm();
            order.ship('TRACK-123');
            order.deliver();

            expect(() => order.cancel('Too late')).toThrow('cannot cancel');
        });
    });

    describe('Order Items', () => {
        it('should add item to order', () => {
            const order = createTestOrder();
            const initialCount = order.items.length;

            const newItem = OrderItem.create({
                productId: 'prod-789',
                productName: 'New Product',
                quantity: Quantity.create(1),
                price: Money.create(75),
            });

            order.addItem(newItem);

            expect(order.items.length).toBe(initialCount + 1);
            expect(order.totalAmount.amount).toBe(325); // 250 + 75
        });

        it('should remove item from order', () => {
            const order = createTestOrder();
            const itemToRemove = order.items[0];

            order.removeItem(itemToRemove.id);

            expect(order.items.length).toBe(1);
            expect(order.totalAmount.amount).toBe(50); // Only item 2 remains
        });

        it('should update item quantity', () => {
            const order = createTestOrder();
            const item = order.items[0];

            order.updateItemQuantity(item.id, Quantity.create(5));

            expect(item.quantity.value).toBe(5);
            expect(order.totalAmount.amount).toBe(550); // (5 * 100) + 50
        });

        it('should prevent modifications after confirmation', () => {
            const order = createTestOrder();
            order.confirm();

            const newItem = OrderItem.create({
                productId: 'prod-789',
                productName: 'New Product',
                quantity: Quantity.create(1),
                price: Money.create(75),
            });

            expect(() => order.addItem(newItem)).toThrow('cannot modify');
        });
    });

    describe('Calculations', () => {
        it('should calculate subtotal correctly', () => {
            const order = createTestOrder();

            expect(order.subtotal.amount).toBe(250);
        });

        it('should calculate total with shipping', () => {
            const order = createTestOrder();
            order.setShippingCost(Money.create(20));

            expect(order.totalAmount.amount).toBe(270); // 250 + 20
        });

        it('should calculate total with tax', () => {
            const order = createTestOrder();
            order.setTax(Money.create(25)); // 10% tax

            expect(order.totalAmount.amount).toBe(275); // 250 + 25
        });

        it('should calculate total with shipping and tax', () => {
            const order = createTestOrder();
            order.setShippingCost(Money.create(20));
            order.setTax(Money.create(27)); // 10% of 270

            expect(order.totalAmount.amount).toBe(297); // 250 + 20 + 27
        });

        it('should count total items correctly', () => {
            const order = createTestOrder();

            expect(order.itemCount).toBe(3); // 2 + 1
        });
    });

    describe('Domain Events', () => {
        it('should raise OrderConfirmed event', () => {
            const order = createTestOrder();
            order.clearDomainEvents();

            order.confirm();

            const events = order.domainEvents;
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('OrderConfirmed');
        });

        it('should raise OrderShipped event', () => {
            const order = createTestOrder();
            order.confirm();
            order.clearDomainEvents();

            order.ship('TRACK-123');

            const events = order.domainEvents;
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('OrderShipped');
            expect(events[0].payload.trackingNumber).toBe('TRACK-123');
        });

        it('should raise OrderCancelled event', () => {
            const order = createTestOrder();
            order.clearDomainEvents();

            order.cancel('Customer request');

            const events = order.domainEvents;
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('OrderCancelled');
            expect(events[0].payload.reason).toBe('Customer request');
        });
    });
});

function createTestOrder(): Order {
    const items = [
        OrderItem.create({
            productId: 'prod-123',
            productName: 'Product 1',
            quantity: Quantity.create(2),
            price: Money.create(100),
        }),
        OrderItem.create({
            productId: 'prod-456',
            productName: 'Product 2',
            quantity: Quantity.create(1),
            price: Money.create(50),
        }),
    ];

    return Order.create(
        {
            userId: 'user-123',
            items,
            shippingAddress: createTestAddress(),
            paymentMethodId: 'payment-123',
        },
        'order-123'
    );
}

function createTestAddress(): ShippingAddress {
    return ShippingAddress.create({
        name: 'Test User',
        firstLine: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Test Country',
        phone: '1234567890',
    });
}
