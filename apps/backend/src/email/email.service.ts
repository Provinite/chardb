import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import {
  passwordResetTemplate,
  passwordChangedTemplate,
  emailVerificationTemplate,
  imageApprovedTemplate,
  imageRejectedTemplate,
} from "./templates";
import { ModerationRejectionReason } from "@prisma/client";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
  }

  /**
   * Where an optional email's footer sends somebody who wants fewer of them.
   *
   * Built here rather than passed in, because it is the same address for every
   * optional email and a caller that had to supply it is a caller that could
   * forget to.
   */
  private get settingsUrl(): string {
    return `${this.frontendUrl}/profile/edit`;
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
        subject: "Reset Your Password",
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
      throw new Error("Failed to send password reset email");
    }
  }

  /**
   * Send the "confirm your address" email.
   *
   * Rethrows, like the password reset send and unlike the optional ones. The
   * caller decides what to do with that: signup swallows it, because an account
   * that exists but whose welcome mail bounced is recoverable from the login
   * screen, while a signup that 500s after writing the row is not.
   *
   * @param email Address to confirm
   * @param token Verification token (not hashed)
   * @param username User's username for personalization
   * @param expiryHours How long the token is good for, for the copy
   */
  async sendEmailVerification(
    email: string,
    token: string,
    username: string,
    expiryHours: number,
  ): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email/${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Confirm Your Email Address",
        html: emailVerificationTemplate({
          username,
          verifyUrl,
          expiryHours,
        }),
      });

      this.logger.log(`Email verification sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email verification to ${email}`,
        error.stack,
      );
      throw new Error("Failed to send verification email");
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
        subject: "Your Password Has Been Changed",
        html: passwordChangedTemplate({
          username,
          supportEmail: this.configService.get<string>(
            "EMAIL_FROM",
            "noreply@example.com",
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
        subject: "Your Image Has Been Approved",
        html: imageApprovedTemplate({
          username,
          imageName,
          settingsUrl: this.settingsUrl,
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
      TOS_VIOLATION: "Terms of Service Violation",
      NSFW_NOT_TAGGED: "NSFW Content Not Properly Tagged",
      SPAM_LOW_QUALITY: "Spam or Low Quality Content",
      COPYRIGHT_ISSUE: "Copyright or Intellectual Property Issue",
      OTHER: "Other Policy Violation",
    };

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Your Image Was Not Approved",
        html: imageRejectedTemplate({
          username,
          imageName,
          reason: reasonLabels[reason],
          reasonText,
          settingsUrl: this.settingsUrl,
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
