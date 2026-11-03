import { describe, expect, it } from "vitest";
import {
  NotificationKind,
  NotificationSubjectType,
  type NotificationFieldsFragment,
} from "../../../graphql/notifications.graphql";
import { communityUrl } from "../../../lib/communityHost";
import {
  notificationHref,
  notificationSentence,
} from "../notification-display";

const candyTrade = (
  changes: Partial<NotificationFieldsFragment> = {},
): NotificationFieldsFragment =>
  ({
    kind: NotificationKind.HalloweenCandyTraded,
    subjectType: NotificationSubjectType.HalloweenCandyTrade,
    subjectId: "trade-1",
    community: { id: "c1", slug: "willowmere" },
    ...changes,
  }) as NotificationFieldsFragment;

describe("a candy trade notification", () => {
  it("says the recipient's offer was taken", () => {
    expect(notificationSentence(candyTrade())).toBe(
      "took your candy swap offer",
    );
  });

  it("goes to the community's candy swap", () => {
    expect(notificationHref(candyTrade())).toBe(
      communityUrl("willowmere", "/halloween/swap"),
    );
    expect(notificationHref(candyTrade({ community: null }))).toBeNull();
  });
});

const about = (
  subjectType: NotificationSubjectType,
  community: NotificationFieldsFragment["community"],
): NotificationFieldsFragment =>
  ({
    kind: NotificationKind.FollowReceived,
    subjectType,
    subjectId: "s1",
    community,
    actor: { id: "u1", username: "bob" },
  }) as NotificationFieldsFragment;

const willowmere = { id: "c1", name: "Willowmere", slug: "willowmere" };

// Straight to the community's host, never through the apex.
describe("where a notification goes", () => {
  it.each([
    [NotificationSubjectType.Gallery, "/gallery/s1"],
    [NotificationSubjectType.Media, "/media/s1"],
    [NotificationSubjectType.Item, "/items/s1"],
    [NotificationSubjectType.Currency, "/currencies"],
    [NotificationSubjectType.Trade, "/trades/s1"],
  ])("sends %s to its community's host", (subjectType, path) => {
    expect(notificationHref(about(subjectType, willowmere))).toBe(
      communityUrl("willowmere", path),
    );
  });

  // Profiles are served on every host.
  it("sends a person to their profile on this host", () => {
    expect(notificationHref(about(NotificationSubjectType.User, null))).toBe(
      "/user/bob",
    );
  });
});
