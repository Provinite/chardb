import { NotificationChannel, NotificationKind } from "@chardb/database";

/**
 * What each channel does when a member has never said otherwise.
 *
 * This is the single source of truth for defaults. Preference rows are sparse
 * -- one exists only where somebody disagreed -- so changing a value here
 * changes it for everyone who never touched that switch, and adding a kind
 * needs no backfill.
 *
 * `satisfies Record<NotificationKind, ...>` is the same trick
 * `notification-payloads.ts` uses: adding a kind to the enum without deciding
 * its defaults is a compile error rather than a silently-undefined lookup.
 */
export const NOTIFICATION_PREFERENCE_DEFAULTS = {
  // In-app is on across the board. The badge is cheap, it is pull rather than
  // push, and defaulting it off would make the feature look broken.
  [NotificationKind.FOLLOW_RECEIVED]: { inApp: true, email: false },
  [NotificationKind.COMMENT_RECEIVED]: { inApp: true, email: false },
  [NotificationKind.ITEM_GRANTED]: { inApp: true, email: false },
  [NotificationKind.ITEM_REVOKED]: { inApp: true, email: false },
  [NotificationKind.CURRENCY_RECEIVED]: { inApp: true, email: false },
  [NotificationKind.TRADE_OFFERED]: { inApp: true, email: false },
  [NotificationKind.TRADE_ACCEPTED]: { inApp: true, email: false },
  [NotificationKind.TRADE_DECLINED]: { inApp: true, email: false },

  // The two the issue is actually about. An approval is the expected outcome
  // and tells the uploader nothing they need, so it does not earn a mail. A
  // rejection is the one they have to do something about, so it does.
  [NotificationKind.IMAGE_APPROVED]: { inApp: true, email: false },
  [NotificationKind.IMAGE_REJECTED]: { inApp: true, email: true },
} as const satisfies Record<
  NotificationKind,
  { inApp: boolean; email: boolean }
>;

/**
 * The kinds that can actually send mail today.
 *
 * Every kind has an email default above, because a default is a decision worth
 * recording before the code that acts on it exists. Only these have a template
 * behind them, and the settings page renders the email column for these alone
 * -- shipping eight switches that do nothing is worse than shipping two that
 * work. Wiring a new one is this line plus a template.
 */
export const EMAIL_IMPLEMENTED_KINDS: ReadonlySet<NotificationKind> = new Set([
  NotificationKind.IMAGE_APPROVED,
  NotificationKind.IMAGE_REJECTED,
]);

/** Every kind, in the order the settings page lists them. */
export const NOTIFICATION_KINDS = Object.keys(
  NOTIFICATION_PREFERENCE_DEFAULTS,
) as NotificationKind[];

/** Whether `kind` has an email template behind it. */
export function supportsEmail(kind: NotificationKind): boolean {
  return EMAIL_IMPLEMENTED_KINDS.has(kind);
}

/** The default for one (kind, channel) pair. */
export function defaultFor(
  kind: NotificationKind,
  channel: NotificationChannel,
): boolean {
  const defaults = NOTIFICATION_PREFERENCE_DEFAULTS[kind];
  return channel === NotificationChannel.EMAIL
    ? defaults.email
    : defaults.inApp;
}
