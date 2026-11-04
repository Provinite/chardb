import { describe, expect, it } from "vitest";
import {
  NotificationKind,
  NotificationSubjectType,
  type NotificationFieldsFragment,
} from "../../../graphql/notifications.graphql";
import { CharacterAvailability } from "../../../generated/graphql";
import { apexUrl, communityUrl } from "../../../lib/communityHost";
import {
  notificationActorHref,
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

const knocker: NotificationFieldsFragment["actor"] = {
  id: "u2",
  username: "luther",
  displayName: "Luther",
  avatarImage: null,
};

describe("the actor link", () => {
  it("goes to a knocker's door, on their member page in the community", () => {
    expect(notificationActorHref(doorKnock({ actor: knocker }))).toBe(
      communityUrl("willowmere", "/members/luther"),
    );
  });

  it("goes to a trader's member page in the community", () => {
    expect(notificationActorHref(candyTrade({ actor: knocker }))).toBe(
      communityUrl("willowmere", "/members/luther"),
    );
  });

  it("goes to the actor's member page on anything in a community", () => {
    const grant = {
      kind: NotificationKind.ItemGranted,
      subjectType: NotificationSubjectType.Item,
      subjectId: "i1",
      community: { id: "c1", name: "Willowmere", slug: "willowmere" },
      actor: knocker,
    } as NotificationFieldsFragment;
    expect(notificationActorHref(grant)).toBe(
      communityUrl("willowmere", "/members/luther"),
    );
  });

  it("goes to the actor's profile on anything outside a community", () => {
    const follow = {
      kind: NotificationKind.FollowReceived,
      subjectType: NotificationSubjectType.User,
      subjectId: "u2",
      community: null,
      actor: knocker,
    } as NotificationFieldsFragment;
    expect(notificationActorHref(follow)).toBe(apexUrl("/user/luther"));
  });

  it("goes to the profile when the community is gone", () => {
    expect(
      notificationActorHref(doorKnock({ actor: knocker, community: null })),
    ).toBe(apexUrl("/user/luther"));
  });

  it("is absent when no user caused it", () => {
    expect(
      notificationActorHref(candyTrade({ actor: null, actorLabel: "Host" })),
    ).toBeNull();
  });
});

const availability = (
  changes: Partial<NotificationFieldsFragment> = {},
): NotificationFieldsFragment =>
  ({
    kind: NotificationKind.CharacterAvailabilityChanged,
    subjectType: NotificationSubjectType.Character,
    subjectId: "char-1",
    subjectName: "Moonbeam",
    availabilityAdded: [],
    availabilityRemoved: [],
    priceChanged: false,
    price: null,
    ...changes,
  }) as NotificationFieldsFragment;

describe("a watched character's availability notification", () => {
  it("says what the character is newly open to", () => {
    expect(
      notificationSentence(
        availability({
          availabilityAdded: [
            CharacterAvailability.TradeCharacters,
            CharacterAvailability.Offers,
          ],
        }),
      ),
    ).toBe(
      "says Moonbeam is now open to trades for other characters and open to offers",
    );
  });

  it("puts the asking price on a new sale", () => {
    expect(
      notificationSentence(
        availability({
          availabilityAdded: [CharacterAvailability.ForSale],
          priceChanged: true,
          price: "25.00",
        }),
      ),
    ).toBe("says Moonbeam is now for sale for $25.00");
  });

  it("says what the character is no longer open to", () => {
    expect(
      notificationSentence(
        availability({ availabilityRemoved: [CharacterAvailability.Freebie] }),
      ),
    ).toBe("says Moonbeam is no longer free to a good home");
  });

  it("says both when one edit adds and removes", () => {
    expect(
      notificationSentence(
        availability({
          availabilityAdded: [CharacterAvailability.TradeArt],
          availabilityRemoved: [
            CharacterAvailability.ForSale,
            CharacterAvailability.ForSaleCoin,
            CharacterAvailability.Offers,
          ],
        }),
      ),
    ).toBe(
      "says Moonbeam is now open to trades for art, and no longer for sale, for sale for community currency or open to offers",
    );
  });

  it("reports a price change on its own", () => {
    expect(
      notificationSentence(
        availability({ priceChanged: true, price: "30.00" }),
      ),
    ).toBe("changed Moonbeam's price to $30.00");
    expect(
      notificationSentence(availability({ priceChanged: true, price: null })),
    ).toBe("removed Moonbeam's price");
  });

  it("mentions a price cleared in the same save as another change", () => {
    expect(
      notificationSentence(
        availability({
          availabilityAdded: [CharacterAvailability.Offers],
          priceChanged: true,
          price: null,
        }),
      ),
    ).toBe("says Moonbeam is now open to offers, and has no price");
  });

  it("does not invent a price change for a kind this build has not heard of", () => {
    expect(
      notificationSentence(
        availability({
          availabilityAdded: ["SOMETHING_NEW" as CharacterAvailability],
          price: "25.00",
        }),
      ),
    ).toBe("changed what Moonbeam is open to");
  });

  it("goes to the character", () => {
    expect(notificationHref(availability())).toBe(apexUrl("/character/char-1"));
  });
});
