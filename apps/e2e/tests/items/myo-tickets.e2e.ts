import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import {
  SeedCreateCharacterFromMyoTicketDocument,
  SeedSetItemTypeMyoGrantDocument,
  SeedSetItemTypeUsePayoutDocument,
  SeedUseItemDocument,
  SeedItemDocument,
  SeedCharacterDocument,
  SeedMemberHoldingsDocument,
  SeedTraitReviewQueueDocument,
  SeedApproveTraitReviewDocument,
  SeedRevertTraitReviewDocument,
  SeedUpdateRoleDocument,
  SeedCreateCharacterDocument,
  SeedGrantItemDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * Spending an MYO ticket for a character.
 *
 * This feature creates characters and hands out the right to create them, so
 * most of what is worth testing is the ways it could create more than it
 * should, or create something the ticket did not permit. The happy path is one
 * test; the rest are the ways it could run twice, run for somebody else, or
 * run past the allow-list.
 *
 * `member` holds two Thornwing MYO Tickets, each good for a Common or an
 * Uncommon and deliberately not a Rare.
 */
test.describe("spending an MYO ticket", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  /** How many of `member`'s MYO tickets are still in hand. */
  const myoTicketsHeld = async (world: World<CommunityItemsWorld>) => {
    const { memberHoldings } = await world
      .as("member")
      .gql(SeedMemberHoldingsDocument, {
        communityId: world.community.id,
        userId: world.users.member.userId,
      });
    return (
      memberHoldings.holdings.find(
        (h: { itemType: { id: string } }) =>
          h.itemType.id === world.itemTypes.myoTicket.id,
      )?.count ?? 0
    );
  };

  test("destroys the ticket and makes the character", async ({ world }) => {
    const before = await myoTicketsHeld(world);

    const { createCharacterFromMyoTicket: character } = await world
      .as("member")
      .gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId: world.myoItems.ticketIds[0],
          speciesVariantId: world.variants.uncommon.id,
          name: "Emberquill",
        },
      });

    expect(character.speciesId).toBe(world.species.id);
    expect(character.speciesVariantId).toBe(world.variants.uncommon.id);
    // Pending, not approved. The member designed it; staff have not seen it.
    expect(character.traitReviewStatus).toBe("PENDING");

    // One ticket, not both. A redemption that consumed the lot would still
    // pass every assertion above.
    expect(await myoTicketsHeld(world)).toBe(before - 1);

    const { item } = await world.as("member").gql(SeedItemDocument, {
      id: world.myoItems.ticketIds[0],
    });
    expect(item.destroyedAt).not.toBeNull();
  });

  test("does not need permission to create characters", async ({ world }) => {
    // The whole point of the feature, and the assertion that fails if the
    // ticket is not the authorization. Take canCreateCharacter off the Member
    // role, prove ordinary creation is now refused, then redeem anyway.
    //
    // The refusal half is load-bearing in both directions: it is also what
    // proves `createCharacter` is gated at all. That check lives in
    // CharactersService rather than on the resolver, because the resolver's
    // permission decorator is OR'd with @AllowAnyAuthenticated and so passes
    // everyone.
    await world.as("commadmin").gql(SeedUpdateRoleDocument, {
      id: world.roles.member,
      updateRoleInput: { canCreateCharacter: false },
    });

    await expect(
      world.as("member").gql(SeedCreateCharacterDocument, {
        input: { name: "Refused", speciesId: world.species.id },
      }),
    ).rejects.toThrow(/do not have permission/i);

    const { createCharacterFromMyoTicket } = await world
      .as("member")
      .gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId: world.myoItems.ticketIds[0],
          speciesVariantId: world.variants.common.id,
          name: "Ashcrown",
        },
      });

    expect(createCharacterFromMyoTicket.id).toBeTruthy();
  });

  test("cannot be spent twice", async ({ world }) => {
    const itemId = world.myoItems.ticketIds[0];
    await world.as("member").gql(SeedCreateCharacterFromMyoTicketDocument, {
      input: {
        itemId,
        speciesVariantId: world.variants.common.id,
        name: "Firstborn",
      },
    });
    const after = await myoTicketsHeld(world);

    // The reason the destroy is conditional and comes first. A second submit
    // must make nothing, not make a second character.
    await expect(
      world.as("member").gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId,
          speciesVariantId: world.variants.common.id,
          name: "Secondborn",
        },
      }),
    ).rejects.toThrow();

    expect(await myoTicketsHeld(world)).toBe(after);
  });

  test("cannot be spent by somebody who does not hold it", async ({
    world,
  }) => {
    await expect(
      world.as("othermember").gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId: world.myoItems.ticketIds[0],
          speciesVariantId: world.variants.common.id,
          name: "Thief",
        },
      }),
    ).rejects.toThrow(/not yours/i);
  });

  test("refuses a variant the ticket does not allow", async ({ world }) => {
    // Rare belongs to the same species and is not on the ticket. If the
    // species were taken as permission for everything under it, this passes.
    await expect(
      world.as("member").gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId: world.myoItems.ticketIds[0],
          speciesVariantId: world.variants.rare.id,
          name: "Overreach",
        },
      }),
    ).rejects.toThrow(/does not make that variant/i);
  });

  test("a refused redemption spends nothing", async ({ world }) => {
    const before = await myoTicketsHeld(world);

    await expect(
      world.as("member").gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId: world.myoItems.ticketIds[0],
          speciesVariantId: world.variants.rare.id,
          name: "Overreach",
        },
      }),
    ).rejects.toThrow();

    // The refusal comes before anything is destroyed. A ticket burned on a
    // rejected request is the worst outcome this feature has.
    expect(await myoTicketsHeld(world)).toBe(before);
  });

  test("refuses an item that makes nothing", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId: world.usableItems.ticketIds[0],
          speciesVariantId: world.variants.common.id,
          name: "Wrong ticket",
        },
      }),
    ).rejects.toThrow(/does not make characters/i);
  });

  test("cannot be used from the inventory like a payout ticket", async ({
    world,
  }) => {
    // `useItem` has nowhere to put a name or a variant, so it refuses rather
    // than destroying the ticket and handing back nothing.
    await expect(
      world.as("member").gql(SeedUseItemDocument, {
        input: { itemId: world.myoItems.ticketIds[0] },
      }),
    ).rejects.toThrow(/redeemed by making a character/i);

    const { item } = await world.as("member").gql(SeedItemDocument, {
      id: world.myoItems.ticketIds[0],
    });
    expect(item.destroyedAt).toBeNull();
  });
});

/**
 * Configuring what a ticket makes.
 *
 * Everything here is refused where staff can see it rather than at redemption
 * in front of a member.
 */
test.describe("configuring an MYO grant", () => {
  test.use({ persona: "quartermaster" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("cannot be set on something that is never used up", async ({
    world,
  }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeMyoGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.locket.id,
          speciesId: world.species.id,
          speciesVariantIds: [world.variants.common.id],
        },
      }),
    ).rejects.toThrow(/not consumable/i);
  });

  test("cannot name a variant of another species", async ({ world }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeMyoGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.blankTicket.id,
          speciesId: world.species.id,
          // A currency id is not a variant id. Any foreign uuid does here;
          // what matters is that the variant is not one of this species'.
          speciesVariantIds: [world.currencies.coin.id],
        },
      }),
    ).rejects.toThrow(/not a /i);
  });

  test("cannot sit on a type that already pays out", async ({ world }) => {
    // An item type does one thing when used. The Coin Ticket already pays.
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeMyoGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.ticket.id,
          speciesId: world.species.id,
          speciesVariantIds: [world.variants.common.id],
        },
      }),
    ).rejects.toThrow(/already has a payout/i);
  });

  test("blocks a payout on a type that already makes characters", async ({
    world,
  }) => {
    // The same rule from the other side, which is the half that would be easy
    // to forget: adding the check to one setter and not the other leaves the
    // exclusivity depending on which staff member configures first.
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeUsePayoutDocument, {
        input: {
          itemTypeId: world.itemTypes.myoTicket.id,
          components: [{ currencyId: world.currencies.coin.id, amount: 10 }],
        },
      }),
    ).rejects.toThrow(/already has a MYO grant/i);
  });

  test("an ordinary member cannot set one", async ({ world }) => {
    // It hands out the right to create characters.
    await expect(
      world.as("member").gql(SeedSetItemTypeMyoGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.blankTicket.id,
          speciesId: world.species.id,
          speciesVariantIds: [world.variants.common.id],
        },
      }),
    ).rejects.toThrow();
  });

  test("an empty variant list clears the grant", async ({ world }) => {
    const { setItemTypeMyoGrant } = await world
      .as("quartermaster")
      .gql(SeedSetItemTypeMyoGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.myoTicket.id,
          speciesVariantIds: [],
        },
      });

    expect(setItemTypeMyoGrant.useMyoGrant).toBeNull();
  });
});

/**
 * What staff do with the review afterwards.
 *
 * Approving gives the character its number; refusing undoes the redemption.
 * Both are the parts a member feels most, and neither existed before.
 */
test.describe("reviewing an MYO character", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  const redeem = async (world: World<CommunityItemsWorld>, name: string) => {
    const { createCharacterFromMyoTicket } = await world
      .as("member")
      .gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId: world.myoItems.ticketIds[0],
          speciesVariantId: world.variants.common.id,
          name,
        },
      });
    return createCharacterFromMyoTicket;
  };

  /** The pending review for a character, found through the staff queue. */
  const reviewFor = async (
    world: World<CommunityItemsWorld>,
    characterId: string,
  ) => {
    const { traitReviewQueue } = await world
      .as("commadmin")
      .gql(SeedTraitReviewQueueDocument, {
        communityId: world.community.id,
        first: 50,
      });
    const found = traitReviewQueue.items.find(
      (i: { review: { characterId: string } }) =>
        i.review.characterId === characterId,
    );
    expect(found).toBeTruthy();
    return found!.review;
  };

  test("arrives in the staff review queue", async ({ world }) => {
    const character = await redeem(world, "Queuebound");
    const review = await reviewFor(world, character.id);
    expect(review.status).toBe("PENDING");
  });

  test("gets its registry number on approval", async ({ world }) => {
    const character = await redeem(world, "Numberless");
    // A member cannot set one, so it arrives without.
    expect(character.registryId).toBeNull();

    const review = await reviewFor(world, character.id);
    await world.as("commadmin").gql(SeedApproveTraitReviewDocument, {
      input: { reviewId: review.id },
    });

    const { character: approved } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: character.id });
    expect(approved.registryId).toMatch(/^\d{4,}$/);
  });

  test("refusing it returns the ticket and takes the character", async ({
    world,
  }) => {
    const character = await redeem(world, "Refused");
    const afterSpending = await myoTicketsHeldFor(world);

    const review = await reviewFor(world, character.id);
    await world.as("commadmin").gql(SeedRevertTraitReviewDocument, {
      input: { reviewId: review.id, reason: "Traits do not match the species" },
    });

    // Both halves. Reverting the trait values -- what rejection means
    // everywhere else -- would leave the member with neither a usable
    // character nor a ticket.
    expect(await myoTicketsHeldFor(world)).toBe(afterSpending + 1);
    await expect(
      world.as("member").gql(SeedCharacterDocument, { id: character.id }),
    ).rejects.toThrow();
  });

  test("refusing it twice returns only one ticket", async ({ world }) => {
    const character = await redeem(world, "Doubly refused");
    const review = await reviewFor(world, character.id);

    await world.as("commadmin").gql(SeedRevertTraitReviewDocument, {
      input: { reviewId: review.id, reason: "No" },
    });
    const afterFirst = await myoTicketsHeldFor(world);

    // Returning a ticket is a mint, so the second attempt must find the
    // review already resolved and hand back nothing.
    await expect(
      world.as("commadmin").gql(SeedRevertTraitReviewDocument, {
        input: { reviewId: review.id, reason: "No again" },
      }),
    ).rejects.toThrow();

    expect(await myoTicketsHeldFor(world)).toBe(afterFirst);
  });

  const myoTicketsHeldFor = async (world: World<CommunityItemsWorld>) => {
    const { memberHoldings } = await world
      .as("member")
      .gql(SeedMemberHoldingsDocument, {
        communityId: world.community.id,
        userId: world.users.member.userId,
      });
    return (
      memberHoldings.holdings.find(
        (h: { itemType: { id: string } }) =>
          h.itemType.id === world.itemTypes.myoTicket.id,
      )?.count ?? 0
    );
  };
});

/**
 * The same thing through the screens a member actually uses.
 *
 * The blocks above prove the mechanism and press no buttons. These cover what
 * sits on top: that the ticket is a link rather than a confirm, that the
 * create page narrows itself to what the ticket allows, and that the fields a
 * ticket-holder must not reach are absent rather than merely refused.
 */
test.describe("spending an MYO ticket, through the page", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("the inventory offers a link, and following it spends nothing", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/inventory`);

    // member holds two, so the group is collapsed behind its disclosure.
    await page
      .locator(`[data-item-type-id="${world.itemTypes.myoTicket.id}"]`)
      .getByTestId("expand-group")
      .click();

    const itemId = world.myoItems.ticketIds[0];
    await page.getByTestId(`use-item-${itemId}`).click();

    await expect(page).toHaveURL(new RegExp(`ticket=${itemId}`));
    await expect(page.getByTestId("myo-ticket-panel")).toBeVisible();

    // Nothing has been consumed by arriving here. The ticket is spent by
    // submitting, which is the whole reason this is a link.
    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: itemId });
    expect(item.destroyedAt).toBeNull();
  });

  test("offers only the variants the ticket allows", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/character/create?ticket=${world.myoItems.ticketIds[0]}`,
    );

    await expect(page.getByTestId("myo-species")).toHaveText(
      world.species.name,
    );
    await expect(
      page.getByTestId(`myo-variant-${world.variants.common.id}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`myo-variant-${world.variants.uncommon.id}`),
    ).toBeVisible();
    // Present on the species, absent from the ticket. Offering it and then
    // refusing the submit would be a worse place to find out.
    await expect(
      page.getByTestId(`myo-variant-${world.variants.rare.id}`),
    ).toHaveCount(0);
  });

  test("hides the fields a ticket-holder must not set", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/character/create?ticket=${world.myoItems.ticketIds[0]}`,
    );

    await expect(page.getByTestId("myo-ticket-panel")).toBeVisible();
    // Staff's to assign. Absent rather than disabled: a disabled field is
    // still an invitation to look for the way to enable it.
    await expect(page.locator("#registryId")).toHaveCount(0);
    // The species picker is gone too -- the ticket answered that question.
    await expect(page.getByText("Species selection is required")).toHaveCount(
      0,
    );
  });

  test("makes the character and takes the ticket", async ({ page, world }) => {
    const itemId = world.myoItems.ticketIds[0];
    await page.goto(`${world.community.url}/character/create?ticket=${itemId}`);

    await page.getByTestId(`myo-variant-${world.variants.uncommon.id}`).click();
    await page.locator("#name").fill("Pagebound");
    await page.getByTestId("submit-character").click();

    // Redeeming destroys the ticket, so it never happens on a single click.
    // The dialog names the ticket, because "are you sure?" about an unnamed
    // thing is a question nobody can answer.
    const dialog = page.getByTestId("redeem-myo-dialog");
    await expect(dialog).toContainText(world.itemTypes.myoTicket.name);
    await page.getByTestId("confirm-accept").click();

    // Lands on the character it made.
    await expect(page).toHaveURL(/\/character\/[0-9a-f-]{36}$/);

    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: itemId });
    expect(item.destroyedAt).not.toBeNull();
  });

  test("cancelling the confirm redeems nothing", async ({ page, world }) => {
    const itemId = world.myoItems.ticketIds[0];
    await page.goto(`${world.community.url}/character/create?ticket=${itemId}`);

    await page.getByTestId(`myo-variant-${world.variants.uncommon.id}`).click();
    await page.locator("#name").fill("Unmade");
    await page.getByTestId("submit-character").click();
    await page.getByTestId("confirm-cancel").click();

    // A dialog that dismissed but redeemed anyway would be worse than the
    // single click it replaced.
    await expect(page.getByTestId("redeem-myo-dialog")).toHaveCount(0);
    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: itemId });
    expect(item.destroyedAt).toBeNull();
  });

  test("cannot be submitted without picking a variant", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/character/create?ticket=${world.myoItems.ticketIds[0]}`,
    );

    await page.locator("#name").fill("Undecided");
    // Two variants on this ticket, so nothing is auto-picked and the server
    // would refuse the submit. Refused here instead, before it costs anything.
    await expect(page.getByTestId("submit-character")).toBeDisabled();
  });

  test("says a spent ticket cannot be used", async ({ page, world }) => {
    const itemId = world.myoItems.ticketIds[0];
    await world.as("member").gql(SeedCreateCharacterFromMyoTicketDocument, {
      input: {
        itemId,
        speciesVariantId: world.variants.common.id,
        name: "Already made",
      },
    });

    await page.goto(`${world.community.url}/character/create?ticket=${itemId}`);

    // Said before they write a character, not after they submit one. The
    // grant hangs off the item *type*, which still has one -- so this fails
    // if the page reads the grant without checking that this particular item
    // is still spendable.
    await expect(page.getByTestId("myo-ticket-unusable")).toBeVisible();
    await expect(page.getByTestId("submit-character")).toBeDisabled();
  });

  test("says somebody else's ticket cannot be used", async ({
    page,
    world,
  }) => {
    // othermember's inventory is not reachable through the UI, so this URL is
    // only arrived at by editing one -- but the same missing check covered
    // both, and a live ticket someone else holds is the case that looks most
    // like a working one.
    const { grantItem } = await world
      .as("quartermaster")
      .gql(SeedGrantItemDocument, {
        input: {
          itemTypeId: world.itemTypes.myoTicket.id,
          userId: world.users.othermember.userId,
          quantity: 1,
          reason: "Event prize",
        },
      });

    await page.goto(
      `${world.community.url}/character/create?ticket=${grantItem[0].id}`,
    );

    await expect(page.getByTestId("myo-ticket-unusable")).toBeVisible();
    await expect(page.getByTestId("submit-character")).toBeDisabled();
  });

  test("says what a ticket makes on the item type's page", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/item-types/${world.itemTypes.myoTicket.id}`,
    );

    // Before this the allow-list appeared only on the create page, which
    // nobody can reach without already holding one -- useless to somebody
    // weighing up a trade for it.
    const grant = page.getByTestId("item-type-myo-grant");
    await expect(grant).toContainText(world.species.name);
    await expect(grant).toContainText(world.variants.common.name);
    await expect(grant).toContainText(world.variants.uncommon.name);
  });
});
