import { presetTest, expect, openMenuItem } from "../../src/fixtures.js";

const test = presetTest("community-basic");
test.use({ persona: "member" });

// Destructive: the character changes hands.
test.beforeEach(async ({ world }) => {
  await world.reset();
});

test("an owner gives their character to the community", async ({
  page,
  world,
}) => {
  const character = world.characters.gallery;
  await page.goto(character.url);

  await (
    await openMenuItem(page, "character-actions-menu", "Give to Community")
  ).click();
  const dialog = page.getByTestId("give-to-community-dialog");
  await expect(dialog).toContainText("Willowmere");
  await dialog.getByTestId("confirm-phrase").fill(character.name);
  await dialog.getByTestId("confirm-accept").click();

  await expect(
    page.getByText(`"${character.name}" now belongs to Willowmere`),
  ).toBeVisible();
  await expect(page.getByText("Community Character (No Owner)")).toBeVisible();
  await expect(page.getByTestId("character-owner")).toHaveCount(0);
  await expect(page.getByTestId("character-actions")).toHaveCount(0);
});

test("cancelling leaves the character with its owner", async ({
  page,
  world,
}) => {
  const character = world.characters.gallery;
  await page.goto(character.url);

  await (
    await openMenuItem(page, "character-actions-menu", "Give to Community")
  ).click();
  await page
    .getByTestId("give-to-community-dialog")
    .getByTestId("confirm-cancel")
    .click();

  await expect(page.getByTestId("give-to-community-dialog")).toHaveCount(0);
  await expect(page.getByTestId("character-owner")).toHaveText("member");
});
