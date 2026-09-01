import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import {
  SeedEditCharacterTraitsWithKitDocument,
  SeedSetItemTypeTraitEditGrantDocument,
  SeedSetItemTypeUsePayoutDocument,
  SeedUseItemDocument,
  SeedItemDocument,
  SeedCharacterDocument,
  SeedMemberHoldingsDocument,
  SeedTraitReviewQueueDocument,
  SeedApproveTraitReviewDocument,
  SeedRevertTraitReviewDocument,
  SeedUpdateCharacterRegistryDocument,
  SeedCreateCharacterDocument,
  SeedCreateSpeciesDocument,
  SeedCreateSpeciesVariantDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/** Propose Blue eyes, which no seeded character has. */
const blueEyes = (world: World<CommunityItemsWorld>) => [
  {
    traitId: world.traits.eyeColor.id,
    value: world.traits.eyeColor.values.blue,
  },
];

/**
 * Spending an edit kit on a character's traits.
 *
 * The thing that makes this different from every other review in the codebase
 * is that **nothing is applied until staff approve**. Most of what follows is
 * about that: the character must be unchanged while the review is pending, the
 * approval is what writes, and a refusal must leave the traits alone and hand
 * the kit back.
 *
 * `member` holds two Thornwing Edit Kits (species-wide) and one narrowed to
 * Common.
 */
test.describe("spending an edit kit", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  const kitsHeld = async (
    world: World<CommunityItemsWorld>,
    itemTypeId: string,
  ) => {
    const { memberHoldings } = await world
      .as("member")
      .gql(SeedMemberHoldingsDocument, {
        communityId: world.community.id,
        userId: world.users.member.userId,
      });
    return (
      memberHoldings.holdings.find(
        (h: { itemType: { id: string } }) => h.itemType.id === itemTypeId,
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

  test("spends the kit and proposes, without changing the character", async ({
    world,
  }) => {
    const before = await kitsHeld(world, world.itemTypes.editKit.id);

    const { editCharacterTraitsWithKit: review } = await world
      .as("member")
      .gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.kitIds[0],
          characterId: world.characters.bramblefoot.id,
          traitValues: blueEyes(world),
        },
      });

    expect(review.status).toBe("PENDING");
    expect(review.source).toBe("USER_EDIT");
    expect(await kitsHeld(world, world.itemTypes.editKit.id)).toBe(before - 1);

    // The whole point of this feature's shape. Every other review source
    // writes its values up front; if this one did, the member would be
    // wearing an unapproved trait right now.
    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.bramblefoot.id });
    expect(character.traitValues).toEqual([]);
    expect(character.traitReviewStatus).toBe("PENDING");
  });

  test("approving is what applies the change", async ({ world }) => {
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.bramblefoot.id,
        traitValues: blueEyes(world),
      },
    });

    const review = await reviewFor(world, world.characters.bramblefoot.id);
    await world.as("commadmin").gql(SeedApproveTraitReviewDocument, {
      input: { reviewId: review.id },
    });

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.bramblefoot.id });
    expect(character.traitValues).toHaveLength(1);
    expect(character.traitValues[0].value).toBe(
      world.traits.eyeColor.values.blue,
    );
    expect(character.traitReviewStatus).toBe("APPROVED");
  });

  test("refusing leaves the traits alone and returns the kit", async ({
    world,
  }) => {
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.bramblefoot.id,
        traitValues: blueEyes(world),
      },
    });
    const afterSpending = await kitsHeld(world, world.itemTypes.editKit.id);

    const review = await reviewFor(world, world.characters.bramblefoot.id);
    await world.as("commadmin").gql(SeedRevertTraitReviewDocument, {
      input: { reviewId: review.id, reason: "Not in the species guide" },
    });

    expect(await kitsHeld(world, world.itemTypes.editKit.id)).toBe(
      afterSpending + 1,
    );

    // Nothing to revert: the proposal never touched the character. A revert
    // that wrote previousTraitValues back would be a no-op here and a clobber
    // if staff had edited in the meantime.
    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.bramblefoot.id });
    expect(character.traitValues).toEqual([]);
  });

  test("refusing twice returns only one kit", async ({ world }) => {
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.bramblefoot.id,
        traitValues: blueEyes(world),
      },
    });
    const review = await reviewFor(world, world.characters.bramblefoot.id);

    await world.as("commadmin").gql(SeedRevertTraitReviewDocument, {
      input: { reviewId: review.id, reason: "No" },
    });
    const afterFirst = await kitsHeld(world, world.itemTypes.editKit.id);

    await expect(
      world.as("commadmin").gql(SeedRevertTraitReviewDocument, {
        input: { reviewId: review.id, reason: "No again" },
      }),
    ).rejects.toThrow();

    expect(await kitsHeld(world, world.itemTypes.editKit.id)).toBe(afterFirst);
  });

  test("cannot be spent twice", async ({ world }) => {
    const itemId = world.editKitItems.kitIds[0];
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId,
        characterId: world.characters.bramblefoot.id,
        traitValues: blueEyes(world),
      },
    });
    const after = await kitsHeld(world, world.itemTypes.editKit.id);

    await expect(
      world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId,
          characterId: world.characters.hearthstone.id,
          traitValues: blueEyes(world),
        },
      }),
    ).rejects.toThrow();

    expect(await kitsHeld(world, world.itemTypes.editKit.id)).toBe(after);
  });

  test("refuses a second kit while one is already pending", async ({
    world,
  }) => {
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.bramblefoot.id,
        traitValues: blueEyes(world),
      },
    });
    const after = await kitsHeld(world, world.itemTypes.editKit.id);

    await expect(
      world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.kitIds[1],
          characterId: world.characters.bramblefoot.id,
          traitValues: [
            {
              traitId: world.traits.eyeColor.id,
              value: world.traits.eyeColor.values.green,
            },
          ],
        },
      }),
    ).rejects.toThrow(/already has a change awaiting review/i);

    // Refused before the kit is consumed. A spent kit and no review is the
    // worst outcome this feature has.
    expect(await kitsHeld(world, world.itemTypes.editKit.id)).toBe(after);
  });

  test("cannot be spent on somebody else's character", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.kitIds[0],
          // Marrowfen is othermember's.
          characterId: world.characters.marrowfen.id,
          traitValues: blueEyes(world),
        },
      }),
    ).rejects.toThrow(/not yours to edit/i);
  });

  test("cannot be spent by somebody who does not hold it", async ({
    world,
  }) => {
    await expect(
      world.as("othermember").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.kitIds[0],
          characterId: world.characters.marrowfen.id,
          traitValues: blueEyes(world),
        },
      }),
    ).rejects.toThrow(/not yours/i);
  });

  test("refuses a change that changes nothing", async ({ world }) => {
    const before = await kitsHeld(world, world.itemTypes.editKit.id);

    // Bramblefoot has no traits, so proposing none is proposing the status
    // quo. Spending a kit for that is the accident most worth catching.
    await expect(
      world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.kitIds[0],
          characterId: world.characters.bramblefoot.id,
          traitValues: [],
        },
      }),
    ).rejects.toThrow(/would change nothing/i);

    expect(await kitsHeld(world, world.itemTypes.editKit.id)).toBe(before);
  });

  test("cannot be used from the inventory like a payout ticket", async ({
    world,
  }) => {
    await expect(
      world.as("member").gql(SeedUseItemDocument, {
        input: { itemId: world.editKitItems.kitIds[0] },
      }),
    ).rejects.toThrow(/editing a character's traits with it/i);

    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: world.editKitItems.kitIds[0] });
    expect(item.destroyedAt).toBeNull();
  });
});

/**
 * Which characters a kit covers.
 *
 * The species-wide kit and the Common-only kit exist as a pair so that the
 * variant list can be proved to narrow rather than decorate.
 */
test.describe("what an edit kit covers", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  /** A character of `member`'s, set to the given variant. */
  const characterOfVariant = async (
    world: World<CommunityItemsWorld>,
    name: string,
    speciesVariantId: string | undefined,
  ) => {
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: { name, speciesId: world.species.id, speciesVariantId },
      });
    return createCharacter.id;
  };

  test("a species-wide kit covers a character with no variant", async ({
    world,
  }) => {
    // The case an `includes` check gets wrong by omission, and the reason the
    // rule is a branch rather than a comparison.
    const id = await characterOfVariant(world, "Variantless", undefined);

    await expect(
      world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.kitIds[0],
          characterId: id,
          traitValues: blueEyes(world),
        },
      }),
    ).resolves.toBeTruthy();
  });

  test("a species-wide kit covers every variant", async ({ world }) => {
    const id = await characterOfVariant(
      world,
      "Rare One",
      world.variants.rare.id,
    );

    await expect(
      world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.kitIds[0],
          characterId: id,
          traitValues: blueEyes(world),
        },
      }),
    ).resolves.toBeTruthy();
  });

  test("a narrowed kit refuses a variant it does not name", async ({
    world,
  }) => {
    const id = await characterOfVariant(
      world,
      "Rare Two",
      world.variants.rare.id,
    );

    // Same species, same owner, and the species-wide kit would take it. Only
    // the variant list makes this a refusal.
    await expect(
      world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.commonOnlyKitId,
          characterId: id,
          traitValues: blueEyes(world),
        },
      }),
    ).rejects.toThrow(/cannot be used on that character/i);
  });

  test("a narrowed kit accepts the variant it names", async ({ world }) => {
    const id = await characterOfVariant(
      world,
      "Common One",
      world.variants.common.id,
    );

    await expect(
      world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
        input: {
          itemId: world.editKitItems.commonOnlyKitId,
          characterId: id,
          traitValues: blueEyes(world),
        },
      }),
    ).resolves.toBeTruthy();
  });
});

/**
 * Configuring what a kit covers.
 */
test.describe("configuring an edit kit grant", () => {
  test.use({ persona: "quartermaster" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("cannot be set on something that is never used up", async ({
    world,
  }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeTraitEditGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.locket.id,
          species: [{ speciesId: world.species.id, speciesVariantIds: [] }],
        },
      }),
    ).rejects.toThrow(/not consumable/i);
  });

  test("cannot name a variant of another species", async ({ world }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeTraitEditGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.blankTicket.id,
          species: [
            {
              speciesId: world.species.id,
              speciesVariantIds: [world.currencies.coin.id],
            },
          ],
        },
      }),
    ).rejects.toThrow(/not a /i);
  });

  test("cannot sit on a type that already pays out", async ({ world }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeTraitEditGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.ticket.id,
          species: [{ speciesId: world.species.id, speciesVariantIds: [] }],
        },
      }),
    ).rejects.toThrow(/already has a payout/i);
  });

  test("cannot sit on a type that already makes characters", async ({
    world,
  }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeTraitEditGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.myoTicket.id,
          species: [{ speciesId: world.species.id, speciesVariantIds: [] }],
        },
      }),
    ).rejects.toThrow(/already has a MYO grant/i);
  });

  test("blocks a payout on a type that already edits traits", async ({
    world,
  }) => {
    // The exclusivity rule from the third side. Three setters each needed to
    // learn about the new effect, and this is the one that catches the setter
    // that did not.
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeUsePayoutDocument, {
        input: {
          itemTypeId: world.itemTypes.editKit.id,
          components: [{ currencyId: world.currencies.coin.id, amount: 10 }],
        },
      }),
    ).rejects.toThrow(/already has a edit kit grant/i);
  });

  test("an ordinary member cannot set one", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedSetItemTypeTraitEditGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.blankTicket.id,
          species: [{ speciesId: world.species.id, speciesVariantIds: [] }],
        },
      }),
    ).rejects.toThrow();
  });

  test("an empty species list clears the grant", async ({ world }) => {
    const { setItemTypeTraitEditGrant } = await world
      .as("quartermaster")
      .gql(SeedSetItemTypeTraitEditGrantDocument, {
        input: { itemTypeId: world.itemTypes.editKit.id, species: [] },
      });

    expect(setItemTypeTraitEditGrant.useTraitEditGrant).toBeNull();
  });
});

/**
 * A variant belongs to one species, and until this branch nothing checked it.
 *
 * `updateCharacterRegistry` accepts a `speciesVariantId`, the mapper turns it
 * into a connect, and nothing asked whether it belonged to the character's
 * species -- so a character could be put on a variant of an entirely different
 * species, which then decides its trait list and what a kit matches against.
 *
 * Not an edit-kit feature, but it is the hole the "no variant transitions"
 * rule sits on top of, so it is closed and pinned here.
 */
test.describe("changing a character's variant", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("accepts a variant of the character's own species", async ({
    world,
  }) => {
    const { updateCharacterRegistry } = await world
      .as("commadmin")
      .gql(SeedUpdateCharacterRegistryDocument, {
        id: world.characters.bramblefoot.id,
        input: { speciesVariantId: world.variants.rare.id },
      });

    expect(updateCharacterRegistry.speciesVariantId).toBe(
      world.variants.rare.id,
    );
  });

  test("refuses a variant belonging to another species", async ({ world }) => {
    // A second species with its own variant. Before the fix this succeeded and
    // left a Thornwing wearing a Bramblecat's rarity.
    const { createSpecies: other } = await world
      .as("commadmin")
      .gql(SeedCreateSpeciesDocument, {
        createSpeciesInput: {
          name: "Bramblecat",
          communityId: world.community.id,
        },
      });
    const { createSpeciesVariant: otherVariant } = await world
      .as("commadmin")
      .gql(SeedCreateSpeciesVariantDocument, {
        createSpeciesVariantInput: { name: "Sleek", speciesId: other.id },
      });

    await expect(
      world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
        id: world.characters.bramblefoot.id,
        input: { speciesVariantId: otherVariant.id },
      }),
    ).rejects.toThrow(/different species/i);
  });
});
