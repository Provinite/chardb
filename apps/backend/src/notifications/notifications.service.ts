import { Injectable, Logger } from "@nestjs/common";
import {
  NotificationKind,
  NotificationSubjectType,
  Prisma,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import {
  NotificationPayloads,
  parseNotificationPayload,
  validateNotificationPayload,
} from "./notification-payloads";

/**
 * What every producer supplies, whatever the kind.
 *
 * `data` is keyed to `kind`, so a producer cannot pass an item payload while
 * claiming a currency kind: the call site fails to compile.
 */
export interface CreateNotificationInput<K extends NotificationKind> {
  recipientId: string;
  kind: K;
  data: NotificationPayloads[K];
  /** Who caused it. Supply exactly one of this and actorLabel. */
  actorUserId?: string | null;
  /** Names a non-user actor. Supply exactly one of this and actorUserId. */
  actorLabel?: string | null;
  communityId?: string | null;
  body?: string | null;
  subjectType?: NotificationSubjectType | null;
  subjectId?: string | null;
}

/** A notification row with its snapshot already validated and narrowed. */
export type LoadedNotification = Omit<
  Prisma.NotificationGetPayload<{
    include: { actorUser: true; community: true };
  }>,
  "data"
> & {
  data: NotificationPayloads[NotificationKind] | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Writes one notification.
   *
   * Producers call this inside whatever transaction they already hold, by
   * passing `tx`. A notification is not worth failing the thing it describes,
   * but a notification about something that then rolled back is worse than
   * none, so it joins the caller's transaction rather than opening its own.
   */
  async create<K extends NotificationKind>(
    input: CreateNotificationInput<K>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    // Belt to the compiler's braces: catches anything that reached a producer
    // as `unknown`, and anything whose shape drifted from its schema.
    const data = validateNotificationPayload(input.kind, input.data);

    return client.notification.create({
      data: {
        recipientId: input.recipientId,
        kind: input.kind,
        actorUserId: input.actorUserId ?? null,
        actorLabel: input.actorLabel ?? null,
        communityId: input.communityId ?? null,
        body: input.body ?? null,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
        data,
      },
    });
  }

  /**
   * Writes the same notification to many recipients.
   *
   * One event concerning several people is several rows, because read state is
   * per person. Recipients are deduplicated, and the actor is dropped from the
   * list: nobody needs telling about their own action.
   */
  async createMany<K extends NotificationKind>(
    recipientIds: string[],
    input: Omit<CreateNotificationInput<K>, "recipientId">,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const recipients = [...new Set(recipientIds)].filter(
      (id) => id !== input.actorUserId,
    );
    if (recipients.length === 0) return { count: 0 };

    const data = validateNotificationPayload(input.kind, input.data);

    return client.notification.createMany({
      data: recipients.map((recipientId) => ({
        recipientId,
        kind: input.kind,
        actorUserId: input.actorUserId ?? null,
        actorLabel: input.actorLabel ?? null,
        communityId: input.communityId ?? null,
        body: input.body ?? null,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
        data,
      })),
    });
  }

  /** One page of a recipient's notifications, newest first. */
  async findForRecipient(
    recipientId: string,
    filters: { first?: number; after?: string; unreadOnly?: boolean },
  ) {
    const take = Math.min(filters.first ?? 20, 100);
    const where: Prisma.NotificationWhereInput = {
      recipientId,
      ...(filters.unreadOnly ? { readAt: null } : {}),
    };

    const [rows, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: { actorUser: true, community: true },
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(filters.after ? { skip: 1, cursor: { id: filters.after } } : {}),
      }),
      this.prisma.notification.count({ where }),
    ]);

    const hasNextPage = rows.length > take;
    return {
      nodes: rows.slice(0, take).map((row) => this.narrow(row)),
      totalCount,
      hasNextPage,
      hasPreviousPage: Boolean(filters.after),
    };
  }

  /**
   * How many notifications the badge should be showing.
   *
   * This is the only query here that runs on a timer, so it is a bare count
   * against the (recipient_id, seen_at) index and nothing else.
   */
  async countUnseen(recipientId: string) {
    return this.prisma.notification.count({
      where: { recipientId, seenAt: null },
    });
  }

  /** Clears the badge. Called when the recipient opens the dropdown. */
  async markAllSeen(recipientId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { recipientId, seenAt: null },
      data: { seenAt: new Date() },
    });
    return count;
  }

  /**
   * Marks specific notifications read.
   *
   * Scoped to the recipient in the same statement rather than checked first:
   * an id belonging to someone else matches nothing instead of leaking that it
   * exists.
   */
  async markRead(recipientId: string, ids: string[]) {
    if (ids.length === 0) return 0;
    const now = new Date();
    const { count } = await this.prisma.notification.updateMany({
      where: { recipientId, id: { in: ids }, readAt: null },
      // Reading one implies having seen it, and the two can otherwise diverge
      // when a notification is opened from the feed page without the dropdown.
      data: { readAt: now, seenAt: now },
    });
    return count;
  }

  async markAllRead(recipientId: string) {
    const now = new Date();
    const { count } = await this.prisma.notification.updateMany({
      where: { recipientId, readAt: null },
      data: { readAt: now, seenAt: now },
    });
    return count;
  }

  /**
   * Validates a row's snapshot and narrows it to its kind.
   *
   * A row that fails validation keeps its envelope and loses its snapshot, so
   * one bad write costs one unrenderable notification rather than the feed.
   */
  private narrow(
    row: Prisma.NotificationGetPayload<{
      include: { actorUser: true; community: true };
    }>,
  ): LoadedNotification {
    const data = parseNotificationPayload(row.kind, row.data);
    if (data === null) {
      this.logger.warn(
        `Notification ${row.id} (${row.kind}) has a payload that does not ` +
          `match its schema; rendering without it.`,
      );
    }
    return { ...row, data };
  }
}
