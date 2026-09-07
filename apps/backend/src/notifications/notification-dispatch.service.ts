import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannel, NotificationKind } from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { EmailService } from "../email/email.service";
import { NotificationPreferencesService } from "../notification-preferences/notification-preferences.service";
import { supportsEmail } from "../notification-preferences/notification-preference-defaults";
import {
  CreateNotificationInput,
  NotificationsService,
} from "./notifications.service";
import {
  AnyNotificationPayload,
  parseNotificationPayload,
} from "./notification-payloads";

/**
 * Tells someone something on every channel they want it on.
 *
 * The split from `NotificationsService` is about transactions, not layering
 * taste. `create` takes a caller's `tx` so the row lives or dies with the thing
 * it describes; an email cannot join a transaction, and one sent from inside a
 * transaction that then rolls back has already gone. So mail is dispatched from
 * here, and this must only be called once the work it describes has committed.
 *
 * Both image-moderation call sites already sit after their transaction, which
 * is why they are the first users.
 *
 * Password reset and password-changed mail does not come through here and never
 * will: `AuthService` calls `EmailService` directly. That is not an oversight
 * or a flag somebody could flip -- there is simply no path from a preference to
 * those two sends, which is the strongest form the guarantee can take.
 */
@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly preferences: NotificationPreferencesService,
    private readonly email: EmailService,
  ) {}

  /**
   * Writes the in-app notification and sends the mail, each subject to its own
   * preference.
   *
   * Never throws. A notification is a side effect of something that already
   * happened, and failing an image approval because SMTP was down would be the
   * wrong trade; the two channels also fail independently, so a broken mailer
   * does not cost the recipient their badge.
   */
  async dispatch<K extends NotificationKind>(
    input: CreateNotificationInput<K>,
  ): Promise<void> {
    try {
      await this.notifications.create(input);
    } catch (error) {
      this.logger.error(
        `Failed to write a ${input.kind} notification for ${input.recipientId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    try {
      await this.maybeEmail(input.recipientId, input.kind, input.data);
    } catch (error) {
      this.logger.error(
        `Failed to email a ${input.kind} notification to ${input.recipientId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async maybeEmail(
    recipientId: string,
    kind: NotificationKind,
    data: AnyNotificationPayload,
  ): Promise<void> {
    if (!supportsEmail(kind)) return;

    const wanted = await this.preferences.isEnabled(
      recipientId,
      kind,
      NotificationChannel.EMAIL,
    );
    if (!wanted) return;

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, username: true },
    });
    if (!recipient?.email) return;

    await this.send(kind, data, recipient);
  }

  /**
   * Picks the template for a kind.
   *
   * The payload is re-parsed per kind rather than cast, which is what narrows
   * the union without an assertion. It is a zod parse of a two-field object,
   * and it makes a payload that somehow reached here in the wrong shape a
   * skipped email instead of a thrown error.
   */
  private async send(
    kind: NotificationKind,
    data: AnyNotificationPayload,
    recipient: { email: string; username: string },
  ): Promise<void> {
    switch (kind) {
      case NotificationKind.IMAGE_APPROVED: {
        const payload = parseNotificationPayload(kind, data);
        if (!payload) return;
        await this.email.sendImageApprovedEmail(
          recipient.email,
          recipient.username,
          payload.subjectName,
        );
        return;
      }

      case NotificationKind.IMAGE_REJECTED: {
        const payload = parseNotificationPayload(kind, data);
        if (!payload) return;
        await this.email.sendImageRejectedEmail(
          recipient.email,
          recipient.username,
          payload.subjectName,
          payload.reason,
          payload.reasonText ?? undefined,
        );
        return;
      }

      default:
        // Reachable only if a kind joins EMAIL_IMPLEMENTED_KINDS without
        // getting a case here. Logged rather than thrown: a missing template
        // should cost one email, not the notification it came with.
        this.logger.warn(`No email template registered for ${kind}`);
    }
  }
}
