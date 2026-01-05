import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { TemplateService } from '@application/templates/template.service';
import { NotificationType } from '@domain/notification.entity';

describe('Email Flow Integration Test', () => {
    let templateService: TemplateService;

    beforeAll(async () => {
        templateService = new TemplateService('./templates');
        await templateService.initialize();
    });

    it('should render and prepare welcome email', async () => {
        const data = {
            name: 'Test User',
            email: 'test@example.com',
            platformName: 'E-Commerce Platform',
            loginUrl: 'http://localhost:3000/login',
        };

        const subject = templateService.getSubject(NotificationType.WELCOME_EMAIL, data);
        const body = templateService.render(NotificationType.WELCOME_EMAIL, data);

        expect(subject).toBe('Welcome to E-Commerce Platform!');
        expect(body).toContain('Test User');
        expect(body).toContain('test@example.com');
    });

    it('should render order confirmation with items', async () => {
        const data = {
            customerName: 'John Doe',
            orderNumber: 'ORD-12345',
            orderDate: new Date(),
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            items: [
                { name: 'Product 1', quantity: 2, price: 100 },
                { name: 'Product 2', quantity: 1, price: 200 },
            ],
            subtotal: 400,
            shipping: 50,
            tax: 45,
            total: 495,
            shippingAddress: {
                recipientName: 'John Doe',
                street: '123 Main St',
                city: 'Mumbai',
                state: 'Maharashtra',
                postalCode: '400001',
                country: 'India',
            },
        };

        const body = templateService.render(NotificationType.ORDER_CONFIRMATION, data);

        expect(body).toContain('ORD-12345');
        expect(body).toContain('Product 1');
        expect(body).toContain('Product 2');
        expect(body).toContain('Mumbai');
    });
});
