import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import type { World } from "../../src/world/types.js";
import type { CommunityBasicWorld } from "../../src/world/presets/community-basic.js";
import {
  SeedCreateTraitDocument,
  SeedCreateTraitListEntryDocument,
  SeedUpdateTraitOrdersDocument,
  SeedCreateCharacterDocument,
  TraitValueType,
} from "../../src/generated/graphql.js";

/**
 * Trait display order, on both surfaces that show it.
 *
 * A character's trait values are stored as a JSON array in the order they were
 * last written. The order staff care about lives on the variant, as
 * `TraitListEntry.order`. Before this was fixed, both displays rendered the
 * stored order, so reordering a variant's traits changed nothing for the
 * characters already using it.
 *
 * Every fixture below stores values in a *different* order from the variant,
 * so a test can never pass by rendering the stored order and getting lucky.
 */

const test = presetTest("community-basic");
test.use({ persona: "moderator" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

/**
 * Retrying, deliberately. Traits render in their stored order and re-sort when
 * the variant's ordering arrives, so a one-shot read can catch the pre-sort
 * frame -- which is a real thing a user briefly sees, not a bug, but it makes
 * `allTextContents()` flaky.
 */
const expectTraitOrder = (page: Page, names: string[]) =>
  expect(page.getByTestId("trait-name")).toHaveText(names);

/**
 * Three traits on the seeded variant, in a known order, and a character whose
 * stored values are in the reverse of it.
 *
 * `community-basic` seeds one trait and no trait list entries at all, and
 * `traitsBySpecies` only returns traits that have an entry for the variant --
 * so without these there is no ordering for anything to follow.
 */
async function seedOrderedTraits(world: World<CommunityBasicWorld>) {
  const staff = world.as("commadmin");
  const ids: Record<string, string> = {};

  for (const [order, name] of ["Horns", "Eyes", "Tail"].entries()) {
    const { createTrait } = await staff.gql(SeedCreateTraitDocument, {
      createTraitInput: {
        speciesId: world.species.id,
        name,
        valueType: TraitValueType.String,
        allowsClarifier: false,
        allowsMultipleValues: false,
      },
    });
    ids[name] = createTrait.id;

    await staff.gql(SeedCreateTraitListEntryDocument, {
      input: {
        traitId: createTrait.id,
        speciesVariantId: world.species.variantId,
        order,
        required: false,
        valueType: TraitValueType.String,
      },
    });
  }

  return ids;
}

test("a character shows its traits in the variant's order, not the stored order", async ({
  page,
  world,
}) => {
  const ids = await seedOrderedTraits(world);

  // Stored backwards on purpose: Tail, Eyes, Horns.
  const { createCharacter } = await world
    .as("member")
    .gql(SeedCreateCharacterDocument, {
      input: {
        name: "Orderling",
        speciesId: world.species.id,
        speciesVariantId: world.species.variantId,
        traitValues: [
          { traitId: ids.Tail, value: "Bobbed" },
          { traitId: ids.Eyes, value: "Gold" },
          { traitId: ids.Horns, value: "Short" },
        ],
      },
    });

  await page.goto(`${world.community.url}/character/${createCharacter.id}`);

  await expectTraitOrder(page, ["Horns", "Eyes", "Tail"]);
});

test("reordering the variant reorders characters already using it", async ({
  page,
  world,
}) => {
  // The reported bug: staff reorder the trait list, and every existing
  // character keeps showing the old order.
  const ids = await seedOrderedTraits(world);

  const { createCharacter } = await world
    .as("member")
    .gql(SeedCreateCharacterDocument, {
      input: {
        name: "Orderling",
        speciesId: world.species.id,
        speciesVariantId: world.species.variantId,
        traitValues: [
          { traitId: ids.Tail, value: "Bobbed" },
          { traitId: ids.Eyes, value: "Gold" },
          { traitId: ids.Horns, value: "Short" },
        ],
      },
    });

  await page.goto(`${world.community.url}/character/${createCharacter.id}`);
  await expectTraitOrder(page, ["Horns", "Eyes", "Tail"]);

  await world.as("commadmin").gql(SeedUpdateTraitOrdersDocument, {
    input: {
      variantId: world.species.variantId,
      traitOrders: [
        { traitId: ids.Tail, order: 0 },
        { traitId: ids.Horns, order: 1 },
        { traitId: ids.Eyes, order: 2 },
      ],
    },
  });

  // Nothing about the character changed -- only the variant did.
  await page.goto(`${world.community.url}/character/${createCharacter.id}`);
  await expectTraitOrder(page, ["Tail", "Horns", "Eyes"]);
});

test("the trait review queue reads in the variant's order too", async ({
  page,
  world,
}) => {
  // The queue is masterlist review, and it renders its own stored snapshots
  // rather than the character's trait values -- so it needed fixing
  // separately.
  const ids = await seedOrderedTraits(world);

  const { createCharacter } = await world
    .as("member")
    .gql(SeedCreateCharacterDocument, {
      input: {
        name: "Orderling",
        speciesId: world.species.id,
        speciesVariantId: world.species.variantId,
        traitValues: [
          { traitId: ids.Eyes, value: "Gold" },
          { traitId: ids.Horns, value: "Short" },
          { traitId: ids.Tail, value: "Bobbed" },
        ],
      },
    });

  await page.goto(`${world.community.url}/moderation/traits`);

  const card = page.locator(
    `[data-testid="trait-review-card"][data-character-id="${createCharacter.id}"]`,
  );
  await expect(card).toBeVisible();
  await expect(card.getByTestId("trait-name")).toHaveText([
    "Horns",
    "Eyes",
    "Tail",
  ]);
});
