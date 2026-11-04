import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedCreateCommunityColorDocument,
  SeedUpdateEnumValueDocument,
  SeedUpdateSpeciesVariantDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

const RARE_HEX = "#7c3aed";
const AMBER_HEX = "#f59e0b";

/**
 * Staff arrange a species' variants and a trait's options, and the character
 * form follows that order, each one showing its colour. Before, variants came
 * newest first with no colour, and a trait's up/down buttons sent a fractional
 * position the server refused.
 */
test.describe("variant and trait option order, with colours", () => {
  test.use({ persona: "commadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
    const admin = world.as("commadmin");
    const colour = async (name: string, hexCode: string) => {
      const { createCommunityColor } = await admin.gql(
        SeedCreateCommunityColorDocument,
        { input: { communityId: world.community.id, name, hexCode } },
      );
      return createCommunityColor.id;
    };
    await admin.gql(SeedUpdateSpeciesVariantDocument, {
      id: world.variants.rare.id,
      updateSpeciesVariantInput: { colorId: await colour("Violet", RARE_HEX) },
    });
    await admin.gql(SeedUpdateEnumValueDocument, {
      id: world.traits.eyeColor.values.amber,
      updateEnumValueInput: { colorId: await colour("Amber", AMBER_HEX) },
    });
  });

  test("staff move a variant, and it stays moved", async ({ page, world }) => {
    await page.goto(
      `${world.community.url}/species/${world.species.id}/variants`,
    );
    const list = page.getByRole("list", {
      name: `${world.species.name} variants`,
    });
    const rows = list.getByRole("listitem");
    await expect(rows).toHaveText([/Common/, /Uncommon/, /Rare/, /Legendary/]);
    await expect(
      rows.nth(2).locator(`[data-color="${RARE_HEX}"]`),
    ).toBeVisible();

    await page.getByRole("button", { name: "Move Legendary up" }).click();
    await expect(rows).toHaveText([/Common/, /Uncommon/, /Legendary/, /Rare/]);

    await page.reload();
    await expect(rows).toHaveText([/Common/, /Uncommon/, /Legendary/, /Rare/]);
  });

  test("staff move a trait option, and it stays moved", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/traits/${world.traits.eyeColor.id}/enum-values`,
    );
    const rows = page
      .getByRole("list", { name: "Eye Color options" })
      .getByRole("listitem");
    await expect(rows).toHaveText([/Blue/, /Green/, /Amber/]);

    await page.getByRole("button", { name: "Move Amber up" }).click();
    await page.getByRole("button", { name: "Move Amber up" }).click();
    await expect(rows).toHaveText([/Amber/, /Blue/, /Green/]);

    await page.reload();
    await expect(rows).toHaveText([/Amber/, /Blue/, /Green/]);
  });

  test("the character form lists variants and options in order, coloured", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/character/create`);
    await page.getByText(world.species.name, { exact: true }).first().click();

    const variantCards = page.getByRole("heading", { level: 4 }).filter({
      hasText: /^(Common|Uncommon|Rare|Legendary)$/,
    });
    await expect(variantCards).toHaveText([
      "Common",
      "Uncommon",
      "Rare",
      "Legendary",
    ]);

    await page.getByText("Rare", { exact: true }).click();
    // The chosen variant keeps its colour in the summary under the cards.
    await expect(
      page
        .getByRole("heading", { name: "Selected Variant" })
        .locator("..")
        .locator(`[data-color="${RARE_HEX}"]`),
    ).toBeVisible();

    const eyes = page.getByRole("combobox", { name: /Eye Color/ });
    await eyes.click();
    const options = page.getByRole("listbox").getByRole("option");
    await expect(options).toHaveText([/Select/, "Blue", "Green", "Amber"]);
    await expect(
      options
        .filter({ hasText: "Amber" })
        .locator(`[data-color="${AMBER_HEX}"]`),
    ).toBeVisible();

    await options.filter({ hasText: "Amber" }).click();
    await expect(eyes).toHaveText("Amber");
    await expect(eyes.locator(`[data-color="${AMBER_HEX}"]`)).toBeVisible();
  });
});
