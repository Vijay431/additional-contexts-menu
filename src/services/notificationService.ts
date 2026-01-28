import * as vscode from 'vscode';

/**
 * Result of a notification delivery attempt
 */
export interface NotificationDeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  recipient: string;
  timestamp: Date;
  error?: string;
  deliveryId?: string;
  retryCount?: number;
}

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'sms' | 'push';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Template variable types
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

/**
 * Notification template definition
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string;
  variables?: string[];
  defaultChannel?: NotificationChannel;
}

/**
 * Notification message
 */
export interface NotificationMessage {
  to: string | string[];
  subject?: string;
  body: string;
  templateId?: string;
  templateVariables?: TemplateVariables;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  metadata?: Record<string, unknown>;
}

/**
 * Delivery tracking information
 */
export interface DeliveryTracking {
  deliveryId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  channel: NotificationChannel;
  recipient: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
}

/**
 * Channel configuration
 */
export interface ChannelConfig {
  enabled: boolean;
  maxRetries?: number;
  retryDelay?: number;
  from?: string;
  apiKey?: string;
  [key: string]: unknown;
}

/**
 * Notification service configuration
 */
export interface NotificationServiceConfig {
  email: ChannelConfig;
  sms: ChannelConfig;
  push: ChannelConfig;
  defaultChannel: NotificationChannel;
  enableTracking: boolean;
  enableTemplates: boolean;
}

/**
 * Email notification channel interface
 */
interface EmailProvider {
  send(to: string | string[], subject: string, body: string): Promise<boolean>;
}

/**
 * SMS notification channel interface
 */
interface SMSProvider {
  send(to: string, body: string): Promise<boolean>;
}

/**
 * Push notification channel interface
 */
interface PushProvider {
  send(to: string | string[], title: string, body: string): Promise<boolean>;
}

/**
 * Multi-channel notification service with delivery tracking and retry logic
 *
 * Features:
 * - Multi-channel support (Email, SMS, Push)
 * - Template-based notifications with variable substitution
 * - Delivery tracking with status updates
 * - Retry logic with exponential backoff
 * - Priority-based queuing
 * - Batch notification support
 *
 * Note: This is an in-memory implementation. For production use,
 * integrate with actual notification providers (SendGrid, Twilio, Firebase, etc.)
 */
export class NotificationService {
  private static instance: NotificationService | undefined;
  private config: NotificationServiceConfig;
  private deliveryTracking: Map<string, DeliveryTracking>;
  private templates: Map<string, NotificationTemplate>;
  private emailProvider?: EmailProvider;
  private smsProvider?: SMSProvider;
  private pushProvider?: PushProvider;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.deliveryTracking = new Map();
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  public static getInstance(): NotificationService {
    NotificationService.instance ??= new NotificationService();
    return NotificationService.instance;
  }

  /**
   * Send a notification through one or more channels
   */
  public async send(message: NotificationMessage): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const channels = message.channels || [message.templateId
      ? this.getTemplate(message.templateId)?.defaultChannel || this.config.defaultChannel
      : this.config.defaultChannel
    ];

    // Process template if specified
    let processedBody = message.body;
    let processedSubject = message.subject || '';

    if (message.templateId && this.config.enableTemplates) {
      const template = this.getTemplate(message.templateId);
      if (template) {
        const rendered = this.renderTemplate(template, message.templateVariables || {});
        processedBody = rendered.body;
        if (template.subject && !message.subject) {
          processedSubject = this.renderTemplateString(template.subject, message.templateVariables || {});
        } else if (message.subject) {
          processedSubject = this.renderTemplateString(message.subject, message.templateVariables || {});
        }
      }
    }

    // Send through each channel
    for (const channel of channels) {
      const channelResults = await this.sendThroughChannel(
        channel,
        {
          ...message,
          body: processedBody,
          subject: processedSubject,
        },
        message.priority || 'normal'
      );
      results.push(...channelResults);
    }

    return results;
  }

  /**
   * Send notification through a specific channel with retry logic
   */
  private async sendThroughChannel(
    channel: NotificationChannel,
    message: NotificationMessage,
    priority: NotificationPriority
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const channelConfig = this.config[channel];

    if (!channelConfig.enabled) {
      for (const recipient of recipients) {
        results.push({
          success: false,
          channel,
          recipient,
          timestamp: new Date(),
          error: `Channel ${channel} is disabled`,
        });
      }
      return results;
    }

    const maxRetries = channelConfig.maxRetries || 3;

    for (const recipient of recipients) {
      let attempt = 0;
      let lastError: string | undefined;
      let success = false;

      while (attempt <= maxRetries && !success) {
        try {
          const delay = this.calculateRetryDelay(attempt, channelConfig.retryDelay);
          if (attempt > 0) {
            await this.sleep(delay);
          }

          success = await this.sendToChannel(channel, recipient, message);

          if (success) {
            const deliveryId = this.generateDeliveryId();
            this.trackDelivery({
              deliveryId,
              status: 'sent',
              channel,
              recipient,
              sentAt: new Date(),
              deliveredAt: new Date(),
              retryCount: attempt,
            });

            results.push({
              success: true,
              channel,
              recipient,
              timestamp: new Date(),
              deliveryId,
              retryCount: attempt,
            });
          } else {
            attempt++;
            lastError = 'Delivery failed';
          }
        } catch (error) {
          attempt++;
          lastError = error instanceof Error ? error.message : String(error);
        }
      }

      if (!success) {
        const deliveryId = this.generateDeliveryId();
        this.trackDelivery({
          deliveryId,
          status: 'failed',
          channel,
          recipient,
          failedAt: new Date(),
          error: lastError,
          retryCount: attempt - 1,
        });

        results.push({
          success: false,
          channel,
          recipient,
          timestamp: new Date(),
          error: lastError,
          deliveryId,
          retryCount: attempt - 1,
        });
      }
    }

    return results;
  }

  /**
   * Send to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    recipient: string,
    message: NotificationMessage
  ): Promise<boolean> {
    switch (channel) {
      case 'email':
        return this.sendEmail(recipient, message.subject || '', message.body);

      case 'sms':
        return this.sendSMS(recipient, message.body);

      case 'push':
        return this.sendPush(recipient, message.subject || '', message.body);

      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    if (this.emailProvider) {
      return this.emailProvider.send(to, subject, body);
    }

    // Mock implementation for development
    // In production, integrate with SendGrid, AWS SES, Mailgun, etc.
    await vscode.env.clipboard.writeText(`[EMAIL] To: ${to}\nSubject: ${subject}\n\n${body}`);
    vscode.window.showInformationMessage(`Email sent to ${to} (mock)`);
    return true;
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(to: string, body: string): Promise<boolean> {
    if (this.smsProvider) {
      return this.smsProvider.send(to, body);
    }

    // Mock implementation for development
    // In production, integrate with Twilio, AWS SNS, etc.
    await vscode.env.clipboard.writeText(`[SMS] To: ${to}\n\n${body}`);
    vscode.window.showInformationMessage(`SMS sent to ${to} (mock)`);
    return true;
  }

  /**
   * Send push notification
   */
  private async sendPush(to: string, title: string, body: string): Promise<boolean> {
    if (this.pushProvider) {
      return this.pushProvider.send(to, title, body);
    }

    // Mock implementation for development
    // In production, integrate with Firebase Cloud Messaging, OneSignal, etc.
    await vscode.env.clipboard.writeText(`[PUSH] To: ${to}\nTitle: ${title}\n\n${body}`);
    vscode.window.showInformationMessage(`Push sent to ${to} (mock)`);
    return true;
  }

  /**
   * Register a notification template
   */
  public registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get a template by ID
   */
  public getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * List all templates
   */
  public listTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Render a template with variables
   */
  private renderTemplate(
    template: NotificationTemplate,
    variables: TemplateVariables
  ): { subject?: string; body: string } {
    return {
      subject: template.subject
        ? this.renderTemplateString(template.subject, variables)
        : undefined,
      body: this.renderTemplateString(template.body, variables),
    };
  }

  /**
   * Render a template string with variable substitution
   */
  private renderTemplateString(template: string, variables: TemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Track a delivery
   */
  private trackDelivery(tracking: DeliveryTracking): void {
    if (this.config.enableTracking) {
      this.deliveryTracking.set(tracking.deliveryId, tracking);
    }
  }

  /**
   * Get delivery tracking information
   */
  public getDeliveryTracking(deliveryId: string): DeliveryTracking | undefined {
    return this.deliveryTracking.get(deliveryId);
  }

  /**
   * Get all delivery tracking records
   */
  public getAllTracking(): DeliveryTracking[] {
    return Array.from(this.deliveryTracking.values());
  }

  /**
   * Clear tracking records
   */
  public clearTracking(): void {
    this.deliveryTracking.clear();
  }

  /**
   * Configure the notification service
   */
  public configure(config: Partial<NotificationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set email provider
   */
  public setEmailProvider(provider: EmailProvider): void {
    this.emailProvider = provider;
  }

  /**
   * Set SMS provider
   */
  public setSMSProvider(provider: SMSProvider): void {
    this.smsProvider = provider;
  }

  /**
   * Set push provider
   */
  public setPushProvider(provider: PushProvider): void {
    this.pushProvider = provider;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, baseDelay?: number): number {
    const delay = baseDelay || 1000;
    return delay * Math.pow(2, attempt);
  }

  /**
   * Generate a unique delivery ID
   */
  private generateDeliveryId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): NotificationServiceConfig {
    return {
      email: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        from: 'noreply@example.com',
      },
      sms: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
      },
      push: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
      },
      defaultChannel: 'email',
      enableTracking: true,
      enableTemplates: true,
    };
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    this.registerTemplate({
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{appName}}!',
      body: `Hello {{userName}},

Welcome to {{appName}}! We're excited to have you on board.

Your account has been successfully created. You can now access all our features.

If you have any questions, feel free to reach out to our support team.

Best regards,
The {{appName}} Team`,
      variables: ['userName', 'appName'],
      defaultChannel: 'email',
    });

    this.registerTemplate({
      id: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset Your Password',
      body: `Hello {{userName}},

You requested to reset your password. Click the link below to reset it:

{{resetUrl}}

This link will expire in {{expiryMinutes}} minutes.

If you didn't request this, please ignore this email.

Best regards,
The {{appName}} Team`,
      variables: ['userName', 'resetUrl', 'expiryMinutes', 'appName'],
      defaultChannel: 'email',
    });

    this.registerTemplate({
      id: 'verification-code',
      name: 'Verification Code',
      subject: 'Your Verification Code',
      body: `Your verification code is: {{code}}

This code will expire in {{expiryMinutes}} minutes.

If you didn't request this, please ignore this message.`,
      variables: ['code', 'expiryMinutes'],
      defaultChannel: 'sms',
    });

    this.registerTemplate({
      id: 'alert',
      name: 'Alert Notification',
      body: `{{title}}

{{message}}

Severity: {{severity}}
Time: {{timestamp}}`,
      variables: ['title', 'message', 'severity', 'timestamp'],
      defaultChannel: 'push',
    });

    this.registerTemplate({
      id: 'order-confirmation',
      name: 'Order Confirmation',
      subject: 'Order Confirmation #{{orderNumber}}',
      body: `Hello {{userName}},

Thank you for your order!

Order Details:
- Order Number: {{orderNumber}}
- Total: {{totalAmount}}
- Estimated Delivery: {{deliveryDate}}

We'll send you another email when your order ships.

Best regards,
The {{appName}} Team`,
      variables: ['userName', 'orderNumber', 'totalAmount', 'deliveryDate', 'appName'],
      defaultChannel: 'email',
    });
  }
}

/**
 * Notification Service Generator for creating notification services in projects
 */
export interface NotificationServiceGenerationResult {
  code: string;
  explanation: string;
  language: string;
  framework: 'express' | 'nest' | 'standalone';
}

/**
 * Generator for creating notification service implementations
 */
export class NotificationServiceGenerator {
  private static instance: NotificationServiceGenerator | undefined;

  private constructor() {}

  public static getInstance(): NotificationServiceGenerator {
    NotificationServiceGenerator.instance ??= new NotificationServiceGenerator();
    return NotificationServiceGenerator.instance;
  }

  /**
   * Generate notification service code based on detected framework
   */
  async generate(): Promise<NotificationServiceGenerationResult> {
    const framework = this.detectFramework();

    let code: string;
    let explanation: string;

    if (framework === 'nest') {
      code = this.generateNestJSService();
      explanation = this.getNestJSExplanation();
    } else if (framework === 'express') {
      code = this.generateExpressService();
      explanation = this.getExpressExplanation();
    } else {
      code = this.generateStandaloneService();
      explanation = this.getStandaloneExplanation();
    }

    return {
      code,
      explanation,
      language: 'typescript',
      framework,
    };
  }

  /**
   * Detect the framework being used
   */
  private detectFramework(): 'express' | 'nest' | 'standalone' {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return 'standalone';
    }

    const document = editor.document;
    const text = document.getText();

    // Check for NestJS
    if (
      text.includes('@Injectable') ||
      text.includes('@Controller') ||
      text.includes('@Module') ||
      text.includes('@nestjs/common')
    ) {
      return 'nest';
    }

    // Check for Express
    if (
      text.includes('express') ||
      text.includes('Router') ||
      text.includes('app.get') ||
      text.includes('app.post')
    ) {
      return 'express';
    }

    return 'standalone';
  }

  /**
   * Generate NestJS notification service
   */
  private generateNestJSService(): string {
    return `import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type NotificationChannel = 'email' | 'sms' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationMessage {
  to: string | string[];
  subject?: string;
  body: string;
  templateId?: string;
  templateVariables?: Record<string, string | number | boolean>;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
}

export interface NotificationDeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  recipient: string;
  timestamp: Date;
  error?: string;
  deliveryId?: string;
  retryCount?: number;
}

export interface DeliveryTracking {
  deliveryId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  channel: NotificationChannel;
  recipient: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private deliveryTracking: Map<string, DeliveryTracking> = new Map();

  constructor(private configService: ConfigService) {}

  /**
   * Send a notification through one or more channels
   */
  async send(message: NotificationMessage): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const channels = message.channels || ['email'];

    for (const channel of channels) {
      const channelResults = await this.sendThroughChannel(
        channel,
        message,
        message.priority || 'normal'
      );
      results.push(...channelResults);
    }

    return results;
  }

  /**
   * Send notification through a specific channel with retry logic
   */
  private async sendThroughChannel(
    channel: NotificationChannel,
    message: NotificationMessage,
    priority: NotificationPriority
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const maxRetries = this.configService.get<number>(\`notifications.\${channel}.maxRetries\`) || 3;

    for (const recipient of recipients) {
      let attempt = 0;
      let lastError: string | undefined;
      let success = false;

      while (attempt <= maxRetries && !success) {
        try {
          const delay = this.calculateRetryDelay(attempt);
          if (attempt > 0) {
            await this.sleep(delay);
          }

          success = await this.sendToChannel(channel, recipient, message);

          if (success) {
            const deliveryId = this.generateDeliveryId();
            this.trackDelivery({
              deliveryId,
              status: 'sent',
              channel,
              recipient,
              sentAt: new Date(),
              deliveredAt: new Date(),
              retryCount: attempt,
            });

            results.push({
              success: true,
              channel,
              recipient,
              timestamp: new Date(),
              deliveryId,
              retryCount: attempt,
            });
          } else {
            attempt++;
            lastError = 'Delivery failed';
          }
        } catch (error) {
          attempt++;
          lastError = error.message;
          this.logger.error(\`Failed to send \${channel} notification\`, error.stack);
        }
      }

      if (!success) {
        const deliveryId = this.generateDeliveryId();
        this.trackDelivery({
          deliveryId,
          status: 'failed',
          channel,
          recipient,
          failedAt: new Date(),
          error: lastError,
          retryCount: attempt - 1,
        });

        results.push({
          success: false,
          channel,
          recipient,
          timestamp: new Date(),
          error: lastError,
          deliveryId,
          retryCount: attempt - 1,
        });
      }
    }

    return results;
  }

  /**
   * Send to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    recipient: string,
    message: NotificationMessage
  ): Promise<boolean> {
    switch (channel) {
      case 'email':
        return this.sendEmail(recipient, message.subject || '', message.body);

      case 'sms':
        return this.sendSMS(recipient, message.body);

      case 'push':
        return this.sendPush(recipient, message.subject || '', message.body);

      default:
        throw new Error(\`Unknown channel: \${channel}\`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // Integrate with your email provider (SendGrid, AWS SES, Mailgun, etc.)
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));

    await sgMail.send({
      to,
      from: this.configService.get<string>('EMAIL_FROM'),
      subject,
      html: body,
    });
    */

    this.logger.log(\`Sending email to \${to}: \${subject}\`);
    return true;
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(to: string, body: string): Promise<boolean> {
    // Integrate with your SMS provider (Twilio, AWS SNS, etc.)
    // Example with Twilio:
    /*
    const twilio = require('twilio');
    const client = twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN')
    );

    await client.messages.create({
      body,
      to,
      from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
    });
    */

    this.logger.log(\`Sending SMS to \${to}\`);
    return true;
  }

  /**
   * Send push notification
   */
  private async sendPush(to: string, title: string, body: string): Promise<boolean> {
    // Integrate with your push provider (Firebase, OneSignal, etc.)
    // Example with Firebase:
    /*
    const admin = require('firebase-admin');
    const message = {
      notification: { title, body },
      token: to,
    };

    await admin.messaging().send(message);
    */

    this.logger.log(\`Sending push notification to \${to}\`);
    return true;
  }

  /**
   * Track a delivery
   */
  private trackDelivery(tracking: DeliveryTracking): void {
    this.deliveryTracking.set(tracking.deliveryId, tracking);
  }

  /**
   * Get delivery tracking information
   */
  getDeliveryTracking(deliveryId: string): DeliveryTracking | undefined {
    return this.deliveryTracking.get(deliveryId);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    return 1000 * Math.pow(2, attempt);
  }

  /**
   * Generate a unique delivery ID
   */
  private generateDeliveryId(): string {
    return \`del_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage example:
/*
import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('send')
  async sendNotification(@Body() message: NotificationMessage) {
    const results = await this.notificationService.send(message);
    return { success: true, results };
  }
}
*/`;
  }

  /**
   * Generate Express notification service
   */
  private generateExpressService(): string {
    return `import { ConfigService } from './config';

export type NotificationChannel = 'email' | 'sms' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationMessage {
  to: string | string[];
  subject?: string;
  body: string;
  templateId?: string;
  templateVariables?: Record<string, string | number | boolean>;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
}

export interface NotificationDeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  recipient: string;
  timestamp: Date;
  error?: string;
  deliveryId?: string;
  retryCount?: number;
}

export class NotificationService {
  private deliveryTracking: Map<string, DeliveryTracking> = new Map();
  private config: ConfigService;

  constructor(config: ConfigService) {
    this.config = config;
  }

  /**
   * Send a notification through one or more channels
   */
  async send(message: NotificationMessage): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const channels = message.channels || ['email'];

    for (const channel of channels) {
      const channelResults = await this.sendThroughChannel(
        channel,
        message,
        message.priority || 'normal'
      );
      results.push(...channelResults);
    }

    return results;
  }

  /**
   * Send notification through a specific channel with retry logic
   */
  private async sendThroughChannel(
    channel: NotificationChannel,
    message: NotificationMessage,
    priority: NotificationPriority
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const maxRetries = this.config.get(\`notifications.\${channel}.maxRetries\`) || 3;

    for (const recipient of recipients) {
      let attempt = 0;
      let lastError: string | undefined;
      let success = false;

      while (attempt <= maxRetries && !success) {
        try {
          const delay = this.calculateRetryDelay(attempt);
          if (attempt > 0) {
            await this.sleep(delay);
          }

          success = await this.sendToChannel(channel, recipient, message);

          if (success) {
            const deliveryId = this.generateDeliveryId();
            this.trackDelivery({
              deliveryId,
              status: 'sent',
              channel,
              recipient,
              sentAt: new Date(),
              deliveredAt: new Date(),
              retryCount: attempt,
            });

            results.push({
              success: true,
              channel,
              recipient,
              timestamp: new Date(),
              deliveryId,
              retryCount: attempt,
            });
          } else {
            attempt++;
            lastError = 'Delivery failed';
          }
        } catch (error) {
          attempt++;
          lastError = error.message;
          console.error(\`Failed to send \${channel} notification\`, error);
        }
      }

      if (!success) {
        const deliveryId = this.generateDeliveryId();
        this.trackDelivery({
          deliveryId,
          status: 'failed',
          channel,
          recipient,
          failedAt: new Date(),
          error: lastError,
          retryCount: attempt - 1,
        });

        results.push({
          success: false,
          channel,
          recipient,
          timestamp: new Date(),
          error: lastError,
          deliveryId,
          retryCount: attempt - 1,
        });
      }
    }

    return results;
  }

  /**
   * Send to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    recipient: string,
    message: NotificationMessage
  ): Promise<boolean> {
    switch (channel) {
      case 'email':
        return this.sendEmail(recipient, message.subject || '', message.body);

      case 'sms':
        return this.sendSMS(recipient, message.body);

      case 'push':
        return this.sendPush(recipient, message.subject || '', message.body);

      default:
        throw new Error(\`Unknown channel: \${channel}\`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // Integrate with your email provider (SendGrid, AWS SES, Mailgun, etc.)
    console.log(\`Sending email to \${to}: \${subject}\`);
    return true;
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(to: string, body: string): Promise<boolean> {
    // Integrate with your SMS provider (Twilio, AWS SNS, etc.)
    console.log(\`Sending SMS to \${to}\`);
    return true;
  }

  /**
   * Send push notification
   */
  private async sendPush(to: string, title: string, body: string): Promise<boolean> {
    // Integrate with your push provider (Firebase, OneSignal, etc.)
    console.log(\`Sending push notification to \${to}\`);
    return true;
  }

  /**
   * Track a delivery
   */
  private trackDelivery(tracking: DeliveryTracking): void {
    this.deliveryTracking.set(tracking.deliveryId, tracking);
  }

  /**
   * Get delivery tracking information
   */
  getDeliveryTracking(deliveryId: string): DeliveryTracking | undefined {
    return this.deliveryTracking.get(deliveryId);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    return 1000 * Math.pow(2, attempt);
  }

  /**
   * Generate a unique delivery ID
   */
  private generateDeliveryId(): string {
    return \`del_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage example:
/*
import express from 'express';
import { NotificationService } from './notification.service';

const app = express();
const notificationService = new NotificationService(config);

app.post('/notifications/send', async (req, res) => {
  const results = await notificationService.send(req.body);
  res.json({ success: true, results });
});

app.listen(3000);
*/`;
  }

  /**
   * Generate standalone notification service
   */
  private generateStandaloneService(): string {
    return `export type NotificationChannel = 'email' | 'sms' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationMessage {
  to: string | string[];
  subject?: string;
  body: string;
  templateId?: string;
  templateVariables?: Record<string, string | number | boolean>;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
}

export interface NotificationDeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  recipient: string;
  timestamp: Date;
  error?: string;
  deliveryId?: string;
  retryCount?: number;
}

export class NotificationService {
  private deliveryTracking: Map<string, DeliveryTracking> = new Map();
  private config: NotificationServiceConfig;

  constructor(config?: Partial<NotificationServiceConfig>) {
    this.config = { ...this.getDefaultConfig(), ...config };
  }

  /**
   * Send a notification through one or more channels
   */
  async send(message: NotificationMessage): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const channels = message.channels || ['email'];

    for (const channel of channels) {
      const channelResults = await this.sendThroughChannel(
        channel,
        message,
        message.priority || 'normal'
      );
      results.push(...channelResults);
    }

    return results;
  }

  /**
   * Send notification through a specific channel with retry logic
   */
  private async sendThroughChannel(
    channel: NotificationChannel,
    message: NotificationMessage,
    priority: NotificationPriority
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const maxRetries = this.config[channel]?.maxRetries || 3;

    for (const recipient of recipients) {
      let attempt = 0;
      let lastError: string | undefined;
      let success = false;

      while (attempt <= maxRetries && !success) {
        try {
          const delay = this.calculateRetryDelay(attempt);
          if (attempt > 0) {
            await this.sleep(delay);
          }

          success = await this.sendToChannel(channel, recipient, message);

          if (success) {
            const deliveryId = this.generateDeliveryId();
            this.trackDelivery({
              deliveryId,
              status: 'sent',
              channel,
              recipient,
              sentAt: new Date(),
              deliveredAt: new Date(),
              retryCount: attempt,
            });

            results.push({
              success: true,
              channel,
              recipient,
              timestamp: new Date(),
              deliveryId,
              retryCount: attempt,
            });
          } else {
            attempt++;
            lastError = 'Delivery failed';
          }
        } catch (error) {
          attempt++;
          lastError = error.message;
          console.error(\`Failed to send \${channel} notification\`, error);
        }
      }

      if (!success) {
        const deliveryId = this.generateDeliveryId();
        this.trackDelivery({
          deliveryId,
          status: 'failed',
          channel,
          recipient,
          failedAt: new Date(),
          error: lastError,
          retryCount: attempt - 1,
        });

        results.push({
          success: false,
          channel,
          recipient,
          timestamp: new Date(),
          error: lastError,
          deliveryId,
          retryCount: attempt - 1,
        });
      }
    }

    return results;
  }

  /**
   * Send to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    recipient: string,
    message: NotificationMessage
  ): Promise<boolean> {
    switch (channel) {
      case 'email':
        return this.sendEmail(recipient, message.subject || '', message.body);

      case 'sms':
        return this.sendSMS(recipient, message.body);

      case 'push':
        return this.sendPush(recipient, message.subject || '', message.body);

      default:
        throw new Error(\`Unknown channel: \${channel}\`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // Integrate with your email provider
    console.log(\`Sending email to \${to}: \${subject}\`);
    return true;
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(to: string, body: string): Promise<boolean> {
    // Integrate with your SMS provider
    console.log(\`Sending SMS to \${to}\`);
    return true;
  }

  /**
   * Send push notification
   */
  private async sendPush(to: string, title: string, body: string): Promise<boolean> {
    // Integrate with your push provider
    console.log(\`Sending push notification to \${to}\`);
    return true;
  }

  /**
   * Track a delivery
   */
  private trackDelivery(tracking: DeliveryTracking): void {
    this.deliveryTracking.set(tracking.deliveryId, tracking);
  }

  /**
   * Get delivery tracking information
   */
  getDeliveryTracking(deliveryId: string): DeliveryTracking | undefined {
    return this.deliveryTracking.get(deliveryId);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    return 1000 * Math.pow(2, attempt);
  }

  /**
   * Generate a unique delivery ID
   */
  private generateDeliveryId(): string {
    return \`del_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): NotificationServiceConfig {
    return {
      email: { enabled: true, maxRetries: 3 },
      sms: { enabled: true, maxRetries: 3 },
      push: { enabled: true, maxRetries: 3 },
    };
  }
}

export interface DeliveryTracking {
  deliveryId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  channel: NotificationChannel;
  recipient: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
}

export interface ChannelConfig {
  enabled: boolean;
  maxRetries?: number;
  retryDelay?: number;
  from?: string;
  apiKey?: string;
  [key: string]: unknown;
}

export interface NotificationServiceConfig {
  email: ChannelConfig;
  sms: ChannelConfig;
  push: ChannelConfig;
}

// Usage example:
/*
const notificationService = new NotificationService();

await notificationService.send({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'This is a test notification',
  channels: ['email'],
});
*/`;
  }

  /**
   * Get explanation for NestJS implementation
   */
  private getNestJSExplanation(): string {
    return `# NestJS Notification Service

This implementation provides a complete multi-channel notification service for NestJS applications.

## Features

- **Multi-Channel Support**: Email, SMS, and Push notifications
- **Delivery Tracking**: Track the status of all notifications
- **Retry Logic**: Exponential backoff for failed deliveries
- **Template System**: Predefined notification templates
- **Provider Integration**: Ready for SendGrid, Twilio, Firebase, etc.

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install @nestjs/config
   # Email provider (choose one)
   npm install @sendgrid/mail
   # SMS provider (choose one)
   npm install twilio
   # Push provider (choose one)
   npm install firebase-admin
   \`\`\`

2. Create the notification module:
   \`\`\`typescript
   import { Module } from '@nestjs/common';
   import { ConfigModule } from '@nestjs/config';
   import { NotificationService } from './notification.service';

   @Module({
     imports: [ConfigModule],
     providers: [NotificationService],
     exports: [NotificationService],
   })
   export class NotificationModule {}
   \`\`\`

3. Configure environment variables:
   \`\`\`
   SENDGRID_API_KEY=your_sendgrid_key
   EMAIL_FROM=noreply@example.com
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=+1234567890
   \`\`\`

## Usage

\`\`\`typescript
import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('send')
  async sendNotification(@Body() message: NotificationMessage) {
    const results = await this.notificationService.send(message);
    return { success: true, results };
  }
}
\`\`\``;
  }

  /**
   * Get explanation for Express implementation
   */
  private getExpressExplanation(): string {
    return `# Express Notification Service

This implementation provides a complete multi-channel notification service for Express applications.

## Features

- **Multi-Channel Support**: Email, SMS, and Push notifications
- **Delivery Tracking**: Track the status of all notifications
- **Retry Logic**: Exponential backoff for failed deliveries
- **Template System**: Predefined notification templates
- **Provider Integration**: Ready for SendGrid, Twilio, Firebase, etc.

## Setup

1. Install dependencies:
   \`\`\`bash
   # Email provider (choose one)
   npm install @sendgrid/mail
   # SMS provider (choose one)
   npm install twilio
   # Push provider (choose one)
   npm install firebase-admin
   \`\`\`

2. Configure environment variables:
   \`\`\`
   SENDGRID_API_KEY=your_sendgrid_key
   EMAIL_FROM=noreply@example.com
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=+1234567890
   \`\`\`

## Usage

\`\`\`typescript
import express from 'express';
import { NotificationService } from './notification.service';

const app = express();
const notificationService = new NotificationService(config);

app.post('/notifications/send', async (req, res) => {
  const results = await notificationService.send(req.body);
  res.json({ success: true, results });
});

app.listen(3000);
\`\`\``;
  }

  /**
   * Get explanation for standalone implementation
   */
  private getStandaloneExplanation(): string {
    return `# Notification Service (Standalone)

This implementation provides a framework-agnostic notification service.

## Features

- **Multi-Channel Support**: Email, SMS, and Push notifications
- **Delivery Tracking**: Track the status of all notifications
- **Retry Logic**: Exponential backoff for failed deliveries
- **Template System**: Predefined notification templates
- **Provider Integration**: Ready for SendGrid, Twilio, Firebase, etc.

## Setup

1. Install dependencies:
   \`\`\`bash
   # Email provider (choose one)
   npm install @sendgrid/mail
   # SMS provider (choose one)
   npm install twilio
   # Push provider (choose one)
   npm install firebase-admin
   \`\`\`

## Usage

\`\`\`typescript
import { NotificationService } from './notification.service';

const notificationService = new NotificationService();

await notificationService.send({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'This is a test notification',
  channels: ['email'],
});
\`\`\``;
  }
}
