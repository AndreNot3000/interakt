import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host', 'localhost'),
      port: this.configService.get<number>('email.port', 1025),
      secure: this.configService.get<boolean>('email.secure', false),
      auth: this.configService.get<string>('email.user')
        ? {
            user: this.configService.get<string>('email.user'),
            pass: this.configService.get<string>('email.pass'),
          }
        : undefined,
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const from = this.configService.get<string>('email.from', 'noreply@interakt.app');
      const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      await this.transporter.sendMail({
        from: `Interakt <${from}>`,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent: "${options.subject}" → ${to}`);
    } catch (error) {
      // Log but don't throw — email failures shouldn't break the request flow.
      // In production, use Bull queue with retry logic for email delivery.
      this.logger.error(`Failed to send email to ${options.to}`, error);
    }
  }
}
