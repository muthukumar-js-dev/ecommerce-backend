import sgMail from '@sendgrid/mail';
import { IEmailService, EmailMessage } from '@application/ports/email.port';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors/external-service.error';

/**
 * SendGrid Email Adapter
 * Anti-Corruption Layer for SendGrid API
 */
export class SendGridAdapter implements IEmailService {
    constructor(apiKey: string, private fromEmail: string = 'noreply@example.com') {
        sgMail.setApiKey(apiKey);
    }

    async send(message: EmailMessage): AsyncResult<{ messageId: string }> {
        try {
            const msg = {
                to: message.to,
                from: message.from || this.fromEmail,
                subject: message.subject,
                html: message.body,
                text: this.stripHtml(message.body),
            };

            const [response] = await sgMail.send(msg);

            return success({
                messageId: response.headers['x-message-id'] || 'unknown',
            });
        } catch (error: any) {
            console.error('SendGrid error:', error.response?.body || error.message);
            return failure(
                new ExternalServiceError('SendGrid', 'Failed to send email', error)
            );
        }
    }

    async sendBulk(messages: EmailMessage[]): AsyncResult<{ messageIds: string[] }> {
        try {
            const msgs = messages.map((message) => ({
                to: message.to,
                from: message.from || this.fromEmail,
                subject: message.subject,
                html: message.body,
                text: this.stripHtml(message.body),
            }));

            const responses = await sgMail.send(msgs);

            const messageIds = responses.map(
                (r) => r[0].headers['x-message-id'] || 'unknown'
            );

            return success({ messageIds });
        } catch (error: any) {
            console.error('SendGrid bulk error:', error.response?.body || error.message);
            return failure(
                new ExternalServiceError('SendGrid', 'Failed to send bulk emails', error)
            );
        }
    }

    /**
     * Strip HTML tags to create plain text version
     */
    private stripHtml(html: string): string {
        return html
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
