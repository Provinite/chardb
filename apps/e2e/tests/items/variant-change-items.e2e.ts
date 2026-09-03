import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import {
  SeedChangeCharacterVariantWithItemDocument,
  SeedSetItemTypeVariantChangeGrantDocument,
  SeedSetItemTypeUsePayoutDocument,
  SeedSetItemTypeMyoGrantDocument,
  SeedEditCharacterTraitsWithKitDocument,
  SeedUseItemDocument,
  SeedItemDocument,
  SeedCharacterDocument,
  SeedCharacterVariantChangesDocument,
  SeedMemberHoldingsDocument,
  SeedItemTransactionsDocument,
  SeedCreateItemTypeDocument,
  SeedKickCharacterFromSpeciesDocument,
  ItemTransactionKind,
  SeedCreateSpeciesDocument,
  SeedCreateSpeciesVariantDocument,
  SeedCreateCommunityDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/** A trait value naming one of the seeded eye colours. */
const eyes = (world: World<CommunityItemsWorld>, colour: string) => [
  { traitId: world.traits.eyeColor.id, value: world.traits.eyeColor.values[colour] },
];

const held = async (world: World<CommunityItemsWorld>, itemTypeId: string) => {
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

/**
 * Redeeming an item to move a character between variants.
 *
 * The thing that makes this different from the other two redemptions is that
 * **it applies immediately and opens no review**. Much of what follows is
 * about that: the character must actually be the new variant when the mutation
 * returns, its review status must be untouched, and no queue entry may appear.
 *
 * `member` holds two Rare Thornwing Upgrades (Common or Uncommon to Rare) and
 * two Thornwing Ascensions (any variant to Legendary, which permits Amber eyes
 * and nothing else).
 */
test.describe("redeeming a variant change item", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("moves the character and spends exactly one item", async ({ world }) => {
    const before = await held(world, world.itemTypes.rareUpgrade.id);

    const { changeCharacterVariantWithItem: moved } = await world
      .as("member")
      .gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: world.characters.pinefall.id,
          // Blue is permitted by Rare as well as Common, so nothing is
          // stranded and the values carry over unchanged.
          traitValues: eyes(world, "blue"),
        },
      });

    expect(moved.speciesVariantId).toBe(world.variants.rare.id);
    expect(await held(world, world.itemTypes.rareUpgrade.id)).toBe(before - 1);

    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: world.variantChangeItems.rareUpgradeIds[0] });
    expect(item.destroyedAt).not.toBeNull();
  });

  test("applies immediately, opening no review", async ({ world }) => {
    // The whole product decision, pinned. If a review is ever added here it
    // should be a deliberate change to this assertion, not a silent one.
    const beforeStatus = (
      await world
        .as("member")
        .gql(SeedCharacterDocument, { id: world.characters.pinefall.id })
    ).character.traitReviewStatus;

    await world
      .as("member")
      .gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "green"),
        },
      });

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });

    expect(character.speciesVariantId).toBe(world.variants.rare.id);
    expect(character.traitValues).toEqual([
      { traitId: world.traits.eyeColor.id, value: world.traits.eyeColor.values.green },
    ]);
    expect(character.traitReviewStatus).toBe(beforeStatus);
    expect(character.pendingTraitReviewSource).toBeNull();
  });

  test("records the move in the character's variant history", async ({
    world,
  }) => {
    await world
      .as("member")
      .gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "blue"),
        },
      });

    const { characterVariantChanges: history } = await world
      .as("member")
      .gql(SeedCharacterVariantChangesDocument, {
        characterId: world.characters.pinefall.id,
      });

    expect(history).toHaveLength(1);
    expect(history[0].fromVariant?.id).toBe(world.variants.common.id);
    expect(history[0].toVariant?.id).toBe(world.variants.rare.id);
    expect(history[0].changedBy?.username).toBe(
      world.users.member.username,
    );
    // What bought the change. A history that said only "Common to Rare" could
    // not tell a staff correction from a redemption.
    expect(history[0].reason).toMatch(/redeemed .*rare thornwing upgrade/i);
  });

  test("writes one USE row on the item ledger", async ({ world }) => {
    await world
      .as("member")
      .gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "blue"),
        },
      });

    const { itemTransactions } = await world
      .as("quartermaster")
      .gql(SeedItemTransactionsDocument, {
        filters: {
          communityId: world.community.id,
          itemTypeId: world.itemTypes.rareUpgrade.id,
          kinds: [ItemTransactionKind.Use],
        },
      });

    expect(itemTransactions.transactions).toHaveLength(1);
    const row = itemTransactions.transactions[0];
    expect(row.itemId).toBe(world.variantChangeItems.rareUpgradeIds[0]);
    expect(row.fromUser?.id).toBe(world.users.member.userId);
    expect(row.reason).toMatch(/redeemed .*rare thornwing upgrade/i);
  });

  test("an empty source list covers a character with no variant", async ({
    world,
  }) => {
    // Bramblefoot has no variant at all. A source list read as a plain
    // membership test gets this wrong by omission, which is why the Ascension
    // exists with its list left empty.
    const { changeCharacterVariantWithItem: moved } = await world
      .as("member")
      .gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.ascensionIds[0],
          characterId: world.characters.bramblefoot.id,
          traitValues: eyes(world, "amber"),
        },
      });

    expect(moved.speciesVariantId).toBe(world.variants.legendary.id);
  });

  test("refuses a value the destination variant does not allow", async ({
    world,
  }) => {
    const before = await held(world, world.itemTypes.legendaryAscension.id);

    // Pinefall has Blue eyes and Legendary permits Amber alone. Carrying the
    // value across unchanged is exactly what the member must not be allowed
    // to do by accident.
    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.ascensionIds[0],
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "blue"),
        },
      }),
    ).rejects.toThrow(/not available to/i);

    // Refused before anything was destroyed. A member who loses the item to a
    // validation error has the worst outcome this feature has.
    expect(await held(world, world.itemTypes.legendaryAscension.id)).toBe(
      before,
    );
  });

  test("accepts the same move once the stranded value is re-picked", async ({
    world,
  }) => {
    const { changeCharacterVariantWithItem: moved } = await world
      .as("member")
      .gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.ascensionIds[0],
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "amber"),
        },
      });

    expect(moved.speciesVariantId).toBe(world.variants.legendary.id);

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(character.traitValues).toEqual([
      { traitId: world.traits.eyeColor.id, value: world.traits.eyeColor.values.amber },
    ]);
  });

  test("refuses a character that is already the destination", async ({
    world,
  }) => {
    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          // Emberwake is already Rare.
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: world.characters.emberwake.id,
          traitValues: eyes(world, "amber"),
        },
      }),
    ).rejects.toThrow(/already/i);
  });

  test("refuses a character outside the source list", async ({ world }) => {
    // Ashglass is Legendary, which the Rare upgrade does not name. A distinct
    // refusal from Emberwake's, and it must read differently.
    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: world.characters.ashglass.id,
          traitValues: eyes(world, "amber"),
        },
      }),
    ).rejects.toThrow(/cannot be redeemed on that character/i);
  });

  test("cannot be redeemed on somebody else's character", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.ascensionIds[0],
          // Marrowfen is othermember's.
          characterId: world.characters.marrowfen.id,
          traitValues: eyes(world, "amber"),
        },
      }),
    ).rejects.toThrow(/not yours to change/i);
  });

  test("cannot be redeemed by somebody who does not hold it", async ({
    world,
  }) => {
    await expect(
      world.as("othermember").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: world.characters.marrowfen.id,
          traitValues: eyes(world, "amber"),
        },
      }),
    ).rejects.toThrow(/not yours/i);

    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: world.variantChangeItems.rareUpgradeIds[0] });
    expect(item.destroyedAt).toBeNull();
  });

  test("refuses an item id that names nothing", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: "00000000-0000-4000-8000-000000000000",
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "blue"),
        },
      }),
    ).rejects.toThrow(/does not exist/i);
  });

  test("refuses a character id that names nothing", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: "00000000-0000-4000-8000-000000000000",
          traitValues: eyes(world, "blue"),
        },
      }),
    ).rejects.toThrow(/does not exist/i);
  });

  test("refuses an item that does not change variants", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          // An edit kit. Consumable, held by this member, and the wrong shape.
          itemId: world.editKitItems.kitIds[0],
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "blue"),
        },
      }),
    ).rejects.toThrow(/does not change a character's variant/i);
  });

  test("cannot be used from the inventory like a payout ticket", async ({
    world,
  }) => {
    await expect(
      world.as("member").gql(SeedUseItemDocument, {
        input: { itemId: world.variantChangeItems.rareUpgradeIds[0] },
      }),
    ).rejects.toThrow(/redeemed on a character you own/i);

    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: world.variantChangeItems.rareUpgradeIds[0] });
    expect(item.destroyedAt).toBeNull();
  });

  test("refuses while the character has a change awaiting review", async ({
    world,
  }) => {
    // An edit kit's proposal holds values chosen for the variant the character
    // is about to leave. Approving it after a move would write values the new
    // variant may not permit.
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.pinefall.id,
        traitValues: eyes(world, "green"),
      },
    });

    const before = await held(world, world.itemTypes.rareUpgrade.id);

    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.rareUpgradeIds[0],
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "blue"),
        },
      }),
    ).rejects.toThrow(/awaiting review/i);

    expect(await held(world, world.itemTypes.rareUpgrade.id)).toBe(before);
  });

  test("refuses a character with no species", async ({ world }) => {
    // Reachable, and reached this way in practice: staff remove a character
    // from its species and the owner still holds it. Creating one speciesless
    // is staff-only, so the state is produced the way a member would meet it.
    await world.as("commadmin").gql(SeedKickCharacterFromSpeciesDocument, {
      id: world.characters.bramblefoot.id,
    });

    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId: world.variantChangeItems.ascensionIds[0],
          characterId: world.characters.bramblefoot.id,
          traitValues: [],
        },
      }),
    ).rejects.toThrow(/no species/i);
  });

  test("a second submission of the same item spends nothing", async ({
    world,
  }) => {
    const itemId = world.variantChangeItems.rareUpgradeIds[0];

    await world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
      input: {
        itemId,
        characterId: world.characters.pinefall.id,
        traitValues: eyes(world, "blue"),
      },
    });

    const after = await held(world, world.itemTypes.rareUpgrade.id);

    // The character is Rare now, so the second attempt is refused on that
    // before the item is even reached -- which is the point. Whichever check
    // fires, nothing more may be destroyed.
    await expect(
      world.as("member").gql(SeedChangeCharacterVariantWithItemDocument, {
        input: {
          itemId,
          characterId: world.characters.pinefall.id,
          traitValues: eyes(world, "blue"),
        },
      }),
    ).rejects.toThrow();

    expect(await held(world, world.itemTypes.rareUpgrade.id)).toBe(after);

    const { characterVariantChanges: history } = await world
      .as("member")
      .gql(SeedCharacterVariantChangesDocument, {
        characterId: world.characters.pinefall.id,
      });
    expect(history).toHaveLength(1);
  });
});

/**
 * Configuring what an item moves, which is staff work.
 *
 * Split from the redemption specs because the actor is different: everything
 * here needs `canManageItems`, and the member who redeems must be refused.
 */
test.describe("configuring a variant change grant", () => {
  test.use({ persona: "quartermaster" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  const consumableType = async (
    world: World<CommunityItemsWorld>,
    name: string,
    isConsumable = true,
  ) => {
    const { createItemType } = await world
      .as("quartermaster")
      .gql(SeedCreateItemTypeDocument, {
        input: {
          communityId: world.community.id,
          name,
          category: "Redeemable",
          isTradeable: true,
          isConsumable,
        },
      });
    return createItemType;
  };

  test("canManageItems may set a grant", async ({ world }) => {
    const type = await consumableType(world, "Uncommon Thornwing Upgrade");

    const { setItemTypeVariantChangeGrant: updated } = await world
      .as("quartermaster")
      .gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: type.id,
          toVariantId: world.variants.uncommon.id,
          fromVariantIds: [world.variants.common.id],
        },
      });

    expect(updated.useVariantChangeGrant?.toVariant.id).toBe(
      world.variants.uncommon.id,
    );
    expect(
      updated.useVariantChangeGrant?.fromVariants.map((v) => v.id),
    ).toEqual([world.variants.common.id]);
    // Derived from the destination rather than sent, so it cannot disagree
    // with it.
    expect(updated.useVariantChangeGrant?.species.id).toBe(world.species.id);
  });

  test("a plain member may not set a grant", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.potion.id,
          toVariantId: world.variants.rare.id,
          fromVariantIds: [],
        },
      }),
    ).rejects.toThrow();
  });

  test("a member of no community may not set a grant", async ({ world }) => {
    await expect(
      world.as("outsider").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.potion.id,
          toVariantId: world.variants.rare.id,
          fromVariantIds: [],
        },
      }),
    ).rejects.toThrow();
  });

  test("a null destination clears the grant", async ({ world }) => {
    const { setItemTypeVariantChangeGrant: cleared } = await world
      .as("quartermaster")
      .gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.rareUpgrade.id,
          toVariantId: null,
          fromVariantIds: [],
        },
      });

    expect(cleared.useVariantChangeGrant).toBeNull();
  });

  test("refuses a non-consumable item type", async ({ world }) => {
    const type = await consumableType(world, "Everlasting Sigil", false);

    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: type.id,
          toVariantId: world.variants.rare.id,
          fromVariantIds: [],
        },
      }),
    ).rejects.toThrow(/not consumable/i);
  });

  test("refuses a second effect on a type that already pays out", async ({
    world,
  }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.ticket.id,
          toVariantId: world.variants.rare.id,
          fromVariantIds: [],
        },
      }),
    ).rejects.toThrow(/already has a payout/i);
  });

  test("refuses a payout on a type that already changes variants", async ({
    world,
  }) => {
    // The exclusivity has to hold from whichever side is configured second.
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeUsePayoutDocument, {
        input: {
          itemTypeId: world.itemTypes.rareUpgrade.id,
          components: [{ currencyId: world.currencies.coin.id, amount: 10 }],
        },
      }),
    ).rejects.toThrow(/already has a variant change grant/i);
  });

  test("refuses an MYO grant on a type that already changes variants", async ({
    world,
  }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeMyoGrantDocument, {
        input: {
          itemTypeId: world.itemTypes.rareUpgrade.id,
          speciesId: world.species.id,
          speciesVariantIds: [world.variants.common.id],
        },
      }),
    ).rejects.toThrow(/already has a variant change grant/i);
  });

  test("refuses the destination appearing in its own source list", async ({
    world,
  }) => {
    const type = await consumableType(world, "Pointless Upgrade");

    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: type.id,
          toVariantId: world.variants.rare.id,
          fromVariantIds: [world.variants.common.id, world.variants.rare.id],
        },
      }),
    ).rejects.toThrow(/already/i);
  });

  test("refuses the same source variant twice", async ({ world }) => {
    const type = await consumableType(world, "Stuttering Upgrade");

    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: type.id,
          toVariantId: world.variants.rare.id,
          fromVariantIds: [world.variants.common.id, world.variants.common.id],
        },
      }),
    ).rejects.toThrow(/same variant twice/i);
  });

  test("refuses a source variant from another species", async ({ world }) => {
    const { createSpecies: other } = await world
      .as("commadmin")
      .gql(SeedCreateSpeciesDocument, {
        createSpeciesInput: { name: "Lintling", communityId: world.community.id },
      });
    const { createSpeciesVariant: otherVariant } = await world
      .as("commadmin")
      .gql(SeedCreateSpeciesVariantDocument, {
        createSpeciesVariantInput: { name: "Lintling Common", speciesId: other.id },
      });

    const type = await consumableType(world, "Crossbred Upgrade");

    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: type.id,
          toVariantId: world.variants.rare.id,
          fromVariantIds: [otherVariant.id],
        },
      }),
    ).rejects.toThrow(/not a /i);
  });

  test("refuses a destination from another community", async ({ world }) => {
    const { createCommunity: elsewhere } = await world
      .as("commadmin")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: "Distant Marsh" },
      });
    const { createSpecies: theirSpecies } = await world
      .as("commadmin")
      .gql(SeedCreateSpeciesDocument, {
        createSpeciesInput: { name: "Marshling", communityId: elsewhere.id },
      });
    const { createSpeciesVariant: theirVariant } = await world
      .as("commadmin")
      .gql(SeedCreateSpeciesVariantDocument, {
        createSpeciesVariantInput: { name: "Marshling Rare", speciesId: theirSpecies.id },
      });

    const type = await consumableType(world, "Trespassing Upgrade");

    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: type.id,
          toVariantId: theirVariant.id,
          fromVariantIds: [],
        },
      }),
    ).rejects.toThrow(/another community/i);
  });

  test("refuses a destination that names nothing", async ({ world }) => {
    const type = await consumableType(world, "Nowhere Upgrade");

    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeVariantChangeGrantDocument, {
        input: {
          itemTypeId: type.id,
          toVariantId: "00000000-0000-4000-8000-000000000000",
          fromVariantIds: [],
        },
      }),
    ).rejects.toThrow(/another community/i);
  });
});
