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
