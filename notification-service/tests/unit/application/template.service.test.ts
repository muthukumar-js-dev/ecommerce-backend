import { TemplateService } from '@application/templates/template.service';
import { NotificationType } from '@domain/notification.entity';

describe('TemplateService', () => {
    let templateService: TemplateService;

    beforeAll(async () => {
        templateService = new TemplateService('./templates');
        await templateService.initialize();
    });

    it('should load all templates', () => {
        expect(templateService).toBeDefined();
    });

    it('should render welcome email template', () => {
        const html = templateService.render(NotificationType.WELCOME_EMAIL, {
            name: 'John Doe',
            email: 'john@example.com',
            platformName: 'Test Platform',
            loginUrl: 'http://localhost:3000/login',
        });

        expect(html).toContain('John Doe');
        expect(html).toContain('john@example.com');
        expect(html).toContain('Test Platform');
    });

    it('should generate correct subject for welcome email', () => {
        const subject = templateService.getSubject(NotificationType.WELCOME_EMAIL, {
            platformName: 'Test Platform',
        });

        expect(subject).toBe('Welcome to Test Platform!');
    });

    it('should generate correct subject for order confirmation', () => {
        const subject = templateService.getSubject(NotificationType.ORDER_CONFIRMATION, {
            orderNumber: 'ORD-12345',
        });

        expect(subject).toBe('Order Confirmed - ORD-12345');
    });
});
