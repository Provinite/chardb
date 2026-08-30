import {
  NotificationKind,
  NotificationSubjectType,
  type NotificationFieldsFragment,
} from "../../graphql/notifications.graphql";

/**
 * Where clicking a notification goes, or null when it goes nowhere.
 *
 * Routing is frontend knowledge, so the backend stores a (subjectType,
 * subjectId) pair and this is the only place that turns one into a path. Null
 * is a normal outcome, not an error: an IMAGE subject has no page of its own,
 * and a community-scoped subject whose community is gone cannot be addressed.
 */
export function notificationHref(
  notification: NotificationFieldsFragment,
): string | null {
  const { subjectType, subjectId, community, actor } = notification;
  if (!subjectType || !subjectId) return null;

  switch (subjectType) {
    case NotificationSubjectType.Character:
      return `/character/${subjectId}`;
    case NotificationSubjectType.Gallery:
      return `/gallery/${subjectId}`;
    case NotificationSubjectType.Media:
      return `/media/${subjectId}`;
    case NotificationSubjectType.User:
      // Profiles are addressed by username, and subjectId is an id. The actor
      // is the same person on every kind that sets a USER subject, so their
      // username is already here.
      return actor ? `/user/${actor.username}` : null;
    case NotificationSubjectType.Item:
      return community
        ? `/communities/${community.id}/items/${subjectId}`
        : null;
    case NotificationSubjectType.Currency:
      return community ? `/communities/${community.id}/currencies` : null;
    case NotificationSubjectType.Comment:
    case NotificationSubjectType.Image:
      // Neither has a page of its own: a comment is rendered inside whatever it
      // is attached to, and an image inside its media.
      return null;
  }
}

/** What to call the person or thing that caused a notification. */
export function notificationActorName(
  notification: NotificationFieldsFragment,
): string {
  const { actor, actorLabel } = notification;
  if (actor) return actor.displayName || actor.username;
  return actorLabel === "system" ? "chardb" : (actorLabel ?? "Someone");
}

/**
 * The sentence shown for a notification, split so the row can bold the actor.
 *
 * Written from the snapshot rather than from live data, which is the point of
 * storing one: a revoked item that no longer exists still reads correctly.
 */
export function notificationSentence(
  notification: NotificationFieldsFragment,
): string {
  const { kind, subjectName, count, amount, reason } = notification;
  const name = subjectName ?? "something";

  switch (kind) {
    case NotificationKind.FollowReceived:
      return "followed you";
    case NotificationKind.CommentReceived:
      return `commented on ${name}`;
    case NotificationKind.ItemGranted:
      return count && count > 1
        ? `gave you ${count} × ${name}`
        : `gave you ${name}`;
    case NotificationKind.ItemRevoked: {
      const what =
        count && count > 1 ? `${count} × ${name}` : (name ?? "an item");
      return reason ? `took back ${what} — ${reason}` : `took back ${what}`;
    }
    case NotificationKind.CurrencyReceived:
      return `sent you ${amount ?? 0} ${name}`;
  }
}
