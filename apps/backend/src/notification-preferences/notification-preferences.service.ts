import { Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationKind,
  Prisma,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import {
  defaultFor,
  NOTIFICATION_KINDS,
  NOTIFICATION_PREFERENCE_DEFAULTS,
  supportsEmail,
} from "./notification-preference-defaults";

/** One kind's answer for both channels, defaults already merged in. */
export interface ResolvedNotificationPreference {
  kind: NotificationKind;
  inApp: boolean;
  email: boolean;
  /** False where no email template exists yet; the UI hides the switch. */
  emailSupported: boolean;
}

/**
 * Reads and writes the sparse preference table, merging
 * `notification-preference-defaults.ts` on the way out.
 *
 * Every read of a preference goes through here. That matters because the table
 * stores only disagreements: asking Prisma directly and finding no row means
 * "the default applies", not "off", and getting that backwards would silently
 * stop every notification for every member who has never opened the settings
 * page.
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Whether one channel is on for one kind.
   *
   * Takes an optional transaction client so a caller already inside one reads
   * its own uncommitted writes rather than a stale value.
   */
  async isEnabled(
    userId: string,
    kind: NotificationKind,
    channel: NotificationChannel,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? this.prisma;
    const row = await client.notificationPreference.findUnique({
      where: { userId_kind_channel: { userId, kind, channel } },
      select: { enabled: true },
    });
    return row?.enabled ?? defaultFor(kind, channel);
  }

  /**
   * The same question for many recipients at once, for fan-out.
   *
   * Returns the ids that want it, so a caller can filter its recipient list in
   * one query rather than one per person.
   */
  async filterEnabled(
    userIds: string[],
    kind: NotificationKind,
    channel: NotificationChannel,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    if (userIds.length === 0) return [];
    const client = tx ?? this.prisma;
    const rows = await client.notificationPreference.findMany({
      where: { userId: { in: userIds }, kind, channel },
      select: { userId: true, enabled: true },
    });

    const overrides = new Map(rows.map((row) => [row.userId, row.enabled]));
    const fallback = defaultFor(kind, channel);
    return userIds.filter((id) => overrides.get(id) ?? fallback);
  }

  /** The whole matrix for one member, in settings-page order. */
  async resolveForUser(
    userId: string,
  ): Promise<ResolvedNotificationPreference[]> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId },
      select: { kind: true, channel: true, enabled: true },
    });

    const overrides = new Map(
      rows.map((row) => [`${row.kind}:${row.channel}`, row.enabled]),
    );
    const enabled = (kind: NotificationKind, channel: NotificationChannel) =>
      overrides.get(`${kind}:${channel}`) ?? defaultFor(kind, channel);

    return NOTIFICATION_KINDS.map((kind) => ({
      kind,
      inApp: enabled(kind, NotificationChannel.IN_APP),
      email: enabled(kind, NotificationChannel.EMAIL),
      emailSupported: supportsEmail(kind),
    }));
  }

  /**
   * Records one answer.
   *
   * Writes the row even when it matches the default. Storing the agreement is
   * what stops a later change of default from silently reversing a choice
   * somebody made deliberately.
   */
  async setPreference(
    userId: string,
    kind: NotificationKind,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<ResolvedNotificationPreference[]> {
    await this.prisma.notificationPreference.upsert({
      where: { userId_kind_channel: { userId, kind, channel } },
      create: { userId, kind, channel, enabled },
      update: { enabled },
    });
    return this.resolveForUser(userId);
  }

  /**
   * Turns one kind's email off, for the unsubscribe link.
   *
   * Deliberately narrower than `setPreference`: an unsubscribe token can only
   * ever switch something off, and only on the email channel. A replayed or
   * leaked link therefore cannot be used to turn notifications back on for
   * somebody, which is the one thing an unauthenticated caller must not do.
   */
  async disableEmail(userId: string, kind: NotificationKind): Promise<void> {
    await this.prisma.notificationPreference.upsert({
      where: {
        userId_kind_channel: {
          userId,
          kind,
          channel: NotificationChannel.EMAIL,
        },
      },
      create: {
        userId,
        kind,
        channel: NotificationChannel.EMAIL,
        enabled: false,
      },
      update: { enabled: false },
    });
  }

  /** Whether `kind` is one this service knows about. Guards untrusted input. */
  isKnownKind(kind: string): kind is NotificationKind {
    return kind in NOTIFICATION_PREFERENCE_DEFAULTS;
  }
}
