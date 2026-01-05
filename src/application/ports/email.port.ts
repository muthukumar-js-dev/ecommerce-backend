import { AsyncResult } from '@shared/types/result';

export interface EmailMessage {
    to: string;
    subject: string;
    template: string;
    data: Record<string, any>;
}

export interface IEmailService {
    send(message: EmailMessage): AsyncResult<{ messageId: string }>;
    sendBulk(messages: EmailMessage[]): AsyncResult<{ messageIds: string[] }>;
}
