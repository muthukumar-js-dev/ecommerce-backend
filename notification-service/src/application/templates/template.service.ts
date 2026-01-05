import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { NotificationType } from '@domain/notification.entity';

/**
 * Template Service
 * Manages email templates using Handlebars
 */
export class TemplateService {
    private templates = new Map<NotificationType, HandlebarsTemplateDelegate>();
    private templatesDir: string;

    constructor(templatesDir: string = './templates') {
        this.templatesDir = templatesDir;
    }

    /**
     * Initialize template service
     * Load all templates and register helpers
     */
    async initialize(): Promise<void> {
        await this.loadTemplates();
        this.registerHelpers();
    }

    /**
     * Load all email templates from disk
     */
    private async loadTemplates(): Promise<void> {
        const templateMappings: Record<NotificationType, string> = {
            [NotificationType.WELCOME_EMAIL]: 'welcome-email.html',
            [NotificationType.ORDER_CONFIRMATION]: 'order-confirmation.html',
            [NotificationType.ORDER_SHIPPED]: 'order-shipped.html',
            [NotificationType.ORDER_DELIVERED]: 'order-delivered.html',
            [NotificationType.PAYMENT_RECEIPT]: 'payment-receipt.html',
            [NotificationType.PASSWORD_RESET]: 'password-reset.html',
        };

        for (const [type, filename] of Object.entries(templateMappings)) {
            try {
                const filePath = path.join(this.templatesDir, filename);
                const content = await fs.readFile(filePath, 'utf-8');
                const template = Handlebars.compile(content);
                this.templates.set(type as NotificationType, template);
            } catch (error) {
                console.error(`Failed to load template ${filename}:`, error);
                throw error;
            }
        }

        console.log(`✅ Loaded ${this.templates.size} email templates`);
    }

    /**
     * Register Handlebars helpers
     */
    private registerHelpers(): void {
        // Format currency in Indian Rupees
        Handlebars.registerHelper('formatCurrency', (amount: number) => {
            return `₹${amount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        });

        // Format date
        Handlebars.registerHelper('formatDate', (date: Date) => {
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        });

        // Format time
        Handlebars.registerHelper('formatTime', (date: Date) => {
            return new Date(date).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
            });
        });
    }

    /**
     * Render a template with data
     */
    render(type: NotificationType, data: any): string {
        const template = this.templates.get(type);
        if (!template) {
            throw new Error(`Template not found for type: ${type}`);
        }

        return template(data);
    }

    /**
     * Get subject line for notification type
     */
    getSubject(type: NotificationType, data: any): string {
        const subjects: Record<NotificationType, string> = {
            [NotificationType.WELCOME_EMAIL]: `Welcome to ${data.platformName}!`,
            [NotificationType.ORDER_CONFIRMATION]: `Order Confirmed - ${data.orderNumber}`,
            [NotificationType.ORDER_SHIPPED]: `Your Order Has Shipped - ${data.orderNumber}`,
            [NotificationType.ORDER_DELIVERED]: `Order Delivered - ${data.orderNumber}`,
            [NotificationType.PAYMENT_RECEIPT]: `Payment Receipt - ${data.orderNumber}`,
            [NotificationType.PASSWORD_RESET]: 'Reset Your Password',
        };

        return subjects[type];
    }
}
