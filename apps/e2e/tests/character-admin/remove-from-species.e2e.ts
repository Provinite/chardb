import { test, expect, acceptNextDialog } from "../../src/fixtures.js";
import { withClient } from "../../src/db/sql.js";
import { CFG } from "../../src/config.js";

test.use({ preset: "community-basic", persona: "moderator" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

test("preserves trait values as custom fields", async ({ page, world }) => {
  // `pending` has Eye Color = Blue, seeded by enum NAME so that
  // flattenTraitValues resolves it to the display name on the way out.
  const character = world.characters.pending;
  await page.goto(character.url);

  await expect(
    page.getByRole("heading", { level: 3, name: "Character Traits" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Fields" }),
  ).toHaveCount(0);

  acceptNextDialog(page, (message) => {
    expect(message).toContain(character.name);
    expect(message).toContain(world.species.name);
  });
  await page
    .getByTestId("character-admin-actions")
    .getByRole("button", { name: "Remove from Species" })
    .click();

  // handleKickFromSpecies calls navigate(0), a full reload. Asserting on
  // content waits through it.
  const fields = page.getByRole("heading", { level: 3, name: "Fields" });
  await expect(fields).toBeVisible();

  // flattenTraitValues keys the custom field by TRAIT NAME and stores the
  // ENUM's DISPLAY NAME, not its id -- this is the assertion that the
  // flatten actually preserved meaning rather than leaking a UUID.
  const section = page.locator("section, div").filter({ has: fields }).last();
  await expect(section).toContainText("Eye Color");
  await expect(section).toContainText("Blue");

  // The structured trait data is gone, and so is the species.
  await expect(
    page.getByRole("heading", { level: 3, name: "Character Traits" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: world.species.name }),
  ).toHaveCount(0);
});

test("cancels the pending trait review", async ({ page, world }) => {
  const character = world.characters.pending;
  await page.goto(character.url);
  await expect(page.getByText("Traits Pending Review")).toBeVisible();

  acceptNextDialog(page);
  await page
    .getByTestId("character-admin-actions")
    .getByRole("button", { name: "Remove from Species" })
    .click();
  await expect(
    page.getByRole("heading", { level: 3, name: "Fields" }),
  ).toBeVisible();

  await expect(page.getByText("Traits Pending Review")).toHaveCount(0);

  await withClient(CFG.databaseUrl, async (client) => {
    const { rows } = await client.query(
      `SELECT status FROM trait_reviews WHERE character_id = $1`,
      [character.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("CANCELLED");
  });
});

test("persists the flattened shape", async ({ page, world }) => {
  const character = world.characters.pending;
  await page.goto(character.url);

  acceptNextDialog(page);
  await page
    .getByTestId("character-admin-actions")
    .getByRole("button", { name: "Remove from Species" })
    .click();
  await expect(
    page.getByRole("heading", { level: 3, name: "Fields" }),
  ).toBeVisible();

  await withClient(CFG.databaseUrl, async (client) => {
    const { rows } = await client.query(
      `SELECT species_id, species_variant_id, trait_values, custom_fields
       FROM characters WHERE id = $1`,
      [character.id],
    );
    expect(rows[0].species_id).toBeNull();
    expect(rows[0].species_variant_id).toBeNull();
    expect(rows[0].trait_values).toEqual([]);
    expect(rows[0].custom_fields).toMatchObject({ "Eye Color": "Blue" });
  });
});
