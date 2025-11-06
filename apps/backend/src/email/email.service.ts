import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import {
  passwordResetTemplate,
  passwordChangedTemplate,
} from './templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

  /**
   * Send a password reset email to the user
   * @param email User's email address
   * @param token Password reset token (not hashed)
   * @param username User's username for personalization
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    username: string,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password/${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset Your Password',
        html: passwordResetTemplate({
          username,
          resetUrl,
          expiryHours: 1,
        }),
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error.stack,
      );
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send a notification email when password is changed
   * @param email User's email address
   * @param username User's username for personalization
   */
  async sendPasswordChangedNotification(
    email: string,
    username: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your Password Has Been Changed',
        html: passwordChangedTemplate({
          username,
          supportEmail: this.configService.get<string>(
            'EMAIL_FROM',
            'noreply@example.com',
          ),
        }),
      });

      this.logger.log(`Password changed notification sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password changed notification to ${email}`,
        error.stack,
      );
      // Don't throw error here - password change was successful, notification is secondary
    }
  }
}
