import { z } from "zod";
import { NotificationKind } from "@chardb/database";

/**
 * The snapshot each kind of notification stores in `Notification.data`.
 *
 * This is the single source of truth for that column. The TypeScript types
 * below are inferred from these schemas, `json-types.d.ts` feeds the inferred
 * union to prisma-json-types-generator so Prisma itself types the column, and
 * the service validates against them on the way in and on the way back out. A
 * notification payload is therefore never `any`, and never merely asserted.
 *
 * Adding a kind: add it to the `NotificationKind` enum in schema.prisma and add
 * its schema here. The `satisfies` below fails to compile if you do one without
 * the other, which is the whole point of writing it this way.
 *
 * Field naming is shared on purpose -- `subjectName` means the same thing in
 * every kind that has one -- so the GraphQL projection stays a flat set of
 * nullable scalars rather than a union type per kind.
 */
const payloadSchemas = {
  /** Nothing to snapshot: the actor is the entire notification. */
  [NotificationKind.FOLLOW_RECEIVED]: z.object({}),

  [NotificationKind.COMMENT_RECEIVED]: z.object({
    /** What was commented on, named at write time. */
    subjectName: z.string().max(200),
    /** Enough of the comment to recognise it in a dropdown row. */
    excerpt: z.string().max(280),
  }),

  [NotificationKind.ITEM_GRANTED]: z.object({
    /** The item type's name, not the instance's id. */
    subjectName: z.string().max(200),
    /** A grant of several identical items is one notification, not several. */
    count: z.number().int().positive(),
  }),

  [NotificationKind.ITEM_REVOKED]: z.object({
    subjectName: z.string().max(200),
    /** `revokeItems` takes a list and lands as one event, so this can exceed 1. */
    count: z.number().int().positive(),
    /** The member-facing reason, when staff gave one. */
    reason: z.string().max(500).nullable(),
  }),

  [NotificationKind.CURRENCY_RECEIVED]: z.object({
    /** The currency's name at the time it was received. */
    subjectName: z.string().max(200),
    amount: z.number().int().positive(),
  }),

  // Trades summarise their shape rather than snapshotting every line: the trade
  // itself is the record, it is linked from the notification, and unlike a
  // revoked item it does not disappear.
  [NotificationKind.TRADE_OFFERED]: z.object({
    itemCount: z.number().int().nonnegative(),
    // Optional where its siblings are not: rows written before trades could
    // carry characters have no such key, and a payload is validated on the way
    // in but not on the way out. Required here would describe old rows as
    // holding a number they do not hold.
    characterCount: z.number().int().nonnegative().optional(),
    currencyCount: z.number().int().nonnegative(),
  }),
  [NotificationKind.TRADE_ACCEPTED]: z.object({
    itemCount: z.number().int().nonnegative(),
    characterCount: z.number().int().nonnegative().optional(),
    currencyCount: z.number().int().nonnegative(),
  }),
  [NotificationKind.TRADE_DECLINED]: z.object({}),
} as const satisfies Record<NotificationKind, z.ZodObject<z.ZodRawShape>>;

/** The payload shape for each kind, keyed by kind. */
export type NotificationPayloads = {
  [K in NotificationKind]: z.infer<(typeof payloadSchemas)[K]>;
};

/** The payload for one specific kind. */
export type NotificationPayload<K extends NotificationKind> =
  NotificationPayloads[K];

/**
 * The union actually stored in the column. Prisma types `Notification.data` as
 * this, so reading a row gives a union that `kind` narrows rather than `any`.
 */
export type AnyNotificationPayload =
  NotificationPayloads[keyof NotificationPayloads];

/**
 * Validates a payload on its way into the database.
 *
 * TypeScript already constrains callers, so this catches the cases types
 * cannot: a value that arrived as `unknown` from somewhere, and a shape that
 * drifted from its schema. Strict, because an unexpected key on a write is a
 * bug at the call site and silently dropping it would hide the bug.
 */
export function validateNotificationPayload<K extends NotificationKind>(
  kind: K,
  payload: NotificationPayloads[K],
): NotificationPayloads[K] {
  return payloadSchemas[kind]
    .strict()
    .parse(payload) as NotificationPayloads[K];
}

/**
 * Validates a payload on its way back out, returning null if it does not match.
 *
 * Not strict, deliberately: during a rolling deploy the older instance reads
 * rows the newer one wrote, and rejecting a payload for carrying a field this
 * version has not heard of would break the feed for the duration of the deploy.
 * Unknown keys are stripped instead.
 *
 * Returns null rather than throwing so that one malformed row degrades to one
 * unrenderable notification instead of a 500 on the whole feed.
 */
export function parseNotificationPayload<K extends NotificationKind>(
  kind: K,
  raw: unknown,
): NotificationPayloads[K] | null {
  const result = payloadSchemas[kind].safeParse(raw);
  return result.success ? (result.data as NotificationPayloads[K]) : null;
}
