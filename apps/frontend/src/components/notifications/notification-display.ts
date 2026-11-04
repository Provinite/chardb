import {
  NotificationKind,
  NotificationSubjectType,
  type NotificationFieldsFragment,
} from "../../graphql/notifications.graphql";
import { CharacterAvailability } from "../../generated/graphql";
import { apexUrl, communityUrl } from "../../lib/communityHost";
import { AVAILABILITY_KINDS } from "../../lib/characterAvailability";

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
 * The community-owned ones name that community's host directly. The
 * notification fragment selects the slug, so there is no reason to go through
 * the apex's `/communities/:id` forwarder and pay the extra hops it costs.
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
    case NotificationSubjectType.HalloweenCandyTrade:
      // The trade shows in the swap page's history; it has no page of its own.
      return community ? communityUrl(community.slug, "/halloween/swap") : null;
    case NotificationSubjectType.HalloweenDoorKnock:
      // The candies land in the tray beside the candy board.
      return community
        ? communityUrl(community.slug, "/halloween/board")
        : null;
    case NotificationSubjectType.Comment:
    case NotificationSubjectType.Image:
      // Neither has a page of its own: a comment is rendered inside whatever it
      // is attached to, and an image inside its media.
      return null;
  }
}

/**
 * Where the person who caused a notification links to, or null when no user
 * did (a host's house offer, the system).
 *
 * A notification from a community goes to the actor's member page there, and
 * anything else to their profile.
 */
export function notificationActorHref(
  notification: NotificationFieldsFragment,
): string | null {
  const { actor, community } = notification;
  if (!actor) return null;
  return community
    ? communityUrl(community.slug, `/members/${actor.username}`)
    : apexUrl(`/user/${actor.username}`);
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
  const { kind, subjectName, count, amount, reason, reasonText } = notification;
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
    case NotificationKind.ImageApproved:
      return `approved ${name}`;
    case NotificationKind.ImageRejected: {
      // `reason` is the enum name, snapshotted so that rewording a label does
      // not rewrite what an old row says. `reasonText` is the moderator's own
      // words and is shown in preference to the canned label when they wrote
      // any, because it is the part that tells the uploader what to fix.
      const why = reasonText ?? rejectionReasonLabel(reason);
      return why
        ? `could not approve ${name} — ${why}`
        : `could not approve ${name}`;
    }
    case NotificationKind.HalloweenCandyTraded:
      // A count is a host's house offer, which the recipient took.
      return count
        ? `traded you ${count} candies`
        : "took your candy swap offer";
    case NotificationKind.HalloweenDoorKnocked: {
      // The row shows the candies themselves beneath this.
      const n = notification.candySlugs?.length ?? 0;
      return n > 1
        ? `knocked on your door and left you ${n} candies`
        : "knocked on your door and left you a candy";
    }
    case NotificationKind.CharacterAvailabilityChanged:
      return availabilitySentence(notification, name);
  }
}

/** "a", "a and b", "a, b and c". */
function listOf(items: string[], conjunction: "and" | "or"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items.at(-1)}`;
}

/**
 * What a watched character's owner changed. Kinds this build does not know
 * are left out, so a newer server's kind reads as no change to it.
 */
function availabilitySentence(
  notification: NotificationFieldsFragment,
  name: string,
): string {
  const { priceChanged, price } = notification;
  const added = notification.availabilityAdded ?? [];
  const removed = notification.availabilityRemoved ?? [];
  const priceText = price ? `$${price}` : null;

  const phrase = (value: CharacterAvailability, withPrice: boolean) => {
    const kind = AVAILABILITY_KINDS.find((k) => k.value === value);
    if (!kind) return null;
    return withPrice && value === CharacterAvailability.ForSale && priceText
      ? `${kind.phrase} for ${priceText}`
      : kind.phrase;
  };
  const phrases = (values: CharacterAvailability[], withPrice: boolean) =>
    values.flatMap((v) => phrase(v, withPrice) ?? []);

  const now = phrases(added, true);
  const noLonger = phrases(removed, false);
  if (!now.length && !noLonger.length) {
    if (!priceChanged) return `changed what ${name} is open to`;
    return priceText
      ? `changed ${name}'s price to ${priceText}`
      : `removed ${name}'s price`;
  }

  const parts = [
    now.length ? `now ${listOf(now, "and")}` : null,
    noLonger.length ? `no longer ${listOf(noLonger, "or")}` : null,
  ].filter(Boolean);
  // A new price on a sale that was already advertised has no phrase above to
  // ride along with.
  const pricedInline =
    priceText && added.includes(CharacterAvailability.ForSale);
  const priceNote =
    priceChanged && priceText && !pricedInline
      ? `, priced at ${priceText}`
      : "";
  return `says ${name} is ${parts.join(", and ")}${priceNote}`;
}

/**
 * The member-facing wording for a `ModerationRejectionReason`.
 *
 * Kept beside the sentence that uses it rather than imported from the backend:
 * these are the words a person reads, and the backend's copy of them is for
 * the email template. An unrecognised value renders as no reason at all, which
 * is what a row written by a newer version looks like during a deploy.
 */
function rejectionReasonLabel(
  reason: string | null | undefined,
): string | null {
  switch (reason) {
    case "TOS_VIOLATION":
      return "it breaks the terms of service";
    case "NSFW_NOT_TAGGED":
      return "it needs an NSFW tag";
    case "SPAM_LOW_QUALITY":
      return "it was flagged as spam or low quality";
    case "COPYRIGHT_ISSUE":
      return "of a copyright or IP issue";
    case "OTHER":
      return "it breaks a policy";
    default:
      return null;
  }
}
