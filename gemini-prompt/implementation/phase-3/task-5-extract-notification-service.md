# Phase 3 - Task 5: Extract Notification Service

**Duration:** 5-6 days  
**Priority:** Medium  
**Dependencies:** Tasks 1-3 (Kafka Infrastructure)

---

## Objective

Extract notification handling into a standalone, stateless microservice that consumes events and sends emails/SMS with template management and delivery tracking.

---

## Context

The Notification Service will:
- Be completely stateless (no database required initially)
- Consume events from Kafka
- Send emails via SendGrid/AWS SES
- Send SMS via Twilio (future)
- Manage email templates
- Track delivery status
- Handle failures with retry

---

## Implementation Steps

### Step 1: Create Notification Service Structure

**Create service directory:**

```
notification-service/
├── src/
│   ├── domain/
│   │   ├── notification.entity.ts
│   │   ├── template.entity.ts
│   │   └── events/
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── send-email.use-case.ts
│   │   │   └── send-sms.use-case.ts
│   │   └── templates/
│   │       ├── template.service.ts
│   │       └── templates/
│   ├── infrastructure/
│   │   ├── messaging/
│   │   │   ├── consumer-groups.ts
│   │   │   └── handlers/
│   │   ├── email/
│   │   │   ├── sendgrid.adapter.ts
│   │   │   └── ses.adapter.ts
│   │   ├── sms/
│   │   │   └── twilio.adapter.ts
│   │   └── database/
│   │       └── models/
│   ├── api/
│   │   ├── routes/
│   │   └── controllers/
│   └── main.ts
├── templates/
│   ├── welcome-email.html
│   ├── order-confirmation.html
│   └── shipping-notification.html
├── tests/
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Step 2: Domain Model

**Create `notification-service/src/domain/notification.entity.ts`:**

```typescript
import { Entity } from '@shared/domain/entity';
import { ID, Timestamp } from '@shared/types/common';

export enum NotificationType {
  WELCOME_EMAIL = 'WELCOME_EMAIL',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

export interface NotificationProps {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  sentAt?: Timestamp;
  failureReason?: string;
  metadata: Record<string, any>;
  retryCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Notification extends Entity<NotificationProps> {
  private constructor(props: NotificationProps, id: ID) {
    super(props, id);
  }

  static create(
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
    subject: string | undefined,
    body: string,
    metadata: Record<string, any>,
    id: ID
  ): Notification {
    const now = new Date();
    return new Notification(
      {
        type,
        channel,
        recipient,
        subject,
        body,
        status: NotificationStatus.PENDING,
        metadata,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  markAsSent(): void {
    this.props.status = NotificationStatus.SENT;
    this.props.sentAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsFailed(reason: string): void {
    this.props.status = NotificationStatus.FAILED;
    this.props.failureReason = reason;
    this.props.retryCount += 1;
    this.props.updatedAt = new Date();
  }

  canRetry(): boolean {
    return this.props.retryCount < 3;
  }

  get recipient(): string {
    return this.props.recipient;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get status(): NotificationStatus {
    return this.props.status;
  }
}
```

### Step 3: Template Service

**Create `notification-service/src/application/templates/template.service.ts`:**

```typescript
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { NotificationType } from '@domain/notification.entity';

export class TemplateService {
  private templates = new Map<NotificationType, HandlebarsTemplateDelegate>();
  private templatesDir: string;

  constructor(templatesDir: string = './templates') {
    this.templatesDir = templatesDir;
  }

  async initialize(): Promise<void> {
    await this.loadTemplates();
    this.registerHelpers();
  }

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
      const filePath = path.join(this.templatesDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const template = Handlebars.compile(content);
      this.templates.set(type as NotificationType, template);
    }

    console.log(`Loaded ${this.templates.size} email templates`);
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    });

    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });
  }

  render(type: NotificationType, data: any): string {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }

    return template(data);
  }

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
```

**Create `notification-service/templates/welcome-email.html`:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background-color: #f9f9f9;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to {{platformName}}!</h1>
  </div>
  <div class="content">
    <h2>Hi {{name}},</h2>
    <p>Thank you for joining our platform. We're excited to have you on board!</p>
    <p>Your account has been successfully created with the email: <strong>{{email}}</strong></p>
    <p>Here's what you can do next:</p>
    <ul>
      <li>Browse our product catalog</li>
      <li>Add items to your wishlist</li>
      <li>Start shopping and enjoy exclusive deals</li>
    </ul>
    <a href="{{loginUrl}}" class="button">Get Started</a>
  </div>
  <div class="footer">
    <p>If you have any questions, please contact us at support@example.com</p>
    <p>&copy; 2026 {{platformName}}. All rights reserved.</p>
  </div>
</body>
</html>
```

**Create `notification-service/templates/order-confirmation.html`:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .order-details { background-color: #f5f5f5; padding: 15px; margin: 20px 0; }
    .item { border-bottom: 1px solid #ddd; padding: 10px 0; }
    .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Order Confirmed!</h1>
  </div>
  <div class="content">
    <h2>Hi {{customerName}},</h2>
    <p>Thank you for your order. We've received it and will process it shortly.</p>
    
    <div class="order-details">
      <h3>Order Details</h3>
      <p><strong>Order Number:</strong> {{orderNumber}}</p>
      <p><strong>Order Date:</strong> {{formatDate orderDate}}</p>
      <p><strong>Estimated Delivery:</strong> {{formatDate estimatedDelivery}}</p>
      
      <h4>Items:</h4>
      {{#each items}}
      <div class="item">
        <p><strong>{{this.name}}</strong></p>
        <p>Quantity: {{this.quantity}} × {{formatCurrency this.price}}</p>
      </div>
      {{/each}}
      
      <div class="total">
        <p>Subtotal: {{formatCurrency subtotal}}</p>
        <p>Shipping: {{formatCurrency shipping}}</p>
        <p>Tax: {{formatCurrency tax}}</p>
        <p>Total: {{formatCurrency total}}</p>
      </div>
    </div>
    
    <h3>Shipping Address</h3>
    <p>
      {{shippingAddress.recipientName}}<br>
      {{shippingAddress.street}}<br>
      {{shippingAddress.city}}, {{shippingAddress.state}} {{shippingAddress.postalCode}}
    </p>
  </div>
</body>
</html>
```

### Step 4: Email Adapter

**Create `notification-service/src/infrastructure/email/sendgrid.adapter.ts`:**

```typescript
import sgMail from '@sendgrid/mail';
import { IEmailService, EmailMessage } from '@application/ports/email.port';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors';

export class SendGridAdapter implements IEmailService {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(message: EmailMessage): AsyncResult<{ messageId: string }> {
    try {
      const msg = {
        to: message.to,
        from: process.env.FROM_EMAIL || 'noreply@example.com',
        subject: message.subject,
        html: message.body,
        text: this.stripHtml(message.body),
      };

      const [response] = await sgMail.send(msg);

      return success({
        messageId: response.headers['x-message-id'] || 'unknown',
      });
    } catch (error: any) {
      return failure(
        new ExternalServiceError('SendGrid', 'Failed to send email', error)
      );
    }
  }

  async sendBulk(messages: EmailMessage[]): AsyncResult<{ messageIds: string[] }> {
    try {
      const msgs = messages.map((message) => ({
        to: message.to,
        from: process.env.FROM_EMAIL || 'noreply@example.com',
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
      return failure(
        new ExternalServiceError('SendGrid', 'Failed to send bulk emails', error)
      );
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}
```

### Step 5: Use Cases

**Create `notification-service/src/application/use-cases/send-email.use-case.ts`:**

```typescript
import { NotificationType, Notification } from '@domain/notification.entity';
import { TemplateService } from '../templates/template.service';
import { IEmailService } from '../ports/email.port';
import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';

export interface SendEmailRequest {
  type: NotificationType;
  recipient: string;
  data: Record<string, any>;
}

export class SendEmailUseCase {
  constructor(
    private templateService: TemplateService,
    private emailService: IEmailService,
    private notificationRepo: INotificationRepository
  ) {}

  async execute(request: SendEmailRequest): AsyncResult<{ notificationId: string }> {
    // Render template
    const subject = this.templateService.getSubject(request.type, request.data);
    const body = this.templateService.render(request.type, request.data);

    // Create notification entity
    const notificationId = this.generateId();
    const notification = Notification.create(
      request.type,
      'EMAIL' as any,
      request.recipient,
      subject,
      body,
      request.data,
      notificationId
    );

    // Save notification
    await this.notificationRepo.save(notification);

    // Send email
    const sendResult = await this.emailService.send({
      to: request.recipient,
      subject,
      body,
    });

    if (!sendResult.success) {
      notification.markAsFailed(sendResult.error.message);
      await this.notificationRepo.update(notification);
      return failure(sendResult.error);
    }

    // Mark as sent
    notification.markAsSent();
    await this.notificationRepo.update(notification);

    return success({ notificationId });
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Step 6: Event Handlers

**Create `notification-service/src/infrastructure/messaging/handlers/user-registered.handler.ts`:**

```typescript
import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from '@shared/messaging/base-event-handler';
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { NotificationType } from '@domain/notification.entity';

export class UserRegisteredHandler extends BaseEventHandler {
  constructor(
    processedEventRepo: any,
    private sendEmailUseCase: SendEmailUseCase
  ) {
    super(processedEventRepo);
  }

  protected async processEvent(payload: EachMessagePayload): Promise<void> {
    const event = this.parseMessage<{
      userId: string;
      email: string;
      name: string;
      registeredAt: string;
    }>(payload);

    const result = await this.sendEmailUseCase.execute({
      type: NotificationType.WELCOME_EMAIL,
      recipient: event.email,
      data: {
        name: event.name,
        email: event.email,
        platformName: 'E-Commerce Platform',
        loginUrl: `${process.env.FRONTEND_URL}/login`,
      },
    });

    if (!result.success) {
      console.error(`Failed to send welcome email to ${event.email}:`, result.error);
      throw result.error;
    }

    console.log(`Welcome email sent to ${event.email}`);
  }
}
```

**Create `notification-service/src/infrastructure/messaging/handlers/order-placed.handler.ts`:**

```typescript
import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from '@shared/messaging/base-event-handler';
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { NotificationType } from '@domain/notification.entity';

export class OrderPlacedHandler extends BaseEventHandler {
  constructor(
    processedEventRepo: any,
    private sendEmailUseCase: SendEmailUseCase
  ) {
    super(processedEventRepo);
  }

  protected async processEvent(payload: EachMessagePayload): Promise<void> {
    const event = this.parseMessage<{
      orderId: string;
      orderNumber: string;
      userId: string;
      userEmail: string;
      customerName: string;
      items: any[];
      subtotal: number;
      shipping: number;
      tax: number;
      total: number;
      shippingAddress: any;
      estimatedDelivery: string;
    }>(payload);

    const result = await this.sendEmailUseCase.execute({
      type: NotificationType.ORDER_CONFIRMATION,
      recipient: event.userEmail,
      data: {
        customerName: event.customerName,
        orderNumber: event.orderNumber,
        orderDate: new Date(),
        estimatedDelivery: new Date(event.estimatedDelivery),
        items: event.items,
        subtotal: event.subtotal,
        shipping: event.shipping,
        tax: event.tax,
        total: event.total,
        shippingAddress: event.shippingAddress,
      },
    });

    if (!result.success) {
      console.error(`Failed to send order confirmation to ${event.userEmail}:`, result.error);
      throw result.error;
    }

    console.log(`Order confirmation sent for order ${event.orderNumber}`);
  }
}
```

### Step 7: Service Bootstrap

**Create `notification-service/src/main.ts`:**

```typescript
import express from 'express';
import { createKafkaClient, getKafkaConfig } from '@shared/messaging/kafka/kafka.config';
import { ConsumerGroups } from './infrastructure/messaging/consumer-groups';
import { TemplateService } from './application/templates/template.service';
import { SendGridAdapter } from './infrastructure/email/sendgrid.adapter';
import { SendEmailUseCase } from './application/use-cases/send-email.use-case';
import mongoose from 'mongoose';

async function bootstrap() {
  // Connect to database (for notification tracking)
  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/notification-service'
  );
  console.log('Connected to MongoDB');

  // Initialize template service
  const templateService = new TemplateService('./templates');
  await templateService.initialize();

  // Setup email service
  const emailService = new SendGridAdapter(process.env.SENDGRID_API_KEY || '');

  // Setup Kafka
  const kafkaConfig = getKafkaConfig();
  const kafka = createKafkaClient(kafkaConfig);

  // Start consumer groups
  const consumerGroups = new ConsumerGroups(kafka, templateService, emailService);
  await consumerGroups.startAll();

  // Setup Express (for health checks and manual triggers)
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'notification-service' });
  });

  // Manual email trigger (for testing)
  app.post('/api/notifications/send', async (req, res) => {
    const { type, recipient, data } = req.body;
    
    const useCase = new SendEmailUseCase(
      templateService,
      emailService,
      /* notification repo */
    );

    const result = await useCase.execute({ type, recipient, data });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error.message });
    }
  });

  // Start server
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Notification service listening on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await consumerGroups.stopAll();
    await mongoose.disconnect();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start notification service:', error);
  process.exit(1);
});
```

---

## Testing

**Create `notification-service/tests/integration/email-flow.test.ts`:**

```typescript
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { NotificationType } from '@domain/notification.entity';

describe('Email Flow', () => {
  let sendEmailUseCase: SendEmailUseCase;

  beforeAll(async () => {
    // Setup test environment
  });

  it('should send welcome email', async () => {
    const result = await sendEmailUseCase.execute({
      type: NotificationType.WELCOME_EMAIL,
      recipient: 'test@example.com',
      data: {
        name: 'Test User',
        email: 'test@example.com',
        platformName: 'Test Platform',
        loginUrl: 'http://localhost:3000/login',
      },
    });

    expect(result.success).toBe(true);
  });

  it('should render order confirmation template', async () => {
    // Test template rendering
  });
});
```

---

## Deliverables

- [ ] Notification service application
- [ ] Template service with Handlebars
- [ ] Email templates (HTML)
- [ ] SendGrid integration
- [ ] Event handlers (UserRegistered, OrderPlaced, etc.)
- [ ] Notification tracking (optional database)
- [ ] Manual trigger API
- [ ] Docker configuration
- [ ] Tests
- [ ] Documentation

---

## Next Steps

After completing this task:
1. Proceed to **Task 6: Implement Saga Pattern**
2. Add SMS support (Twilio)
3. Add push notifications

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 5-6 days  
**Status:** Not Started
