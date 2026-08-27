import { test, expect, acceptNextDialog } from "../../src/fixtures.js";
import { SeedCharacterDocument } from "../../src/generated/graphql.js";

test.use({ preset: "community-basic", persona: "moderator" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

const removeFromSpecies = async (
  page: import("@playwright/test").Page,
): Promise<void> => {
  acceptNextDialog(page);
  await page
    .getByTestId("character-admin-actions")
    .getByRole("button", { name: "Remove from Species" })
    .click();
  // handleKickFromSpecies calls navigate(0), a full reload. Asserting on
  // content waits through it.
  await expect(
    page.getByRole("heading", { level: 3, name: "Fields" }),
  ).toBeVisible();
};

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

  await removeFromSpecies(page);

  // flattenTraitValues keys the custom field by TRAIT NAME and stores the
  // ENUM's DISPLAY NAME, not its id -- this is what proves the flatten
  // preserved meaning rather than leaking a UUID.
  const fields = page.getByRole("heading", { level: 3, name: "Fields" });
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

  await removeFromSpecies(page);

  await expect(page.getByText("Traits Pending Review")).toHaveCount(0);

  const { character: after } = await world
    .as("moderator")
    .gql(SeedCharacterDocument, { id: character.id });
  expect(after.traitReviewStatus).toBeNull();
});

test("serves the flattened shape through the API", async ({ page, world }) => {
  const character = world.characters.pending;
  await page.goto(character.url);

  await removeFromSpecies(page);

  // Read back through the same query the app uses, rather than the database:
  // this proves the API actually serves the flattened state, which is what any
  // other client would see.
  const { character: after } = await world
    .as("moderator")
    .gql(SeedCharacterDocument, { id: character.id });

  expect(after.speciesId).toBeNull();
  expect(after.speciesVariantId).toBeNull();
  expect(after.species).toBeNull();
  expect(after.traitValues).toEqual([]);
  expect(JSON.parse(after.customFields ?? "{}")).toMatchObject({
    "Eye Color": "Blue",
  });
});
