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
    count: 1,
    community: { id: "c1", slug: "willowmere" },
    ...changes,
  }) as NotificationFieldsFragment;

describe("a candy trade notification", () => {
  it("says how many candies came the recipient's way", () => {
    expect(notificationSentence(candyTrade())).toBe(
      "traded you a candy on the candy swap",
    );
    expect(notificationSentence(candyTrade({ count: 3 }))).toBe(
      "traded you 3 candies on the candy swap",
    );
  });

  it("goes to the community's candy swap", () => {
    expect(notificationHref(candyTrade())).toBe(
      communityUrl("willowmere", "/halloween/swap"),
    );
    expect(notificationHref(candyTrade({ community: null }))).toBeNull();
  });
});
