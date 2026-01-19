import { IEmailService, EmailMessage } from '@application/ports/email.port';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors/external-service.error';

/**
 * Console Email Adapter for development
 * Logs emails to console instead of sending them
 * Can be replaced with SES/SendGrid adapter in production
 */
export class ConsoleEmailAdapter implements IEmailService {
    send(message: EmailMessage): AsyncResult<{ messageId: string }> {
        try {
            console.log('📧 Email sent:');
            console.log(`  To: ${message.to}`);
            console.log(`  Subject: ${message.subject}`);
            console.log(`  Template: ${message.template}`);
            console.log(`  Data:`, JSON.stringify(message.data, null, 2));

            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            return Promise.resolve(success({ messageId }));
        } catch (error: any) {
            return Promise.resolve(failure(
                new ExternalServiceError('EmailService', 'Failed to send email', error)
            ));
        }
    }

    async sendBulk(messages: EmailMessage[]): AsyncResult<{ messageIds: string[] }> {
        try {
            console.log(`📧 Sending ${messages.length} bulk emails...`);

            const messageIds: string[] = [];
            for (const message of messages) {
                const result = await this.send(message);
                if (result.success) {
                    messageIds.push(result.data.messageId);
                } else {
                    throw result.error;
                }
            }

            return success({ messageIds });
        } catch (error: any) {
            return failure(
                new ExternalServiceError('EmailService', 'Failed to send bulk emails', error)
            );
        }
    }
}
