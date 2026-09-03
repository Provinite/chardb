import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import {
  SeedCreateCharacterDocument,
  SeedUpdateCharacterRegistryDocument,
  SeedCharacterVariantChangesDocument,
  SeedCharacterDocument,
  SeedUpdateRoleDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * Changing a character's rarity.
 *
 * Two rules meet here, and they are separate on purpose.
 *
 * **Who.** Every other registry field is editable by an owner holding
 * `canEditOwnCharacterRegistry` -- their own registry id, their own traits.
 * Rarity is not, because rarity is what upgrade tickets sell, and leaving it
 * self-service gives the product away. The mutation's guard cannot make that
 * distinction: it asks whether the caller may edit registry fields at all, and
 * an owner passes. So the check is on the field.
 *
 * **What it does to traits.** A variant is an allow-list of enum options.
 * `legendary` permits Amber alone where the other three take every colour, so
 * moving a blue-eyed character there strands a value that has to be re-routed
 * before the change can be saved.
 */
test.describe("changing a character's variant", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  /** One of `member`'s characters, on a given variant, with given traits. */
  const character = async (
    world: World<CommunityItemsWorld>,
    name: string,
    speciesVariantId?: string,
    value?: string,
  ) => {
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name,
          speciesId: world.species.id,
          speciesVariantId,
          traitValues: value
            ? [{ traitId: world.traits.eyeColor.id, value }]
            : undefined,
        },
      });
    return createCharacter.id;
  };

  test("staff can move a character between variants", async ({ world }) => {
    const id = await character(world, "Upgradable", world.variants.common.id);

    const { updateCharacterRegistry } = await world
      .as("commadmin")
      .gql(SeedUpdateCharacterRegistryDocument, {
        id,
        input: { speciesVariantId: world.variants.rare.id },
      });

    expect(updateCharacterRegistry.speciesVariantId).toBe(
      world.variants.rare.id,
    );
  });

  test("the owner cannot, even holding their own registry rights", async ({
    world,
  }) => {
    // The hole this closes. Grant the Member role own-registry rights -- which
    // is what lets a member edit their own traits at all -- and the guard on
    // the mutation then passes them. Only the field-level check refuses.
    await world.as("commadmin").gql(SeedUpdateRoleDocument, {
      id: world.roles.member,
      updateRoleInput: { canEditOwnCharacterRegistry: true },
    });

    const id = await character(
      world,
      "Self-upgrader",
      world.variants.common.id,
    );

    await expect(
      world.as("member").gql(SeedUpdateCharacterRegistryDocument, {
        id,
        input: { speciesVariantId: world.variants.rare.id },
      }),
    ).rejects.toThrow(/staff action/i);
  });

  test("the owner can still edit their own traits", async ({ world }) => {
    // The other half of that. Refusing the variant must not refuse the fields
    // own-registry rights are actually for.
    await world.as("commadmin").gql(SeedUpdateRoleDocument, {
      id: world.roles.member,
      updateRoleInput: { canEditOwnCharacterRegistry: true },
    });

    const id = await character(world, "Trait editor", world.variants.common.id);

    await expect(
      world.as("member").gql(SeedUpdateCharacterRegistryDocument, {
        id,
        input: {
          traitValues: [
            {
              traitId: world.traits.eyeColor.id,
              value: world.traits.eyeColor.values.blue,
            },
          ],
        },
      }),
    ).resolves.toBeTruthy();
  });

  test("re-sending the same variant is not a change", async ({ world }) => {
    // A form that posts every registry field sends the current variant back on
    // every save. That must not need staff rights or write a history row.
    await world.as("commadmin").gql(SeedUpdateRoleDocument, {
      id: world.roles.member,
      updateRoleInput: { canEditOwnCharacterRegistry: true },
    });

    const id = await character(world, "Unchanged", world.variants.common.id);

    await expect(
      world.as("member").gql(SeedUpdateCharacterRegistryDocument, {
        id,
        input: { speciesVariantId: world.variants.common.id },
      }),
    ).resolves.toBeTruthy();

    const { characterVariantChanges } = await world
      .as("member")
      .gql(SeedCharacterVariantChangesDocument, { characterId: id });
    expect(characterVariantChanges).toHaveLength(0);
  });
});

/**
 * What a rarity change records.
 */
test.describe("the rarity history", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("records who, what, and why", async ({ world }) => {
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name: "Promoted",
          speciesId: world.species.id,
          speciesVariantId: world.variants.common.id,
        },
      });

    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id: createCharacter.id,
      input: {
        speciesVariantId: world.variants.rare.id,
        variantChangeReason: "upgrade ticket #204",
      },
    });

    const { characterVariantChanges } = await world
      .as("member")
      .gql(SeedCharacterVariantChangesDocument, {
        characterId: createCharacter.id,
      });

    expect(characterVariantChanges).toHaveLength(1);
    const [row] = characterVariantChanges;
    expect(row.fromVariant?.name).toBe(world.variants.common.name);
    expect(row.toVariant?.name).toBe(world.variants.rare.name);
    expect(row.changedBy?.username).toBe(world.users.commadmin.username);
    expect(row.reason).toBe("upgrade ticket #204");
  });

  test("is readable without logging in", async ({ world }) => {
    // Rarity is what a masterlist publishes. "Why is this a Rare" is a
    // question anyone can reasonably ask.
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name: "Public record",
          speciesId: world.species.id,
          speciesVariantId: world.variants.common.id,
        },
      });

    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id: createCharacter.id,
      input: { speciesVariantId: world.variants.rare.id },
    });

    const { characterVariantChanges } = await world
      .as("outsider")
      .gql(SeedCharacterVariantChangesDocument, {
        characterId: createCharacter.id,
      });
    expect(characterVariantChanges).toHaveLength(1);
  });
});

/**
 * Trait values a target variant does not permit.
 */
test.describe("traits that do not exist at the new rarity", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  const withBlueEyes = async (
    world: World<CommunityItemsWorld>,
    name: string,
    variantId: string,
  ) => {
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name,
          speciesId: world.species.id,
          speciesVariantId: variantId,
          traitValues: [
            {
              traitId: world.traits.eyeColor.id,
              value: world.traits.eyeColor.values.blue,
            },
          ],
        },
      });
    return createCharacter.id;
  };

  test("a stranded value is refused, and named", async ({ world }) => {
    const id = await withBlueEyes(world, "Blue", world.variants.common.id);

    // Legendary permits Amber only. Moving a blue-eyed character there would
    // leave it holding a value its own trait editor cannot offer.
    const message = await world
      .as("commadmin")
      .gql(SeedUpdateCharacterRegistryDocument, {
        id,
        input: {
          speciesVariantId: world.variants.legendary.id,
          traitValues: [
            {
              traitId: world.traits.eyeColor.id,
              value: world.traits.eyeColor.values.blue,
            },
          ],
        },
      })
      .then(
        () => null,
        (err: Error) => err.message,
      );

    expect(message).toMatch(/not available to Legendary/i);
  });

  test("re-routing it to a permitted value succeeds", async ({ world }) => {
    const id = await withBlueEyes(world, "Rerouted", world.variants.common.id);

    await expect(
      world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
        id,
        input: {
          speciesVariantId: world.variants.legendary.id,
          traitValues: [
            {
              traitId: world.traits.eyeColor.id,
              value: world.traits.eyeColor.values.amber,
            },
          ],
        },
      }),
    ).resolves.toBeTruthy();

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id });
    expect(character.traitValues[0].value).toBe(
      world.traits.eyeColor.values.amber,
    );
  });

  test("the history keeps both sides of the re-route", async ({ world }) => {
    const id = await withBlueEyes(
      world,
      "Both sides",
      world.variants.common.id,
    );

    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id,
      input: {
        speciesVariantId: world.variants.legendary.id,
        traitValues: [
          {
            traitId: world.traits.eyeColor.id,
            value: world.traits.eyeColor.values.amber,
          },
        ],
      },
    });

    // The trait edit that a rarity change forces is part of the same act.
    // Recording only the variant would leave the half a dispute asks about
    // invisible.
    const { characterVariantChanges } = await world
      .as("member")
      .gql(SeedCharacterVariantChangesDocument, { characterId: id });
    const [row] = characterVariantChanges;
    expect(row.previousTraitValues[0].value).toBe(
      world.traits.eyeColor.values.blue,
    );
    expect(row.newTraitValues[0].value).toBe(
      world.traits.eyeColor.values.amber,
    );
  });

  test("a variant of another species is still refused", async ({ world }) => {
    // Unchanged by any of this, and worth keeping pinned beside it.
    const id = await withBlueEyes(
      world,
      "Cross species",
      world.variants.common.id,
    );

    await expect(
      world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
        id,
        input: { speciesVariantId: world.currencies.coin.id },
      }),
    ).rejects.toThrow();
  });
});

/**
 * The same thing through the screen staff actually use.
 *
 * The blocks above prove the rules and press no buttons. These cover what was
 * built on top: that the variant is editable at all (it was read-only, which
 * is the whole of #232), that a stranded value blocks the save rather than
 * being discovered by the server, and that re-routing it unblocks.
 */
test.describe("changing rarity, through the page", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  const blueEyed = async (world: World<CommunityItemsWorld>, name: string) => {
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name,
          speciesId: world.species.id,
          speciesVariantId: world.variants.common.id,
          traitValues: [
            {
              traitId: world.traits.eyeColor.id,
              value: world.traits.eyeColor.values.blue,
            },
          ],
        },
      });
    return createCharacter.id;
  };

  test("the variant is editable", async ({ page, world }) => {
    // The bug this closes: the edit page showed the variant read-only, under
    // "Species assignment is permanent", which is true of the species and was
    // never true of its rarity.
    const id = await blueEyed(world, "Editable");
    await page.goto(`/character/${id}/edit`);

    await expect(page.getByTestId("variant-select")).toBeEnabled();
  });

  test("a stranded value blocks the save until it is re-routed", async ({
    page,
    world,
  }) => {
    const id = await blueEyed(world, "Stranded");
    await page.goto(`/character/${id}/edit`);

    await page
      .getByTestId("variant-select")
      .selectOption(world.variants.legendary.id);

    // Legendary permits Amber only, and this character has Blue eyes.
    await expect(page.getByTestId("variant-reroute")).toBeVisible();
    await expect(page.getByTestId("save-species-details")).toBeDisabled();

    await page
      .getByTestId(`reroute-${world.traits.eyeColor.id}`)
      .selectOption(world.traits.eyeColor.values.amber);

    await expect(page.getByTestId("save-species-details")).toBeEnabled();
  });

  test("saving the re-route writes both the rarity and the trait", async ({
    page,
    world,
  }) => {
    const id = await blueEyed(world, "Saved");
    await page.goto(`/character/${id}/edit`);

    await page
      .getByTestId("variant-select")
      .selectOption(world.variants.legendary.id);
    await page
      .getByTestId(`reroute-${world.traits.eyeColor.id}`)
      .selectOption(world.traits.eyeColor.values.amber);
    await page.getByTestId("variant-change-reason").fill("upgrade ticket #204");
    await page.getByTestId("save-species-details").click();

    // Wait for the app's own "it saved" signal, not the dropdown's value.
    // The select already reads Legendary before the mutation is even sent --
    // it is local state -- so asserting on it passes instantly and lets the
    // API read below race the write it is meant to be checking.
    await expect(page.getByText("Species details updated!")).toBeVisible();

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id });
    expect(character.speciesVariantId).toBe(world.variants.legendary.id);
    expect(character.traitValues[0].value).toBe(
      world.traits.eyeColor.values.amber,
    );
  });

  test("the character page shows the rarity history afterwards", async ({
    page,
    world,
  }) => {
    const id = await blueEyed(world, "Historied");

    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id,
      input: {
        speciesVariantId: world.variants.rare.id,
        variantChangeReason: "grandfathered from the old masterlist",
      },
    });

    await page.goto(`/character/${id}`);
    const history = page.getByTestId("variant-history");
    await expect(history).toContainText(world.variants.common.name);
    await expect(history).toContainText(world.variants.rare.name);
    await expect(history).toContainText("grandfathered");
  });

  test("a character with no rarity changes shows no history", async ({
    page,
    world,
  }) => {
    // A section reading "no rarity changes" on every character page would be
    // noise standing in for information.
    await page.goto(`/character/${world.characters.bramblefoot.id}`);
    await expect(page.getByTestId("variant-history")).toHaveCount(0);
  });
});
