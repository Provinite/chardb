import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import {
  passwordResetTemplate,
  passwordChangedTemplate,
  imageApprovedTemplate,
  imageRejectedTemplate,
} from './templates';
import { ModerationRejectionReason } from '@prisma/client';

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

  /**
   * Send notification when an image is approved
   */
  async sendImageApprovedEmail(
    email: string,
    username: string,
    imageName: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your Image Has Been Approved',
        html: imageApprovedTemplate({
          username,
          imageName,
        }),
      });

      this.logger.log(`Image approved notification sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send image approved notification to ${email}`,
        error.stack,
      );
      // Don't throw - notification is secondary
    }
  }

  /**
   * Send notification when an image is rejected
   */
  async sendImageRejectedEmail(
    email: string,
    username: string,
    imageName: string,
    reason: ModerationRejectionReason,
    reasonText?: string,
  ): Promise<void> {
    const reasonLabels: Record<ModerationRejectionReason, string> = {
      TOS_VIOLATION: 'Terms of Service Violation',
      NSFW_NOT_TAGGED: 'NSFW Content Not Properly Tagged',
      SPAM_LOW_QUALITY: 'Spam or Low Quality Content',
      COPYRIGHT_ISSUE: 'Copyright or Intellectual Property Issue',
      OTHER: 'Other Policy Violation',
    };

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your Image Was Not Approved',
        html: imageRejectedTemplate({
          username,
          imageName,
          reason: reasonLabels[reason],
          reasonText,
        }),
      });

      this.logger.log(`Image rejected notification sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send image rejected notification to ${email}`,
        error.stack,
      );
      // Don't throw - notification is secondary
    }
  }
}
