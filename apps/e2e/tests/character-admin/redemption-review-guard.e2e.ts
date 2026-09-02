import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import {
  SeedCreateCharacterFromMyoTicketDocument,
  SeedEditCharacterTraitsWithKitDocument,
  SeedDeleteCharacterDocument,
  SeedKickCharacterFromSpeciesDocument,
  SeedTraitReviewQueueDocument,
  SeedRevertTraitReviewDocument,
  SeedApproveTraitReviewDocument,
  SeedMemberHoldingsDocument,
  SeedCreateCharacterDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * Disposing of a character whose redemption is still under review.
 *
 * A pending MYO or edit-kit review means the member's item is **already
 * destroyed** -- redemption consumes it in the same transaction that creates
 * the review. Refusing the review is what hands it back.
 *
 * Every disposal path resolves pending reviews to CANCELLED on the way past,
 * and the return is guarded on the review still being PENDING. So deleting a
 * character mid-review did not merely skip the refund: it closed the only door
 * to it, permanently, from a red button sitting beside Approve (#327).
 *
 * These pin the guard and, just as importantly, pin how narrow it is. A
 * CREATION review has no item behind it and must still be deletable.
 */
test.describe("disposing of a character under redemption review", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

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

  /** Redeem an MYO ticket and hand back the character it made. */
  const redeemMyo = async (world: World<CommunityItemsWorld>, name: string) => {
    const { createCharacterFromMyoTicket } = await world
      .as("member")
      .gql(SeedCreateCharacterFromMyoTicketDocument, {
        input: {
          itemId: world.myoItems.ticketIds[0],
          speciesVariantId: world.variants.common.id,
          name,
        },
      });
    return createCharacterFromMyoTicket.id;
  };

  test("deleting an MYO character under review is refused", async ({
    world,
  }) => {
    const id = await redeemMyo(world, "Unjudged");

    await expect(
      world.as("commadmin").gql(SeedDeleteCharacterDocument, { id }),
    ).rejects.toThrow(/refuse the review first/i);
  });

  test("the refusal says what to do instead", async ({ world }) => {
    // The discriminating assertion. A guard that blocks without naming the way
    // out is a wall, and staff will route around it by reaching for the API.
    const id = await redeemMyo(world, "Unjudged");

    const message = await world
      .as("commadmin")
      .gql(SeedDeleteCharacterDocument, { id })
      .then(
        () => null,
        (err: Error) => err.message,
      );

    expect(message).toMatch(/returns the item/i);
  });

  test("removing an MYO character from its species is refused", async ({
    world,
  }) => {
    const id = await redeemMyo(world, "Unjudged");

    await expect(
      world.as("commadmin").gql(SeedKickCharacterFromSpeciesDocument, { id }),
    ).rejects.toThrow(/refuse the review first/i);
  });

  test("deleting is allowed once the review is refused", async ({ world }) => {
    const id = await redeemMyo(world, "Refused then gone");
    const review = await reviewFor(world, id);

    await world.as("commadmin").gql(SeedRevertTraitReviewDocument, {
      input: { reviewId: review.id, reason: "Not in the guide" },
    });

    // Refusing already removes an MYO character, so the guard's real promise
    // is the ticket: it is back before anything else could take it away.
    expect(await myoTicketsHeld(world)).toBeGreaterThan(0);
  });

  test("deleting is allowed once the review is approved", async ({ world }) => {
    const id = await redeemMyo(world, "Approved then gone");
    const review = await reviewFor(world, id);

    await world.as("commadmin").gql(SeedApproveTraitReviewDocument, {
      input: { reviewId: review.id },
    });

    await expect(
      world.as("commadmin").gql(SeedDeleteCharacterDocument, { id }),
    ).resolves.toBeTruthy();
  });

  test("a character with an edit-kit change under review is refused", async ({
    world,
  }) => {
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.bramblefoot.id,
        traitValues: [
          {
            traitId: world.traits.eyeColor.id,
            value: world.traits.eyeColor.values.blue,
          },
        ],
      },
    });

    // Worse than the MYO case, which is why it is here: this character existed
    // before the review, with its own media, comments and trade history.
    // Deleting it destroys all of that *and* strands the kit.
    await expect(
      world.as("commadmin").gql(SeedDeleteCharacterDocument, {
        id: world.characters.bramblefoot.id,
      }),
    ).rejects.toThrow(/refuse the review first/i);
  });

  test("a character with no review at all is still deletable", async ({
    world,
  }) => {
    // The guard must be narrow. Without this, widening it to every pending
    // review -- or to every character -- would go unnoticed.
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: { name: "Ordinary", speciesId: world.species.id },
      });

    await expect(
      world
        .as("commadmin")
        .gql(SeedDeleteCharacterDocument, { id: createCharacter.id }),
    ).resolves.toBeTruthy();
  });

  test("a creation review does not block deletion", async ({ world }) => {
    // A CREATION review has no item behind it. Seeded with trait values, which
    // is what opens one.
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name: "Created with traits",
          speciesId: world.species.id,
          traitValues: [
            {
              traitId: world.traits.eyeColor.id,
              value: world.traits.eyeColor.values.green,
            },
          ],
        },
      });

    await expect(
      world
        .as("commadmin")
        .gql(SeedDeleteCharacterDocument, { id: createCharacter.id }),
    ).resolves.toBeTruthy();
  });
});

/**
 * What the review queue offers for a redemption.
 *
 * Approve and Refuse, and nothing that disposes of the character. The server
 * refuses those anyway; this is about not offering a button whose every press
 * is a refusal.
 */
test.describe("the review queue's actions", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("an MYO review offers Approve and Refuse only", async ({
    page,
    world,
  }) => {
    await world.as("member").gql(SeedCreateCharacterFromMyoTicketDocument, {
      input: {
        itemId: world.myoItems.ticketIds[0],
        speciesVariantId: world.variants.common.id,
        name: "Emberquill",
      },
    });

    await page.goto(`/communities/${world.community.id}/moderation/traits`);

    await expect(
      page.getByRole("button", { name: "Approve" }),
    ).toBeVisible();
    // "Refuse", not "Revert": there is nothing to revert to, and what the
    // button does is hand the ticket back.
    await expect(page.getByRole("button", { name: "Refuse" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Remove from Species" }),
    ).toHaveCount(0);
  });

  test("an edit-kit review offers Approve and Refuse only", async ({
    page,
    world,
  }) => {
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.bramblefoot.id,
        traitValues: [
          {
            traitId: world.traits.eyeColor.id,
            value: world.traits.eyeColor.values.blue,
          },
        ],
      },
    });

    await page.goto(`/communities/${world.community.id}/moderation/traits`);

    await expect(page.getByRole("button", { name: "Refuse" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Remove from Species" }),
    ).toHaveCount(0);
  });
});
