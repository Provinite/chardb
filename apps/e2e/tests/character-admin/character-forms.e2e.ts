import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import {
  SeedCreateCharacterDocument,
  SeedCharacterDocument,
  SeedUpdateCharacterRegistryDocument,
  SeedUpdateSpeciesVariantDocument,
  SeedEditCharacterTraitsWithKitDocument,
  SeedApproveTraitReviewDocument,
  SeedTraitReviewQueueDocument,
  SeedRevertTraitReviewDocument,
  SeedEditAndApproveTraitReviewDocument,
  SeedUpdateRoleDocument,
} from "../../src/generated/graphql.js";
import { oneForm } from "../../src/world/forms.js";

const test = presetTest("community-items");

/**
 * A character presenting as more than one creature.
 *
 * The feature is off everywhere until a community turns it on for a rarity, so
 * almost every test here starts by raising `maxForms` on a variant. That is
 * the point rather than setup noise: a variant nobody has configured must keep
 * behaving exactly as it did, and the first test is the one that proves it.
 */
test.describe("character forms", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  const eyes = (world: World<CommunityItemsWorld>, colour: string) => [
    {
      traitId: world.traits.eyeColor.id,
      value: world.traits.eyeColor.values[colour],
    },
  ];

  /** Turn forms on for a variant, which every variant starts with off. */
  const allowForms = async (
    world: World<CommunityItemsWorld>,
    variantId: string,
    maxForms: number,
  ) => {
    await world.as("commadmin").gql(SeedUpdateSpeciesVariantDocument, {
      id: variantId,
      updateSpeciesVariantInput: { maxForms },
    });
  };

  test("a variant allows one form until a community says otherwise", async ({
    world,
  }) => {
    await expect(
      world.as("member").gql(SeedCreateCharacterDocument, {
        input: {
          name: "Presumptuous",
          speciesId: world.species.id,
          speciesVariantId: world.variants.common.id,
          forms: [
            { name: "Base", traitValues: eyes(world, "blue") },
            { name: "Awakened", traitValues: eyes(world, "green") },
          ],
        },
      }),
    ).rejects.toThrow(/does not allow more than one form/i);
  });

  test("raising the limit lets a character carry two, each with its own traits", async ({
    world,
  }) => {
    await allowForms(world, world.variants.common.id, 2);

    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name: "Twofold",
          speciesId: world.species.id,
          speciesVariantId: world.variants.common.id,
          forms: [
            { name: "Base", traitValues: eyes(world, "blue") },
            { name: "Awakened", traitValues: eyes(world, "green") },
          ],
        },
      });

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: createCharacter.id });

    expect(character.forms.map((f) => f.name)).toEqual(["Base", "Awakened"]);
    expect(character.forms.map((f) => f.sortOrder)).toEqual([0, 1]);
    expect(character.forms[0].traitValues[0].value).toBe(
      world.traits.eyeColor.values.blue,
    );
    expect(character.forms[1].traitValues[0].value).toBe(
      world.traits.eyeColor.values.green,
    );
  });

  test("a character created without forms still gets one", async ({
    world,
  }) => {
    // Every character has at least one, including the ones nobody asked to
    // have any. A formless character would render as though its traits had
    // been erased.
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: { name: "Plain", speciesId: world.species.id },
      });

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: createCharacter.id });
    expect(character.forms).toHaveLength(1);
    expect(character.forms[0].traitValues).toEqual([]);
  });

  test("removing every form is refused", async ({ world }) => {
    await expect(
      world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
        id: world.characters.pinefall.id,
        input: { forms: [] },
      }),
    ).rejects.toThrow(/at least one form/i);
  });

  test("a form belonging to another character is refused", async ({
    world,
  }) => {
    await allowForms(world, world.variants.common.id, 2);

    const { character: other } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.bramblefoot.id });

    await expect(
      world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
        id: world.characters.pinefall.id,
        input: {
          forms: [
            // Pinefall's own form, plus one of Bramblefoot's. Without the
            // check this creates Bramblefoot's form under Pinefall.
            { name: "Base", traitValues: eyes(world, "blue") },
            {
              id: other.forms[0].id,
              name: "Stolen",
              traitValues: [],
            },
          ],
        },
      }),
    ).rejects.toThrow(/does not belong to this character/i);
  });

  test("editing keeps a form's id rather than replacing it", async ({
    world,
  }) => {
    // Ids matter: a review snapshot names them, and a form that changed id on
    // every save would make a trait history unreadable.
    const before = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    const formId = before.character.forms[0].id;

    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id: world.characters.pinefall.id,
      input: {
        forms: [
          { id: formId, name: "Renamed", traitValues: eyes(world, "blue") },
        ],
      },
    });

    const after = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(after.character.forms[0].id).toBe(formId);
    expect(after.character.forms[0].name).toBe("Renamed");
  });

  test("a member proposes a second form with an edit kit, and approval creates it", async ({
    world,
  }) => {
    await allowForms(world, world.variants.common.id, 2);

    const before = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(before.character.forms).toHaveLength(1);

    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.pinefall.id,
        forms: [
          {
            id: before.character.forms[0].id,
            name: "Base",
            traitValues: eyes(world, "blue"),
          },
          { name: "Awakened", traitValues: eyes(world, "green") },
        ],
      },
    });

    // Nothing is applied until staff approve: the new form does not exist yet.
    const pending = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(pending.character.forms).toHaveLength(1);

    const { traitReviewQueue } = await world
      .as("commadmin")
      .gql(SeedTraitReviewQueueDocument, {
        communityId: world.community.id,
      });
    const entry = traitReviewQueue.items.find(
      (i) => i.review.characterId === world.characters.pinefall.id,
    );
    expect(entry).toBeDefined();
    expect(entry!.review.proposedForms.map((f) => f.name)).toEqual([
      "Base",
      "Awakened",
    ]);

    await world.as("commadmin").gql(SeedApproveTraitReviewDocument, {
      input: { reviewId: entry!.review.id },
    });

    const after = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(after.character.forms.map((f) => f.name)).toEqual([
      "Base",
      "Awakened",
    ]);
    expect(after.character.forms[1].traitValues[0].value).toBe(
      world.traits.eyeColor.values.green,
    );
  });

  test("the character page shows a tab per form", async ({ page, world }) => {
    await allowForms(world, world.variants.common.id, 2);

    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id: world.characters.pinefall.id,
      input: {
        forms: [
          { name: "Base", traitValues: eyes(world, "blue") },
          { name: "Awakened", traitValues: eyes(world, "green") },
        ],
      },
    });

    await page.goto(world.characters.pinefall.url);

    const tabs = page.getByTestId("character-forms").getByRole("tab");
    await expect(tabs).toHaveText(["Base", "Awakened"]);

    // Landing shows the primary form; the tabs swap which set is on screen.
    await expect(page.getByTestId("trait-name")).toHaveCount(1);
    await expect(page.getByText("Blue", { exact: true })).toBeVisible();
    await tabs.nth(1).click();
    await expect(page.getByText("Green", { exact: true })).toBeVisible();
  });

  test("a one-form character gets no tabs at all", async ({ page, world }) => {
    // The ordinary case has to keep reading exactly as it did, or every
    // community that never uses forms pays for the ones that do.
    await page.goto(world.characters.pinefall.url);
    await expect(page.getByTestId("trait-name")).toHaveCount(1);
    await expect(page.getByTestId("character-forms")).toHaveCount(0);
  });

  test("moving to a rarity that allows fewer forms is refused", async ({
    world,
  }) => {
    await allowForms(world, world.variants.common.id, 2);
    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id: world.characters.pinefall.id,
      input: {
        forms: [
          { name: "Base", traitValues: eyes(world, "blue") },
          { name: "Awakened", traitValues: eyes(world, "blue") },
        ],
      },
    });

    // Rare is still at one. A form has to be dropped deliberately rather than
    // silently, so the move is refused until the submission says which stays.
    await expect(
      world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
        id: world.characters.pinefall.id,
        input: {
          speciesVariantId: world.variants.rare.id,
          forms: [
            { name: "Base", traitValues: eyes(world, "blue") },
            { name: "Awakened", traitValues: eyes(world, "blue") },
          ],
        },
      }),
    ).rejects.toThrow(/does not allow more than one form/i);

    await expect(
      world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
        id: world.characters.pinefall.id,
        input: {
          speciesVariantId: world.variants.rare.id,
          forms: oneForm(eyes(world, "blue")),
        },
      }),
    ).resolves.toBeTruthy();
  });

  /**
   * Who may add a form.
   *
   * Traits used to be listed in `REGISTRY_FIELDS`, which is what
   * `validateFieldPermissions` matches a Prisma payload against. Forms are
   * rows rather than a column, so they are not in that set and cannot be --
   * which leaves the mutation's own guard as the only thing standing between a
   * member and a second design. These are the tests that say so out loud.
   *
   * The refusals read "Forbidden resource" rather than anything about forms:
   * `CharacterRegistryEditGuard` returns false and Nest turns that into a
   * `ForbiddenException`, which is the same answer every other registry field
   * gets. Matching on it rather than on `toThrow()` alone keeps these from
   * passing on an unrelated error.
   */
  test.describe("permissions", () => {
    test("a member without registry rights cannot add a form", async ({
      world,
    }) => {
      await allowForms(world, world.variants.common.id, 2);

      // The stock Member role carries neither registry permission, which is
      // why edit kits exist at all.
      await expect(
        world.as("member").gql(SeedUpdateCharacterRegistryDocument, {
          id: world.characters.pinefall.id,
          input: {
            forms: [
              { name: "Base", traitValues: eyes(world, "blue") },
              { name: "Awakened", traitValues: eyes(world, "green") },
            ],
          },
        }),
      ).rejects.toThrow(/forbidden/i);

      const { character } = await world
        .as("member")
        .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
      expect(character.forms).toHaveLength(1);
    });

    test("an owner holding their own registry rights can add one", async ({
      world,
    }) => {
      // The other half. Refusing the member above must not also refuse the
      // permission that exists precisely to let owners edit their own design.
      await allowForms(world, world.variants.common.id, 2);
      await world.as("commadmin").gql(SeedUpdateRoleDocument, {
        id: world.roles.member,
        updateRoleInput: { canEditOwnCharacterRegistry: true },
      });

      await expect(
        world.as("member").gql(SeedUpdateCharacterRegistryDocument, {
          id: world.characters.pinefall.id,
          input: {
            forms: [
              { name: "Base", traitValues: eyes(world, "blue") },
              { name: "Awakened", traitValues: eyes(world, "green") },
            ],
          },
        }),
      ).resolves.toBeTruthy();
    });

    test("own-registry rights do not reach somebody else's character", async ({
      world,
    }) => {
      await allowForms(world, world.variants.common.id, 2);
      await world.as("commadmin").gql(SeedUpdateRoleDocument, {
        id: world.roles.member,
        updateRoleInput: { canEditOwnCharacterRegistry: true },
      });

      // Marrowfen is othermember's. "Own" has to mean own.
      await expect(
        world.as("member").gql(SeedUpdateCharacterRegistryDocument, {
          id: world.characters.marrowfen.id,
          input: { forms: oneForm([]) },
        }),
      ).rejects.toThrow(/forbidden/i);
    });

    test("an ordinary member cannot raise a variant's form limit", async ({
      world,
    }) => {
      // The limit decides whether a character can carry a second design, so it
      // is staff's the same way the rest of the variant is.
      await expect(
        world.as("member").gql(SeedUpdateSpeciesVariantDocument, {
          id: world.variants.common.id,
          updateSpeciesVariantInput: { maxForms: 2 },
        }),
      ).rejects.toThrow(/forbidden/i);
    });
  });

  test("a moderator's correction is validated like any other write", async ({
    world,
  }) => {
    // `editAndApproveTraitReview` is the only path that hands caller-supplied
    // forms to the writer, and being staff's is not a reason to skip the
    // checks -- a correction that exceeded the rarity's limit would leave the
    // character in a state every other path refuses and its own editor cannot
    // render.
    const before = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });

    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.pinefall.id,
        forms: oneForm(eyes(world, "green")),
      },
    });

    const { traitReviewQueue } = await world
      .as("commadmin")
      .gql(SeedTraitReviewQueueDocument, { communityId: world.community.id });
    const entry = traitReviewQueue.items.find(
      (i) => i.review.characterId === world.characters.pinefall.id,
    );
    expect(entry).toBeDefined();

    // Common is still at one form.
    await expect(
      world.as("commadmin").gql(SeedEditAndApproveTraitReviewDocument, {
        input: {
          reviewId: entry!.review.id,
          correctedForms: [
            { name: "Base", traitValues: eyes(world, "blue") },
            { name: "Smuggled", traitValues: eyes(world, "green") },
          ],
        },
      }),
    ).rejects.toThrow(/does not allow more than one form/i);

    const after = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(after.character.forms).toHaveLength(1);
    expect(after.character.forms[0].id).toBe(before.character.forms[0].id);
  });

  test("a moderator's correction still applies when it is valid", async ({
    world,
  }) => {
    // The other half: validating must not have broken the thing it guards.
    const before = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });

    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.pinefall.id,
        forms: oneForm(eyes(world, "green")),
      },
    });

    const { traitReviewQueue } = await world
      .as("commadmin")
      .gql(SeedTraitReviewQueueDocument, { communityId: world.community.id });
    const entry = traitReviewQueue.items.find(
      (i) => i.review.characterId === world.characters.pinefall.id,
    );

    await world.as("commadmin").gql(SeedEditAndApproveTraitReviewDocument, {
      input: {
        reviewId: entry!.review.id,
        correctedForms: [
          {
            id: before.character.forms[0].id,
            name: "Base",
            traitValues: eyes(world, "amber"),
          },
        ],
      },
    });

    const after = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(after.character.forms[0].traitValues[0].value).toBe(
      world.traits.eyeColor.values.amber,
    );
  });

  test("refusing a proposed form leaves the character alone and returns the kit", async ({
    world,
  }) => {
    await allowForms(world, world.variants.common.id, 2);
    const before = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });

    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.pinefall.id,
        forms: [
          {
            id: before.character.forms[0].id,
            name: "Base",
            traitValues: eyes(world, "blue"),
          },
          { name: "Awakened", traitValues: eyes(world, "green") },
        ],
      },
    });

    const { traitReviewQueue } = await world
      .as("commadmin")
      .gql(SeedTraitReviewQueueDocument, { communityId: world.community.id });
    const entry = traitReviewQueue.items.find(
      (i) => i.review.characterId === world.characters.pinefall.id,
    );
    expect(entry).toBeDefined();

    await world.as("commadmin").gql(SeedRevertTraitReviewDocument, {
      input: { reviewId: entry!.review.id, reason: "Not this one" },
    });

    // The proposed form never existed, so there is nothing to revert -- and
    // the character must not lose the form it already had.
    const after = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(after.character.forms).toHaveLength(1);
    expect(after.character.forms[0].id).toBe(before.character.forms[0].id);
  });

  /*
   * `assignCharacterSpecies` keeping a character's existing form is covered in
   * characters.service.spec.ts rather than here, because the mutation is not
   * reachable end to end: the only way to get a speciesless character is to
   * kick one out of its species, and `AllowCharacterProfileEditor` then has no
   * community to resolve permissions from. A global admin passes that guard
   * but is refused by the service's own `CanCreateCharacter` community check.
   * That gap predates forms and is not this branch's to close.
   */

  test("lowering a variant's limit leaves existing characters alone", async ({
    world,
  }) => {
    await allowForms(world, world.variants.common.id, 2);
    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id: world.characters.pinefall.id,
      input: {
        forms: [
          { name: "Base", traitValues: eyes(world, "blue") },
          { name: "Awakened", traitValues: eyes(world, "blue") },
        ],
      },
    });

    await allowForms(world, world.variants.common.id, 1);

    // Staff changing a number must not destroy a design nobody reviewed the
    // removal of. The limit applies at the next write, not retroactively.
    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(character.forms).toHaveLength(2);
  });
});
