import { AsyncResult } from '@shared/types/result';

/**
 * Email message structure
 */
export interface EmailMessage {
    to: string;
    subject: string;
    body: string;
    from?: string;
}

/**
 * Email service port (Anti-Corruption Layer)
 */
export interface IEmailService {
    /**
     * Send a single email
     */
    send(message: EmailMessage): AsyncResult<{ messageId: string }>;

    /**
     * Send multiple emails in bulk
     */
    sendBulk(messages: EmailMessage[]): AsyncResult<{ messageIds: string[] }>;
}
