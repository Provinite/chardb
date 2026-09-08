import { presetTest, expect, acceptNextDialog } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import type { Browser, Page } from "@playwright/test";
import {
  SeedUpdateSpeciesVariantDocument,
  SeedUpdateCharacterRegistryDocument,
  SeedItemDocument,
  SeedMemberHoldingsDocument,
  SeedCharacterDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * The forms feature as a person meets it.
 *
 * The API side is pinned in `character-forms.e2e.ts`; this is the half only a
 * browser can answer -- whether the editor lets somebody build a second form
 * at all, whether the switcher swaps what is on screen, and whether the
 * refusals that cannot be undone are visible before the button is pressed
 * rather than after it.
 */

const eyes = (world: World<CommunityItemsWorld>, colour: string) => [
  {
    traitId: world.traits.eyeColor.id,
    value: world.traits.eyeColor.values[colour],
  },
];

/** Turn forms on for a variant. Every variant starts with them off. */
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

/** Give Pinefall two forms without going through the editor. */
const giveTwoForms = async (world: World<CommunityItemsWorld>) => {
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
};

const editPage = (world: World<CommunityItemsWorld>) =>
  `${world.community.url}/character/${world.characters.pinefall.id}/edit`;

/** How many edit kits `member` is holding right now. */
const kitsHeld = async (world: World<CommunityItemsWorld>) => {
  const { memberHoldings } = await world
    .as("member")
    .gql(SeedMemberHoldingsDocument, {
      communityId: world.community.id,
      userId: world.users.member.userId,
    });
  return (
    memberHoldings.holdings.find(
      (h) => h.itemType.id === world.itemTypes.editKit.id,
    )?.count ?? 0
  );
};

/** A second signed-in browser context, for the other side of a review. */
async function pageAs(
  browser: Browser,
  storageState: string,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState });
  return { page: await context.newPage(), close: () => context.close() };
}

test.describe("staff editing a character's forms", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("the variant's limit is the on-switch, and the editor grows with it", async ({
    page,
    world,
  }) => {
    // Before: no form chrome at all. A community that does not use
    // transformations must not be shown the machinery for them.
    await page.goto(editPage(world));
    await expect(page.getByTestId("add-form")).toHaveCount(0);
    await expect(page.getByTestId("form-name-0")).toHaveCount(0);

    await page.goto(
      `${world.community.url}/variants/${world.variants.common.id}/manage`,
    );
    const limit = page.getByTestId("variant-max-forms");
    await expect(limit).toHaveValue("1");
    await limit.fill("2");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByRole("button", { name: "Save Changes" }),
    ).toHaveCount(0);

    // After: the name field and the Add button appear.
    await page.goto(editPage(world));
    await expect(page.getByTestId("form-name-0")).toBeVisible();
    await expect(page.getByTestId("add-form")).toBeEnabled();
  });

  test("adds, names and saves a second form, and it lands on the character page", async ({
    page,
    world,
  }) => {
    await allowForms(world, world.variants.common.id, 2);
    await page.goto(editPage(world));

    await page.getByTestId("add-form").click();
    await page.getByTestId("form-name-1").fill("Awakened");
    await page
      .getByTestId("form-editor-1")
      .getByRole("combobox")
      .first()
      .selectOption(world.traits.eyeColor.values.green);
    await page.getByTestId("save-species-details").click();

    await page.goto(world.characters.pinefall.url);
    const tabs = page.getByTestId("character-forms").getByRole("tab");
    await expect(tabs).toHaveText(["Base", "Awakened"]);

    // The switcher swaps the trait set rather than adding to it.
    await expect(page.getByTestId("trait-name")).toHaveCount(1);
    await tabs.nth(1).click();
    await expect(page.getByText("Green", { exact: true })).toBeVisible();
  });

  test("the Add button stops at the variant's limit", async ({
    page,
    world,
  }) => {
    await giveTwoForms(world);
    await page.goto(editPage(world));

    await expect(page.getByTestId("form-editor-1")).toBeVisible();
    await expect(page.getByTestId("add-form")).toBeDisabled();
    await expect(page.getByTestId("character-forms-editor")).toContainText(
      "This rarity allows 2 forms, which this character has",
    );
  });

  test("reorders them, and the character page follows", async ({
    page,
    world,
  }) => {
    await giveTwoForms(world);
    await page.goto(editPage(world));

    await page
      .getByTestId("form-editor-1")
      .getByRole("button", { name: "Move up" })
      .click();
    await expect(page.getByTestId("form-name-0")).toHaveValue("Awakened");
    await page.getByTestId("save-species-details").click();

    await page.goto(world.characters.pinefall.url);
    // Order decides the primary form, so it has to survive the save.
    await expect(
      page.getByTestId("character-forms").getByRole("tab"),
    ).toHaveText(["Awakened", "Base"]);
  });

  test("removes one, and refuses to remove the last", async ({
    page,
    world,
  }) => {
    await giveTwoForms(world);
    await page.goto(editPage(world));

    await page.getByTestId("remove-form-1").click();
    await expect(page.getByTestId("form-editor-1")).toHaveCount(0);
    // Removing the last is not "no traits", it is a character that cannot be
    // rendered.
    await expect(page.getByTestId("remove-form-0")).toBeDisabled();

    await page.getByTestId("save-species-details").click();
    await page.goto(world.characters.pinefall.url);
    await expect(page.getByTestId("character-forms")).toHaveCount(0);
  });

  test("re-routes a stranded value in each form before a rarity change saves", async ({
    page,
    world,
  }) => {
    // Legendary permits Amber alone, so a two-form character with Blue eyes in
    // both strands two values rather than one. Before forms this panel had one
    // row per character, so the second form's value would have gone through
    // unnoticed and been refused at save.
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
    // The destination has to allow two forms as well, or the count refusal
    // fires first -- which is what makes them separate checks.
    await allowForms(world, world.variants.legendary.id, 2);

    await page.goto(editPage(world));
    await page
      .getByTestId("variant-select")
      .selectOption(world.variants.legendary.id);

    const reroute = page.getByTestId("variant-reroute");
    await expect(reroute).toContainText("2 trait values do not exist");
    // Each row names its form, or two identical-looking rows cannot be told
    // apart.
    await expect(reroute).toContainText("Base");
    await expect(reroute).toContainText("Awakened");

    const save = page.getByTestId("save-species-details");
    await expect(save).toBeDisabled();

    const pickers = reroute.getByRole("combobox");
    await expect(pickers).toHaveCount(2);
    // A resolved row disappears, so the outstanding one is whatever is left.
    await pickers.first().selectOption(world.traits.eyeColor.values.amber);
    await expect(pickers).toHaveCount(1);
    await expect(save).toBeDisabled();

    await pickers.first().selectOption(world.traits.eyeColor.values.amber);
    await expect(reroute).toHaveCount(0);
    await expect(save).toBeEnabled();
  });

  test("removing the character from its species keeps every form's traits", async ({
    page,
    world,
  }) => {
    // The flatten writes each form's values into custom fields, keyed by form
    // name once there is more than one -- two forms routinely carry the same
    // traits at different values, which is the point of having two.
    await giveTwoForms(world);

    await page.goto(world.characters.pinefall.url);
    acceptNextDialog(page);
    await page
      .getByTestId("character-admin-actions")
      .getByRole("button", { name: "Remove from Species" })
      .click();

    const fields = page.getByRole("heading", { level: 3, name: "Fields" });
    await expect(fields).toBeVisible();
    const section = page.locator("section, div").filter({ has: fields }).last();
    await expect(section).toContainText("Base: Eye Color");
    await expect(section).toContainText("Blue");
    await expect(section).toContainText("Awakened: Eye Color");
    await expect(section).toContainText("Green");

    // The structured trait data and the switcher go together.
    await expect(page.getByTestId("character-forms")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 3, name: "Character Traits" }),
    ).toHaveCount(0);
  });

  test("says what to do when the limit has been lowered under the character", async ({
    page,
    world,
  }) => {
    await giveTwoForms(world);
    // Lowering trims nobody's character; it applies at the next write. Whoever
    // saves next has to remove one, and finds that out here rather than from a
    // refusal after pressing Save.
    await allowForms(world, world.variants.common.id, 1);

    await page.goto(editPage(world));
    await expect(page.getByTestId("form-editor-1")).toBeVisible();
    await expect(page.getByTestId("add-form")).toBeDisabled();
    await expect(page.getByTestId("character-forms-editor")).toContainText(
      "This rarity allows one form. Remove 1 before saving.",
    );
    await expect(page.getByTestId("remove-form-0")).toBeEnabled();
  });
});

test.describe("a member's routes to a second form", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("an edit kit proposes one, and nothing is applied until staff approve", async ({
    page,
    browser,
    world,
  }) => {
    await allowForms(world, world.variants.common.id, 2);

    await page.goto(
      `${world.community.url}/character/${world.characters.pinefall.id}/edit-traits?kit=${world.editKitItems.kitIds[0]}`,
    );
    await page.getByTestId("add-form").click();
    await page.getByTestId("form-name-1").fill("Awakened");
    await page.getByTestId("submit-edit-kit").click();
    await page.getByTestId("confirm-accept").click();

    // The member is not wearing an unapproved form while the queue catches up.
    await page.goto(world.characters.pinefall.url);
    await expect(page.getByTestId("character-forms")).toHaveCount(0);

    const staff = await pageAs(browser, world.storageState("commadmin"));
    try {
      await staff.page.goto(`${world.community.url}/moderation/traits`);
      const card = staff.page.getByTestId("trait-review-card").first();
      await expect(card.getByTestId("form-diff")).toBeVisible();
      // A reviewer can tell "a form was added" from "a form's traits changed",
      // which is the whole reason the diff is per form.
      await expect(card).toContainText("Awakened");
      await expect(card).toContainText("New form");

      await card.getByRole("button", { name: "Approve" }).click();
      await expect(card).toHaveCount(0);
    } finally {
      await staff.close();
    }

    await page.goto(world.characters.pinefall.url);
    await expect(
      page.getByTestId("character-forms").getByRole("tab"),
    ).toHaveText(["Base", "Awakened"]);
  });

  test("refusing the proposal leaves the character alone and hands the kit back", async ({
    page,
    browser,
    world,
  }) => {
    // The other half of the review. A refused form never existed, so there is
    // nothing to revert to -- the character must keep the form it already had
    // rather than losing it, and the member must get their kit back.
    await allowForms(world, world.variants.common.id, 2);
    const kitId = world.editKitItems.kitIds[0];
    const heldBefore = await kitsHeld(world);

    await page.goto(
      `${world.community.url}/character/${world.characters.pinefall.id}/edit-traits?kit=${kitId}`,
    );
    await page.getByTestId("add-form").click();
    await page.getByTestId("form-name-1").fill("Awakened");
    await page.getByTestId("submit-edit-kit").click();
    await page.getByTestId("confirm-accept").click();
    // Polled rather than read once: the click returns before the mutation has
    // settled, and a bare read here is a race that passes on a fast machine.
    await expect.poll(() => kitsHeld(world)).toBe(heldBefore - 1);

    const staff = await pageAs(browser, world.storageState("commadmin"));
    try {
      await staff.page.goto(`${world.community.url}/moderation/traits`);
      const card = staff.page.getByTestId("trait-review-card").first();
      await expect(card).toContainText("New form");

      // Called Refuse rather than Revert on a redemption, because it reverts
      // nothing -- the proposal was never applied.
      await card.getByRole("button", { name: "Refuse" }).click();
      const modal = staff.page.getByTestId("revert-modal");
      await expect(staff.page.getByTestId("revert-confirm")).toBeDisabled();
      await modal.getByTestId("revert-reason").fill("Not this one");
      await staff.page.getByTestId("revert-confirm").click();
      await expect(card).toHaveCount(0);
    } finally {
      await staff.close();
    }

    await page.goto(world.characters.pinefall.url);
    await expect(page.getByTestId("character-forms")).toHaveCount(0);
    await expect(page.getByTestId("trait-name")).toHaveCount(1);
    // Refusing an edit kit mints a replacement, so the member is whole again.
    await expect.poll(() => kitsHeld(world)).toBe(heldBefore);
  });

  test("an MYO ticket makes a two-form character", async ({ page, world }) => {
    // The other way a character comes into being with forms, and the one where
    // a mistake costs the member an item they paid for.
    await allowForms(world, world.variants.uncommon.id, 2);
    const itemId = world.myoItems.ticketIds[0];

    await page.goto(`${world.community.url}/character/create?ticket=${itemId}`);
    await page.getByTestId(`myo-variant-${world.variants.uncommon.id}`).click();
    await page.locator("#name").fill("Pagebound");
    await page.getByTestId("add-form").click();
    await page.getByTestId("form-name-1").fill("Awakened");
    await page.getByTestId("submit-character").click();
    await page.getByTestId("confirm-accept").click();

    await expect(page).toHaveURL(/\/character\/[0-9a-f-]{36}$/);
    await expect(
      page.getByTestId("character-forms").getByRole("tab"),
    ).toHaveText(["Base", "Awakened"]);
  });

  test("a stranded value is re-picked per form, and each row says which form", async ({
    page,
    world,
  }) => {
    // Legendary permits Amber alone, so a two-form character with Blue eyes in
    // both strands two values rather than one. Before forms this panel had one
    // row per character; getting it wrong would leave the second form holding
    // a value its own editor cannot offer.
    await giveTwoForms(world);
    await world.as("commadmin").gql(SeedUpdateCharacterRegistryDocument, {
      id: world.characters.pinefall.id,
      input: {
        forms: [
          { name: "Base", traitValues: eyes(world, "blue") },
          { name: "Awakened", traitValues: eyes(world, "blue") },
        ],
      },
    });
    // The destination has to allow two forms as well, or the count refusal
    // fires first -- which is the point of them being separate checks.
    await allowForms(world, world.variants.legendary.id, 2);

    await page.goto(
      `${world.community.url}/character/${world.characters.pinefall.id}/change-variant?item=${world.variantChangeItems.ascensionIds[0]}`,
    );

    const reroute = page.getByTestId("variant-change-reroute");
    await expect(reroute).toBeVisible();
    await expect(reroute).toContainText("2 trait values do not exist");
    // Which form each stranded value belongs to, or a member cannot tell the
    // two identical-looking rows apart.
    await expect(reroute).toContainText("Base");
    await expect(reroute).toContainText("Awakened");

    const submit = page.getByTestId("submit-variant-change");
    await expect(submit).toBeDisabled();

    const pickers = reroute.getByRole("combobox");
    await expect(pickers).toHaveCount(2);

    // Re-picking one leaves the other outstanding: a resolved row disappears,
    // so the remaining one is whatever is left at index 0.
    await pickers.first().selectOption(world.traits.eyeColor.values.amber);
    await expect(pickers).toHaveCount(1);
    await expect(submit).toBeDisabled();

    await pickers.first().selectOption(world.traits.eyeColor.values.amber);
    await expect(reroute).toHaveCount(0);
    await expect(submit).toBeEnabled();

    // Go through with it: the whole point is that a two-form character can
    // actually move, not merely that the form is fillable.
    await submit.click();
    await page.getByTestId("confirm-accept").click();
    // The redemption lands the member back on the character. Waiting for that
    // is what separates reading the result from racing it.
    await expect(page).toHaveURL(
      new RegExp(`${world.characters.pinefall.id}$`),
    );

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(character.speciesVariantId).toBe(world.variants.legendary.id);
    expect(character.forms.map((f) => f.name)).toEqual(["Base", "Awakened"]);
    // Both forms re-routed, not just the primary one.
    for (const form of character.forms) {
      expect(form.traitValues[0].value).toBe(
        world.traits.eyeColor.values.amber,
      );
    }
    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: world.variantChangeItems.ascensionIds[0] });
    expect(item.destroyedAt).not.toBeNull();
  });

  test("a rarity item is blocked before it is spent when the destination allows fewer forms", async ({
    page,
    world,
  }) => {
    // Unlike a stranded trait value there is nothing to re-pick: which form a
    // character keeps is a design decision. The refusal has to arrive before
    // the item is destroyed, because there is no un-redeem.
    await giveTwoForms(world);
    const itemId = world.variantChangeItems.rareUpgradeIds[0];

    await page.goto(
      `${world.community.url}/character/${world.characters.pinefall.id}/change-variant?item=${itemId}`,
    );

    await expect(
      page.getByTestId("variant-change-too-many-forms"),
    ).toBeVisible();
    await expect(page.getByTestId("submit-variant-change")).toBeDisabled();

    const { item } = await world
      .as("member")
      .gql(SeedItemDocument, { id: itemId });
    expect(item.destroyedAt).toBeNull();
  });
});
