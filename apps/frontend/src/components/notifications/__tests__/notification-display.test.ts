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

  it("says how many candies a host traded the recipient", () => {
    expect(
      notificationSentence(candyTrade({ actorLabel: "Luther", count: 3 })),
    ).toBe("traded you 3 candies");
  });

  it("goes to the community's candy swap", () => {
    expect(notificationHref(candyTrade())).toBe(
      communityUrl("willowmere", "/halloween/swap"),
    );
    expect(notificationHref(candyTrade({ community: null }))).toBeNull();
  });
});

const doorKnock = (
  changes: Partial<NotificationFieldsFragment> = {},
): NotificationFieldsFragment =>
  ({
    kind: NotificationKind.HalloweenDoorKnocked,
    subjectType: NotificationSubjectType.HalloweenDoorKnock,
    subjectId: "7",
    community: { id: "c1", slug: "willowmere" },
    candySlugs: ["candy-corn"],
    ...changes,
  }) as NotificationFieldsFragment;

describe("a door knock notification", () => {
  it("says one candy was left", () => {
    expect(notificationSentence(doorKnock())).toBe(
      "knocked on your door and left you a candy",
    );
  });

  it("counts several candies; the row shows which", () => {
    expect(
      notificationSentence(
        doorKnock({ candySlugs: ["candy-corn", "banana", "berry-tart"] }),
      ),
    ).toBe("knocked on your door and left you 3 candies");
  });

  it("goes to the community's candy board", () => {
    expect(notificationHref(doorKnock())).toBe(
      communityUrl("willowmere", "/halloween/board"),
    );
    expect(notificationHref(doorKnock({ community: null }))).toBeNull();
  });
});
