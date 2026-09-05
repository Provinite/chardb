import {
  NotificationKind,
  NotificationSubjectType,
  type NotificationFieldsFragment,
} from "../../graphql/notifications.graphql";
import { apexUrl } from "../../lib/communityHost";

/**
 * Where clicking a notification goes, or null when it goes nowhere.
 *
 * Routing is frontend knowledge, so the backend stores a (subjectType,
 * subjectId) pair and this is the only place that turns one into a URL. Null
 * is a normal outcome, not an error: an IMAGE subject has no page of its own,
 * and a community-scoped subject whose community is gone cannot be addressed.
 *
 * Every answer is an absolute URL, and `NotificationRow` renders it as an `<a>`
 * rather than a `<Link>`. Notifications are read at the apex -- the
 * `/notifications` page, and the bell, which sits in the header on every host
 * -- while most of what they point at is served from a community host. The
 * router cannot make that jump: it is a different origin.
 *
 * The community-owned ones address the apex's `/communities/:id/...` route,
 * which resolves the id to a slug and forwards (`CommunityHostRedirect`).
 * Naming the community host directly would save a hop, but the notification
 * fragment selects `community { id name }` and no slug.
 */
export function notificationHref(
  notification: NotificationFieldsFragment,
): string | null {
  const { subjectType, subjectId, community, actor } = notification;
  if (!subjectType || !subjectId) return null;

  switch (subjectType) {
    case NotificationSubjectType.Character:
      // A character's host comes from its species, which a notification does
      // not carry. The apex `/character/:id` is both the forwarding address
      // and the permanent home of a species-less character, so this one URL is
      // right either way; `CharacterHostGuard` decides which.
      return apexUrl(`/character/${subjectId}`);
    case NotificationSubjectType.Gallery:
      return apexUrl(`/gallery/${subjectId}`);
    case NotificationSubjectType.Media:
      return apexUrl(`/media/${subjectId}`);
    case NotificationSubjectType.User:
      // Profiles are addressed by username, and subjectId is an id. The actor
      // is the same person on every kind that sets a USER subject, so their
      // username is already here.
      return actor ? apexUrl(`/user/${actor.username}`) : null;
    case NotificationSubjectType.Item:
      return community
        ? apexUrl(`/communities/${community.id}/items/${subjectId}`)
        : null;
    case NotificationSubjectType.Currency:
      return community
        ? apexUrl(`/communities/${community.id}/currencies`)
        : null;
    case NotificationSubjectType.Trade:
      // Like Item below it, and for the same reason: the page lives under the
      // community, so without one there is nowhere to send them. Every trade
      // notification sets it, so the null branch is defensive rather than a
      // case anyone should hit.
      return community
        ? apexUrl(`/communities/${community.id}/trades/${subjectId}`)
        : null;
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
    case NotificationKind.TradeOffered:
      return "offered you a trade";
    case NotificationKind.TradeAccepted:
      return "accepted your trade";
    case NotificationKind.TradeDeclined:
      return "declined your trade";
  }
}
